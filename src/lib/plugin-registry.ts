// PUGMILL_REGISTRY: Plugin Installation Contract
// ============================================================
// This file is the single source of truth for all installed plugins.
// Plugins are distributed via the pugmill.dev marketplace registry.
// The recommended install method is: npx pugmill add plugin <name>
// AI agents may also install plugins manually by following these steps exactly:
//
// STEP 1 — Create the plugin directory and files:
//   - /plugins/<plugin-id>/index.ts   (must export a named const implementing PugmillPlugin)
//   - /plugins/<plugin-id>/manifest.json  (id, name, version, description)
//
// STEP 2 — Add a static import below (required by Next.js/Turbopack — dynamic require() is not supported):
//   import { myPlugin } from "../../plugins/<plugin-id>/index";
//
// STEP 3 — Add the imported plugin to the ALL_PLUGINS array below.
//   ALL_PLUGINS is the live registry. Only plugins in this array are loaded.
//
// STEP 4 — If the plugin should be active by default, add its id to
//   config.modules.activePlugins via the admin UI or by updating pugmill.config.json.
//
// DO NOT use dynamic import() or require() — Next.js/Turbopack requires all
// plugin modules to be statically known at build time.
//
// Plugin authoring rules (enforced by convention, checked by AI agents):
//   - Hook names MUST come from ActionCatalogue / FilterCatalogue in hook-catalogue.ts
//   - Plugin-owned DB tables MUST be named: plugin_<id>_<tablename>
//   - Plugin DB tables MUST NOT declare foreign key constraints to core tables
//     (reference core rows by integer value only — e.g. store post_id as plain integer)
//   - Plugin-to-plugin imports are FORBIDDEN; use shared hooks for inter-plugin communication
//   - Shared utilities belong in npm packages, not in other plugins
//   - To provide widgets, declare them in the `widgets: WidgetDef[]` array on your plugin
//     object — do NOT call registerWidget() directly. Widgets are registered automatically
//     after initialize() succeeds so the registry stays consistent with activePlugins.
//
// Registry reference: https://registry.pugmill.dev/plugins
// Plugin authoring guide: https://pugmill.dev/docs/plugins
// ============================================================

import type { ActionCatalogue, FilterCatalogue } from "./hook-catalogue";
import { hooks } from "./hooks";
import type { HookManager } from "./hooks";
import type { WidgetDef } from "@/types/widget";
import { registerWidget } from "./widget-registry";
import { createNotification } from "./notifications";

/** The typed HookManager used by all plugins. */
export type PluginHookManager = HookManager<ActionCatalogue, FilterCatalogue>;

// ─── Settings ────────────────────────────────────────────────────────────────

export type PluginSettingValue = string | boolean;
export type PluginSettings = Record<string, PluginSettingValue>;

export interface PluginSettingDef {
  key: string;
  label: string;
  type: "text" | "boolean" | "select";
  default: PluginSettingValue;
  options?: string[];
  description?: string;
  /** Mask value in admin UI and never include in logs or API responses. Use for API keys, secrets. */
  secret?: boolean;
  /** Prevent the settings form from saving if this field is empty. */
  required?: boolean;
}

// ─── Frontend slots ───────────────────────────────────────────────────────────
// Plugins register React components into named slots. The core renders these
// at the appropriate place in the page without the theme needing to know about
// specific plugins.

export interface PostFooterSlotProps {
  /** The integer ID of the current post. */
  postId: number;
  /** The slug of the current post (for linking). */
  postSlug: string;
}

export interface SiteBannerSlotProps {
  /**
   * The resolved settings for this plugin (defaults merged with saved values).
   * Passed from the server layout so the client component can read banner text,
   * labels, privacy URL, and cookie duration without a separate fetch.
   */
  settings: PluginSettings;
}

export interface PluginSlots {
  /**
   * Rendered below post content on blog-post-type pages.
   * Receives the post ID and slug.
   * May be a server component (do not add "use client" unless interactivity is needed).
   */
  postFooter?: React.ComponentType<PostFooterSlotProps>;

  /**
   * Rendered on every page, appended after the theme layout.
   * Intended for full-width banners that must appear on every page (e.g. cookie consent).
   * Receives resolved plugin settings so components don't need their own data fetch.
   * Typically a client component when user interaction is required.
   */
  siteBanner?: React.ComponentType<SiteBannerSlotProps>;
}

// ─── Plugin-owned schema ──────────────────────────────────────────────────────

export interface PluginSchema {
  /**
   * Create or migrate all plugin-owned database tables.
   * Called automatically on plugin activation (runs on every startup — must be idempotent).
   * Tables MUST be named plugin_<plugin-id>_<tablename>.
   * Do NOT declare REFERENCES / FK constraints to core tables.
   */
  migrate: () => Promise<void>;
  /**
   * Drop all plugin-owned tables.
   * Called on plugin uninstall. Optional — omit to preserve data after uninstall.
   */
  teardown?: () => Promise<void>;
}

// ─── Plugin interface ─────────────────────────────────────────────────────────

export interface PugmillPlugin {
  /** Unique plugin identifier. Must match the directory name under /plugins/. */
  id: string;
  name: string;
  version: string;
  description?: string;
  settingsDefs?: PluginSettingDef[];

  /**
   * Register hook listeners and perform any startup work.
   * Called once at app startup for each active plugin.
   * Only plugins listed in config.modules.activePlugins are initialized.
   *
   * Hook names are type-checked against ActionCatalogue and FilterCatalogue.
   * Only hooks defined in hook-catalogue.ts may be used.
   */
  initialize: (hooks: PluginHookManager, settings: PluginSettings) => void | Promise<void>;

  /**
   * Tear down any resources (timers, connections) created in initialize().
   * Called on clean server shutdown (SIGTERM/SIGINT). NOT called on plugin
   * deactivation — deactivation takes effect on the next cold start, at which
   * point the plugin will not be initialized. Safe to omit if initialize()
   * registers only hook listeners (listeners do not need explicit cleanup).
   */
  destroy?: () => void | Promise<void>;

  /**
   * Optional custom admin page rendered at /admin/plugins/<id>.
   * Use this when the plugin needs to display or manage data (e.g. comment moderation,
   * analytics, import/export). For plugins that only need key-value configuration,
   * omit this — settingsDefs renders an inline settings panel on the plugin card instead.
   * Self-contained server component — handles its own data fetching and server actions.
   * Receives Next.js searchParams for filter/pagination support.
   */
  adminPage?: React.ComponentType<{ searchParams: Record<string, string | string[] | undefined> }>;

  /**
   * Link to the plugin's primary action/queue page in the admin.
   * When set, this plugin appears as a sub-section under Notifications in the sidebar.
   * Example: "/admin/comments" for the comments moderation queue.
   * This is separate from /admin/plugins/<id> which is always the settings page.
   */
  actionHref?: string;

  /**
   * Frontend UI slots. Plugins register React components into named positions
   * in the theme without the theme needing to import the plugin directly.
   * See PluginSlots for available positions.
   */
  slots?: PluginSlots;

  /**
   * Plugin-owned database schema. Provide this if the plugin needs its own tables.
   * migrate() is called idempotently on every startup; teardown() on uninstall.
   */
  schema?: PluginSchema;

  /**
   * Widget definitions provided by this plugin.
   * Registered automatically when the plugin is activated — no manual registerWidget() calls needed.
   * See WidgetDef in @/types/widget for the full contract.
   */
  widgets?: WidgetDef[];
}

// ─── Static registry ──────────────────────────────────────────────────────────
// Add new plugins here when created. Static imports are required by Next.js/Turbopack.

import { commentsPlugin } from "../../plugins/comments/index";
import { cookieConsentPlugin } from "../../plugins/cookie-consent/index";
import { contactFormPlugin } from "../../plugins/contact-form/index";
import { defaultWidgetsPlugin } from "../../plugins/default-widgets/index";
import { botAnalyticsPlugin } from "../../plugins/bot-analytics/index";
import { outboundWebhooksPlugin } from "../../plugins/outbound-webhooks/index";
import { newsletterPlugin } from "../../plugins/newsletter/index";
import { mcpServerPlugin } from "../../plugins/mcp-server/index";

const ALL_PLUGINS: PugmillPlugin[] = [
  commentsPlugin,
  contactFormPlugin,
  cookieConsentPlugin,
  defaultWidgetsPlugin,
  botAnalyticsPlugin,
  outboundWebhooksPlugin,
  newsletterPlugin,
  mcpServerPlugin,
];

let initPromise: Promise<void> | null = null;
const activePlugins: PugmillPlugin[] = [];

// ─── Internal helpers ─────────────────────────────────────────────────────────

function resolveSettings(defs: PluginSettingDef[] = [], saved: PluginSettings = {}): PluginSettings {
  const result: PluginSettings = {};
  for (const def of defs) {
    result[def.key] = def.key in saved ? saved[def.key] : def.default;
  }
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize all active plugins based on the DB-backed config.
 * Must be called once at app startup via loadPlugins().
 * Concurrent callers await the same Promise — no caller proceeds until all
 * plugins are initialized and all widgets are registered.
 */
export async function initializePlugins(
  activePluginIds: string[],
  pluginSettings: Record<string, PluginSettings> = {}
): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = _initializePlugins(activePluginIds, pluginSettings);
  return initPromise;
}

async function _initializePlugins(
  activePluginIds: string[],
  pluginSettings: Record<string, PluginSettings>
): Promise<void> {
  for (const plugin of ALL_PLUGINS) {
    if (activePluginIds.includes(plugin.id)) {
      try {
        // Run schema migration before initialize (idempotent — uses IF NOT EXISTS)
        if (plugin.schema?.migrate) {
          await plugin.schema.migrate();
        }
        const settings = resolveSettings(plugin.settingsDefs, pluginSettings[plugin.id]);
        await plugin.initialize(hooks, settings);
        // Register widgets after initialize() succeeds — keeps registry consistent
        // with activePlugins (widgets from a failed plugin are never exposed).
        if (plugin.widgets) {
          for (const widget of plugin.widgets) {
            registerWidget(widget);
          }
        }
        activePlugins.push(plugin);
        console.log(`[PluginRegistry] Loaded plugin: ${plugin.name} v${plugin.version}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[PluginRegistry] Failed to load plugin "${plugin.id}":`, err);
        createNotification({
          pluginId: "core",
          type: "error",
          message: `Plugin "${plugin.id}" failed to initialize: ${message}`,
          href: "/admin/plugins",
          replaceKey: `plugin:init:error:${plugin.id}`,
        }).catch((notifyErr) => {
          console.error("[PluginRegistry] Failed to create error notification:", notifyErr);
        });
      }
    }
  }
}

/**
 * Call destroy() on every successfully initialized plugin.
 * Invoked by plugin-loader.ts on SIGTERM/SIGINT for clean process shutdown.
 * Errors in individual destroy() calls are logged but do not abort the rest.
 */
export async function destroyPlugins(): Promise<void> {
  for (const plugin of activePlugins) {
    if (plugin.destroy) {
      try {
        await plugin.destroy();
      } catch (err) {
        console.error(`[PluginRegistry] destroy() failed for "${plugin.id}":`, err);
      }
    }
  }
}

/**
 * Returns all installed plugins with their active status and current settings.
 * Used by the Admin plugins page.
 */
export function getAllPlugins(
  activePluginIds: string[],
  pluginSettings: Record<string, PluginSettings> = {}
) {
  return ALL_PLUGINS.map((p) => ({
    id: p.id,
    name: p.name,
    version: p.version,
    description: p.description ?? "",
    settingsDefs: p.settingsDefs ?? [],
    isActive: activePluginIds.includes(p.id),
    settings: resolveSettings(p.settingsDefs, pluginSettings[p.id]),
    hasAdminPage: !!p.adminPage,
    actionHref: p.actionHref,
  }));
}

/**
 * Returns a single installed plugin by id, or undefined if not found.
 * Used by the plugin admin page route.
 */
export function getPlugin(id: string): PugmillPlugin | undefined {
  return ALL_PLUGINS.find((p) => p.id === id);
}

/**
 * Returns the components registered for a given frontend slot across all active plugins,
 * with settings fully resolved (defaults merged with saved values).
 * Used by page routes to render plugin UI at the appropriate location.
 *
 * @example
 * const postFooters = getActiveSlots("postFooter", config.modules.activePlugins, config.modules.pluginSettings);
 * // In JSX:
 * {postFooters.map(({ pluginId, Component }) => (
 *   <Component key={pluginId} postId={post.id} postSlug={post.slug} />
 * ))}
 */
export function getActiveSlots<K extends keyof PluginSlots>(
  slot: K,
  activePluginIds: string[],
  pluginSettings: Record<string, PluginSettings> = {}
): { pluginId: string; Component: NonNullable<PluginSlots[K]>; settings: PluginSettings }[] {
  const results: { pluginId: string; Component: NonNullable<PluginSlots[K]>; settings: PluginSettings }[] = [];
  for (const plugin of ALL_PLUGINS) {
    if (activePluginIds.includes(plugin.id) && plugin.slots?.[slot]) {
      results.push({
        pluginId: plugin.id,
        Component: plugin.slots[slot] as NonNullable<PluginSlots[K]>,
        settings: resolveSettings(plugin.settingsDefs, pluginSettings[plugin.id]),
      });
    }
  }
  return results;
}
