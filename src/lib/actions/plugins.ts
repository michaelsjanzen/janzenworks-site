"use server";
import { revalidatePath } from "next/cache";
import { getConfig, updateConfig } from "@/lib/config";
import { getCurrentUser } from "@/lib/get-current-user";
import { auditLog } from "@/lib/audit-log";
import { getPlugin } from "@/lib/plugin-registry";
import { deletePluginNotifications } from "@/lib/notifications";
import type { PluginSettings } from "@/lib/plugin-registry";
import { db } from "@/lib/db";
import { widgetSettings, themeDesignConfigs } from "@/lib/db/schema";
import { like, eq } from "drizzle-orm";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized: admin role required");
  return user;
}

function validatePluginId(pluginId: string) {
  if (!/^[a-z0-9-]+$/.test(pluginId)) throw new Error("Invalid plugin ID format");
}

export async function updatePluginStatus(pluginId: string, activate: boolean) {
  const user = await requireAdmin();
  validatePluginId(pluginId);

  const config = await getConfig();
  const active: string[] = config.modules.activePlugins || [];

  if (activate && !active.includes(pluginId)) {
    config.modules.activePlugins = [...active, pluginId];
    // Run schema migration immediately so plugin tables exist before the next
    // page render. Cannot rely on loadPlugins() here — its `loaded` guard is
    // already set for the current server process. Migration is idempotent
    // (CREATE TABLE IF NOT EXISTS) so running it again on the next cold start
    // is also safe.
    const plugin = getPlugin(pluginId);
    if (plugin?.schema?.migrate) {
      await plugin.schema.migrate();
    }
    // Register widgets in-memory so they're available in the current process
    // without requiring a cold restart. The next cold start will re-register
    // them via initializePlugins() as normal.
    if (plugin?.widgets) {
      const { registerWidget } = await import("@/lib/widget-registry");
      for (const widget of plugin.widgets) {
        registerWidget(widget);
      }
    }
    // Run one-time activation setup (e.g. seeding a default page).
    if (plugin?.onActivate) {
      const currentSettings = config.modules.pluginSettings?.[pluginId] ?? {};
      await plugin.onActivate(currentSettings);
    }
  } else if (!activate) {
    config.modules.activePlugins = active.filter((p: string) => p !== pluginId);

    // Strip the plugin's widget IDs from all persisted widget area assignments
    // so deactivated widgets don't appear as broken entries in the UI or front-end.
    const plugin = getPlugin(pluginId);
    const pluginWidgetIds = plugin?.widgets?.map(w => w.id) ?? [];
    if (pluginWidgetIds.length > 0) {
      await removeWidgetIdsFromAreas(pluginWidgetIds);
    }
  }

  await updateConfig(config);
  auditLog({ action: activate ? "plugin.activate" : "plugin.deactivate", userId: user.id, detail: pluginId });
  revalidatePath("/admin/plugins");
  revalidatePath(`/admin/plugins/${pluginId}`);
}

/**
 * Purge all data owned by a plugin: drops its tables, removes its settings,
 * and clears its notification rows. The plugin must be inactive first.
 * Plugin code remains in the codebase — this only removes runtime data.
 */
export async function uninstallPlugin(pluginId: string): Promise<void> {
  const user = await requireAdmin();
  validatePluginId(pluginId);

  const config = await getConfig();

  if (config.modules.activePlugins.includes(pluginId)) {
    throw new Error("Deactivate the plugin before uninstalling.");
  }

  const plugin = getPlugin(pluginId);
  if (!plugin) throw new Error("Plugin not found.");

  // Drop plugin-owned tables
  if (plugin.schema?.teardown) {
    await plugin.schema.teardown();
  }

  // Remove plugin notifications
  await deletePluginNotifications(pluginId);

  // Remove plugin settings from config
  const newSettings = { ...(config.modules.pluginSettings ?? {}) };
  delete newSettings[pluginId];
  await updateConfig({
    ...config,
    modules: { ...config.modules, pluginSettings: newSettings },
  });

  auditLog({ action: "plugin.uninstall", userId: user.id, detail: pluginId });
  revalidatePath("/admin/plugins");
}

export async function updatePluginSettings(pluginId: string, settings: PluginSettings) {
  const user = await requireAdmin();
  validatePluginId(pluginId);

  const plugin = getPlugin(pluginId);
  if (!plugin) throw new Error("Plugin not found.");

  // Validate each value against the plugin's declared settingsDefs.
  if (plugin.settingsDefs) {
    for (const def of plugin.settingsDefs) {
      const value = settings[def.key];
      if (def.required && (value === undefined || value === "")) {
        throw new Error(`Setting "${def.key}" is required for plugin "${pluginId}".`);
      }
      if (value !== undefined) {
        if (def.type === "boolean" && typeof value !== "boolean") {
          throw new Error(`Setting "${def.key}" must be a boolean.`);
        }
        if ((def.type === "text") && typeof value !== "string") {
          throw new Error(`Setting "${def.key}" must be a string.`);
        }
        if (def.type === "select" && def.options && !def.options.includes(value as string)) {
          throw new Error(`Setting "${def.key}" must be one of: ${def.options.join(", ")}.`);
        }
      }
    }
  }

  const config = await getConfig();
  config.modules.pluginSettings = {
    ...(config.modules.pluginSettings ?? {}),
    [pluginId]: settings,
  };

  await updateConfig(config);
  auditLog({ action: "plugin.settings_update", userId: user.id, detail: pluginId });
  revalidatePath("/admin/plugins");
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Remove a set of widget IDs from every persisted widget area assignment.
 * Cleans up both the live widget_settings rows and any draft/published
 * theme_design_configs rows so deactivated widgets leave no orphan references.
 */
async function removeWidgetIdsFromAreas(widgetIds: string[]): Promise<void> {
  if (widgetIds.length === 0) return;

  // ── 1. widget_settings table (live published assignments) ────────────────
  // Each area row has widgetId = "area:<areaId>" and key = "widgets".
  const areaRows = await db
    .select({ widgetId: widgetSettings.widgetId, value: widgetSettings.value })
    .from(widgetSettings)
    .where(like(widgetSettings.widgetId, "area:%"));

  await Promise.all(
    areaRows.map(async (row) => {
      const current = row.value.split(",").map(s => s.trim()).filter(Boolean);
      const updated = current.filter(id => !widgetIds.includes(id));
      if (updated.length === current.length) return; // nothing changed
      await db
        .update(widgetSettings)
        .set({ value: updated.join(",") } as Partial<typeof widgetSettings.$inferInsert>)
        .where(eq(widgetSettings.widgetId, row.widgetId));
    })
  );

  // ── 2. theme_design_configs (draft + published JSONB) ────────────────────
  // Widget area assignments are stored as "widgetArea:<areaId>" keys in the config object.
  const designRows = await db
    .select({ id: themeDesignConfigs.id, config: themeDesignConfigs.config })
    .from(themeDesignConfigs);

  await Promise.all(
    designRows.map(async (row) => {
      const config = (row.config ?? {}) as Record<string, string>;
      let changed = false;
      const updated: Record<string, string> = { ...config };
      for (const [key, val] of Object.entries(config)) {
        if (!key.startsWith("widgetArea:")) continue;
        const current = val.split(",").map(s => s.trim()).filter(Boolean);
        const filtered = current.filter(id => !widgetIds.includes(id));
        if (filtered.length !== current.length) {
          updated[key] = filtered.join(",");
          changed = true;
        }
      }
      if (!changed) return;
      await db
        .update(themeDesignConfigs)
        .set({ config: updated } as Partial<typeof themeDesignConfigs.$inferInsert>)
        .where(eq(themeDesignConfigs.id, row.id));
    })
  );
}
