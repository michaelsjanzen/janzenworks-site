import type { ActionCatalogue, FilterCatalogue } from "./hook-catalogue";

/**
 * Pugmill HookManager
 * ============================================================
 * A type-safe action/filter system. Hook names and payload
 * shapes are enforced by the ActionCatalogue and FilterCatalogue
 * interfaces in hook-catalogue.ts.
 *
 * ACTIONS — fire-and-forget side effects.
 *   hooks.addAction("post:after-save", ({ post }) => { ... });
 *   await hooks.doAction("post:after-save", { post });
 *
 * STRICT ACTIONS — rejection hooks where a thrown error is intentional.
 *   Use doActionStrict() for hooks like "comment:before-create" where
 *   a plugin can throw to reject the operation. Errors propagate to the caller.
 *   await hooks.doActionStrict("comment:before-create", { comment });
 *
 * FILTERS — ordered data transformation pipeline.
 *   hooks.addFilter("content:render", ({ input }) => input + "...");
 *   const html = await hooks.applyFilters("content:render", { input: raw, post });
 *
 * PLUGIN ERROR NOTIFICATIONS
 *   Unexpected listener errors in doAction() and applyFilters() are reported to
 *   admins via the notification system. Set the error handler once at startup:
 *   hooks.setErrorHandler(({ hook, error }) => { ... });
 *
 * Full hook reference: src/lib/hook-catalogue.ts
 * ============================================================
 */

// Helper: extract the `input` type from a filter payload
type FilterInput<P> = P extends { input: infer I } ? I : never;

export interface HookErrorContext {
  hook: string;
  error: Error;
}

export class HookManager<
  AC = ActionCatalogue,
  FC = FilterCatalogue,
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private actions = new Map<keyof AC, ((payload: any) => void | Promise<void>)[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private filters = new Map<keyof FC, ((payload: any) => any)[]>();

  /** Optional handler called whenever a hook listener throws unexpectedly. */
  private errorHandler?: (ctx: HookErrorContext) => void;

  /**
   * Register a handler to be called when a hook listener throws unexpectedly.
   * Intended for surfacing plugin errors to admins via the notification system.
   * Set this once at startup in plugin-loader.ts.
   */
  setErrorHandler(handler: (ctx: HookErrorContext) => void): void {
    this.errorHandler = handler;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Register a callback for an action hook. */
  addAction<K extends keyof AC>(
    name: K,
    fn: (payload: AC[K]) => void | Promise<void>
  ): void {
    const existing = this.actions.get(name) ?? [];
    this.actions.set(name, [...existing, fn]);
  }

  /**
   * Execute all callbacks registered for an action.
   * Unexpected errors are caught, logged to console, and reported via the
   * error handler (which creates an admin notification).
   * Use this for fire-and-forget side effects where errors should not abort the operation.
   */
  async doAction<K extends keyof AC>(name: K, payload: AC[K]): Promise<void> {
    if (!_pluginsLoaded) {
      console.warn(
        `[HookManager] "${String(name)}" fired before loadPlugins() completed — ` +
        `plugin listeners may not be registered. ` +
        `Add "await loadPlugins()" before this hook call in any server action that uses hooks.`
      );
    }
    const fns = this.actions.get(name) ?? [];
    for (const fn of fns) {
      try {
        await fn(payload);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`[HookManager] Error in action "${String(name)}":`, error);
        this.errorHandler?.({ hook: String(name), error });
      }
    }
  }

  /**
   * Execute all callbacks for a rejection hook — errors propagate to the caller.
   * Use this for hooks where a plugin is expected to throw to reject an operation
   * (e.g. "comment:before-create" for spam detection).
   * The first listener to throw aborts the remaining listeners.
   */
  async doActionStrict<K extends keyof AC>(name: K, payload: AC[K]): Promise<void> {
    if (!_pluginsLoaded) {
      console.warn(
        `[HookManager] "${String(name)}" fired before loadPlugins() completed — ` +
        `plugin listeners may not be registered. ` +
        `Add "await loadPlugins()" before this hook call in any server action that uses hooks.`
      );
    }
    const fns = this.actions.get(name) ?? [];
    for (const fn of fns) {
      await fn(payload);
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  /**
   * Register a callback for a filter hook.
   * The callback receives the full payload and must return a value of the
   * same type as payload.input.
   */
  addFilter<K extends keyof FC>(
    name: K,
    fn: (payload: FC[K]) => FilterInput<FC[K]> | Promise<FilterInput<FC[K]>>
  ): void {
    const existing = this.filters.get(name) ?? [];
    this.filters.set(name, [...existing, fn]);
  }

  /**
   * Pass payload through all registered filter callbacks.
   * Returns the final transformed value of payload.input.
   * A broken filter is skipped (previous value is preserved) and its error is
   * reported via the error handler so the admin is notified.
   */
  async applyFilters<K extends keyof FC>(
    name: K,
    payload: FC[K]
  ): Promise<FilterInput<FC[K]>> {
    if (!_pluginsLoaded) {
      console.warn(
        `[HookManager] "${String(name)}" fired before loadPlugins() completed — ` +
        `plugin listeners may not be registered. ` +
        `Add "await loadPlugins()" before this hook call in any server action that uses hooks.`
      );
    }
    const fns = this.filters.get(name) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: FilterInput<FC[K]> = (payload as any).input;
    for (const fn of fns) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value = await fn({ ...(payload as any), input: value });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`[HookManager] Error in filter "${String(name)}":`, error);
        this.errorHandler?.({ hook: String(name), error });
      }
    }
    return value;
  }

  // ── Debug ─────────────────────────────────────────────────────────────────

  /** Returns names of all registered action hooks. */
  getRegisteredActions(): string[] {
    return Array.from(this.actions.keys()).map(String);
  }

  /** Returns names of all registered filter hooks. */
  getRegisteredFilters(): string[] {
    return Array.from(this.filters.keys()).map(String);
  }
}

// Typed singleton — shared across the entire application.
// Plugins receive this instance in their initialize() call.
export const hooks = new HookManager<ActionCatalogue, FilterCatalogue>();

/**
 * Module-level flag set by plugin-loader.ts once initializePlugins() completes.
 * Used by doAction/applyFilters to warn when hooks fire before plugins are ready.
 * Never call this from application code — only plugin-loader.ts should call it.
 */
let _pluginsLoaded = false;

export function markPluginsLoaded(): void {
  _pluginsLoaded = true;
}

export function arePluginsLoaded(): boolean {
  return _pluginsLoaded;
}
