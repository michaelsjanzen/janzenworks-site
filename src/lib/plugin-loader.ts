import { getConfig } from "./config";
import { initializePlugins, destroyPlugins } from "./plugin-registry";
import { ensureCoreNotificationsSchema, createNotification } from "./notifications";
import { ensureAuditLogSchema } from "./audit-log";
import { ensureWidgetSettingsSchema } from "./widget-schema";
import { validateSystem } from "./validate-system";
import { hooks, markPluginsLoaded } from "./hooks";

let loadPromise: Promise<void> | null = null;

/**
 * Load and initialize all active plugins.
 * Called once at app startup from the site layout.
 * Plugin activation and settings are controlled by the DB-backed config.
 *
 * Concurrent callers (layout + page rendering in parallel) all await the same
 * Promise so none of them proceed past this point until initialization is fully
 * complete — including widget registration.
 */
export async function loadPlugins(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = _load();
  return loadPromise;
}

async function _load(): Promise<void> {
  // Validate critical system invariants before initializing plugins.
  // Runs once per cold start.
  validateSystem();

  // Surface unexpected hook listener errors to the admin notification feed.
  // Uses replaceKey per hook name so repeated failures update one notification
  // rather than flooding the feed.
  hooks.setErrorHandler(({ hook, error }) => {
    createNotification({
      pluginId: "core",
      type: "error",
      message: `Plugin error in hook "${hook}": ${error.message}`,
      href: "/admin/plugins",
      replaceKey: `hook:error:${hook}`,
    }).catch((notifyErr) => {
      console.error("[HookManager] Failed to create error notification:", notifyErr);
    });
  });

  // Ensure core tables exist before anything else runs.
  // Idempotent — uses IF NOT EXISTS. Keeps fresh installs self-healing
  // without requiring a manual db:push before first boot.
  await Promise.all([
    ensureCoreNotificationsSchema(),
    ensureAuditLogSchema(),
    ensureWidgetSettingsSchema(),
  ]);

  const config = await getConfig();
  await initializePlugins(
    config.modules.activePlugins,
    config.modules.pluginSettings ?? {}
  );
  markPluginsLoaded();

  // Register clean shutdown handlers so plugin destroy() is called on SIGTERM/SIGINT.
  // Guards prevent double-registration if loadPlugins() is somehow called more than once
  // across hot-reloads in dev. No-op in Edge/serverless environments where process
  // signals are not delivered.
  if (typeof process !== "undefined" && process.on) {
    const shutdown = () => {
      destroyPlugins()
        .catch(console.error)
        .finally(() => process.exit(0));
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  }
}
