"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { updatePluginStatus, updatePluginSettings, uninstallPlugin } from "@/lib/actions/plugins";
import type { PluginSettingDef, PluginSettings } from "@/lib/plugin-registry";

interface Props {
  id: string;
  name: string;
  version: string;
  description: string;
  isActive: boolean;
  settingsDefs: PluginSettingDef[];
  settings: PluginSettings;
  hasAdminPage: boolean;
}

export default function PluginCard({
  id, name, version, description, isActive, settingsDefs, settings, hasAdminPage,
}: Props) {
  const [active, setActive] = useState(isActive);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [values, setValues] = useState<PluginSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uninstalled, setUninstalled] = useState(false);
  const [uninstallError, setUninstallError] = useState<string | null>(null);

  function handleToggle() {
    const next = !active;
    setActive(next);
    if (next) setUninstallError(null);
    startTransition(async () => {
      try {
        await updatePluginStatus(id, next);
      } catch {
        // Revert optimistic update if the server action failed
        setActive(!next);
      }
    });
  }

  function handleChange(key: string, value: string | boolean) {
    setSaved(false);
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      await updatePluginSettings(id, values);
      setSaved(true);
    });
  }

  function handleUninstall() {
    if (!window.confirm(
      `Queue "${name}" for uninstall?\n\nThis purges all plugin data (tables, settings, notifications) so the plugin is ready to be removed. Complete the uninstall by deleting plugins/${id}/ and removing its import from plugin-registry.ts, then redeploy.\n\nData deletion cannot be undone.`
    )) return;
    setUninstallError(null);
    startTransition(async () => {
      try {
        await uninstallPlugin(id);
        setUninstalled(true);
      } catch (err) {
        setUninstallError(err instanceof Error ? err.message : "Uninstall failed.");
      }
    });
  }

  const hasSettings = settingsDefs.length > 0;

  if (uninstalled) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg px-5 py-4 text-sm text-zinc-400 italic">
        {name} queued for uninstall. Remove the plugin code and redeploy to complete.
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-zinc-800">{name}</h3>
            <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">v{version}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400"}`}>
              {active ? "Active" : "Inactive"}
            </span>
          </div>
          {description && (
            <p className="text-sm text-zinc-500">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Link to custom admin page if the plugin has one */}
          {hasAdminPage && active && (
            <Link
              href={`/admin/plugins/${id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 border rounded px-2.5 py-1.5 hover:bg-zinc-50 transition"
            >
              Manage
            </Link>
          )}

          {/* Settings expand button — shown for any plugin with settingsDefs */}
          {hasSettings && (
            <button
              type="button"
              onClick={() => setSettingsOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 border rounded px-2.5 py-1.5 hover:bg-zinc-50 transition"
            >
              Settings
              <span className="text-zinc-400">{settingsOpen ? "▲" : "▼"}</span>
            </button>
          )}

          {/* Purge data — only available when inactive */}
          {!active && (
            <button
              type="button"
              onClick={handleUninstall}
              disabled={isPending}
              className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-2.5 py-1.5 hover:bg-red-50 transition disabled:opacity-50"
            >
              Queue uninstall
            </button>
          )}
          {uninstallError && (
            <span className="text-xs text-red-600">{uninstallError}</span>
          )}

          {/* Active / inactive toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={handleToggle}
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
              active ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full shadow ring-0 transition-transform duration-200 ${
                active ? "translate-x-5 bg-white dark:bg-zinc-900" : "translate-x-0 bg-white dark:bg-zinc-300"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Settings panel — toggled independently, available regardless of active state */}
      {hasSettings && settingsOpen && (
        <div className="border-t px-5 py-4 bg-zinc-50 space-y-4">
          {!active && (
            <p className="text-xs text-white bg-amber-700 rounded px-3 py-2">
              This plugin is inactive. Settings can be saved but will not take effect until the plugin is activated.
            </p>
          )}

          <div className="space-y-3">
            {settingsDefs.map(def => (
              <div key={def.key}>
                {def.type === "boolean" ? (
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium text-zinc-700">{def.label}</span>
                      {def.description && (
                        <p className="text-xs text-zinc-400">{def.description}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={(values[def.key] ?? def.default) as boolean}
                      onChange={e => handleChange(def.key, e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ) : def.type === "select" ? (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">{def.label}</label>
                    {def.description && (
                      <p className="text-xs text-zinc-400 mb-1">{def.description}</p>
                    )}
                    <select
                      value={(values[def.key] ?? def.default) as string}
                      onChange={e => handleChange(def.key, e.target.value)}
                      className="w-full border rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {def.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">{def.label}</label>
                    {def.description && (
                      <p className="text-xs text-zinc-400 mb-1">{def.description}</p>
                    )}
                    <input
                      type="text"
                      value={(values[def.key] ?? def.default) as string}
                      onChange={e => handleChange(def.key, e.target.value)}
                      className="w-full border rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-1.5 bg-[var(--ds-blue-1000)] text-white text-sm rounded-full hover:bg-[var(--ds-blue-900)] disabled:opacity-50 transition"
            >
              {isPending ? "Saving…" : "Save Settings"}
            </button>
            {saved && (
              <span className="text-xs text-green-600">Saved</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
