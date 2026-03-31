"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import type { DesignTokenDef, ColorPreset } from "@/types/design";
import { BUILT_IN_GROUPS } from "@/types/design";
import MediaUrlPicker from "@/components/admin/MediaUrlPicker";

const GROUP_LABELS: Record<string, string> = {
  colors: "Colors",
  typography: "Typography",
  "layout-home": "Layout — Homepage Feed",
  "layout-post": "Layout — Blog Post",
  "layout-page": "Layout — Static Page",
  "hero": "Hero Section",
};

interface MediaItem { id: number; url: string; fileName: string; }

interface Props {
  tokens: DesignTokenDef[];
  defaults: Record<string, string>;
  draftConfig: Record<string, string>;
  sansFonts: string[];
  monoFonts: string[];
  colorPresets?: ColorPreset[];
  hasDraft?: boolean;
  saveAction: (partial: Record<string, string>) => Promise<void>;
  saveStructuralAction?: (partial: Record<string, string>) => Promise<void>;
  allMedia?: MediaItem[];
}

export default function DesignForm({
  tokens,
  defaults,
  draftConfig,
  sansFonts,
  monoFonts,
  colorPresets = [],
  hasDraft,
  saveAction,
  saveStructuralAction,
  allMedia = [],
}: Props) {
  // Controlled state for all token values so UI stays live after changes
  const initValues = () => {
    const init: Record<string, string> = {};
    for (const token of tokens) {
      init[token.key] = draftConfig[token.key] ?? defaults[token.key] ?? token.default;
    }
    return init;
  };

  const [values, setValues] = useState<Record<string, string>>(initValues);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Only true after the user has explicitly changed a value via setValue.
  // Unlike an isFirstRender guard, this survives React Strict Mode's
  // double-mount and prevents a spurious draft being created on every page load.
  const hasChangedRef = useRef(false);
  const [, startTransition] = useTransition();

  // Sync all token values from server props when hasDraft transitions true → false
  // (publish or discard), so the form reflects the new published config.
  const prevHasDraftRef = useRef(hasDraft);
  useEffect(() => {
    const wasDraft = prevHasDraftRef.current;
    prevHasDraftRef.current = hasDraft;
    if (wasDraft && !hasDraft) {
      const synced: Record<string, string> = {};
      for (const token of tokens) {
        synced[token.key] = draftConfig[token.key] ?? defaults[token.key] ?? token.default;
      }
      setValues(synced);
      setRawHex(synced);
      hasChangedRef.current = false;
    }
  // draftConfig/defaults/tokens are stable references on the publish/discard render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDraft]);

  // Keys of tokens that bypass draft and write directly to published.
  const structuralKeys = new Set(
    tokens.filter(t => t.immediatePublish).map(t => t.key)
  );

  // Separate raw display state for hex text inputs so the user can type
  // a hex value character-by-character without React snapping back to the
  // last valid state on every keystroke.
  const [rawHex, setRawHex] = useState<Record<string, string>>(initValues);

  // Auto-save with 800ms debounce whenever values change
  useEffect(() => {
    if (!hasChangedRef.current) return;
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        const saves: Promise<void>[] = [saveAction(values)];
        if (saveStructuralAction && structuralKeys.size > 0) {
          const structural = Object.fromEntries(
            Object.entries(values).filter(([k]) => structuralKeys.has(k))
          );
          if (Object.keys(structural).length > 0) {
            saves.push(saveStructuralAction(structural));
          }
        }
        await Promise.all(saves);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      });
    }, 800);
    return () => clearTimeout(saveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  function setValue(key: string, val: string) {
    hasChangedRef.current = true;
    setValues(prev => ({ ...prev, [key]: val }));
    setRawHex(prev => ({ ...prev, [key]: val }));
  }

  // Primitive string of active font names — only changes when a font token value
  // changes, not on every state update. Used as a stable effect dependency.
  const activeFontKeys = tokens
    .filter(t => t.type === "google-font")
    .map(t => values[t.key] ?? "")
    .join(",");

  // Load Google Fonts for preview rendering. Fires only when font selections change.
  useEffect(() => {
    const fonts = activeFontKeys.split(",").filter(Boolean);
    if (fonts.length === 0) return;
    const families = fonts.map(f => `family=${encodeURIComponent(f)}:wght@400;700`).join("&");
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [activeFontKeys]);

  // Group tokens: built-in groups in order, then custom groups alphabetically
  const builtInOrder = BUILT_IN_GROUPS as readonly string[];
  const customGroups = [...new Set(
    tokens
      .map(t => t.group)
      .filter(g => !builtInOrder.includes(g))
  )].sort();

  const orderedGroups = [...builtInOrder, ...customGroups].filter(
    g => tokens.some(t => t.group === g)
  );

  function renderToken(token: DesignTokenDef) {
    const value = values[token.key] ?? token.default;

    if (token.type === "color") {
      return (
        <div key={token.key} className="flex items-start gap-4">
          <div className="flex-1">
            <label htmlFor={`token-${token.key}`} className="text-sm font-medium text-zinc-700">
              {token.label}
            </label>
            {token.description && (
              <p className="text-xs text-zinc-400 mt-0.5">{token.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              id={`token-${token.key}`}
              type="color"
              name={token.key}
              value={value}
              onChange={e => setValue(token.key, e.target.value)}
              className="h-8 w-10 rounded border border-zinc-200 cursor-pointer p-0.5 shrink-0"
            />
            <input
              type="text"
              aria-label={`${token.label} hex value`}
              value={rawHex[token.key] ?? value}
              onChange={e => {
                const raw = e.target.value;
                // Always update the display so the user can type freely.
                setRawHex(prev => ({ ...prev, [token.key]: raw }));
                // Only sync to token state (and the color picker) once a full
                // valid hex is entered — prevents the picker snapping mid-type.
                if (/^#[0-9a-fA-F]{6}$/.test(raw.trim())) {
                  setValue(token.key, raw.trim());
                }
              }}
              maxLength={7}
              className="w-24 border border-zinc-200 rounded px-2 py-1 text-xs font-mono text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
        </div>
      );
    }

    if (token.type === "google-font") {
      const fontList = token.fontList === "mono" ? monoFonts
        : token.fontList === "sans" ? sansFonts
        : [...sansFonts, ...monoFonts];
      const currentFont = value;

      return (
        <div key={token.key} className="space-y-3">
          <div>
            <label htmlFor={`token-${token.key}`} className="text-sm font-medium text-zinc-700">
              {token.label}
            </label>
            {token.description && (
              <p className="text-xs text-zinc-400 mt-0.5">{token.description}</p>
            )}
          </div>
          <select
            id={`token-${token.key}`}
            name={token.key}
            value={currentFont}
            onChange={e => setValue(token.key, e.target.value)}
            className="block w-full sm:w-64 px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            {fontList.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
          <div
            style={{ fontFamily: `'${currentFont}', system-ui, sans-serif` }}
            className="text-xl text-zinc-700 border border-dashed border-zinc-200 rounded-lg p-4 bg-zinc-50"
          >
            The quick brown fox jumps over the lazy dog
          </div>
        </div>
      );
    }

    if (token.type === "select") {
      return (
        <div key={token.key} className="flex items-start gap-4">
          <div className="flex-1">
            <label htmlFor={`token-${token.key}`} className="text-sm font-medium text-zinc-700">
              {token.label}
            </label>
            {token.description && (
              <p className="text-xs text-zinc-400 mt-0.5">{token.description}</p>
            )}
          </div>
          <select
            id={`token-${token.key}`}
            name={token.key}
            value={value}
            onChange={e => setValue(token.key, e.target.value)}
            className="block px-3 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 shrink-0"
          >
            {(token.options ?? []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (token.type === "toggle") {
      const isOn = value === "true";
      return (
        <div key={token.key} className="flex items-start gap-4">
          <div className="flex-1">
            <span className="text-sm font-medium text-zinc-700">{token.label}</span>
            {token.description && (
              <p className="text-xs text-zinc-400 mt-0.5">{token.description}</p>
            )}
          </div>
          {/* Hidden input must be outside the button so browsers include it in FormData */}
          <input type="hidden" name={token.key} value={value} />
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={() => setValue(token.key, isOn ? "false" : "true")}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              isOn ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                isOn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      );
    }

    if (token.type === "media-url") {
      return (
        <div key={token.key}>
          {token.description && (
            <p className="text-xs text-zinc-400 mb-2">{token.description}</p>
          )}
          <MediaUrlPicker
            label={token.label}
            name={token.key}
            defaultValue={draftConfig[token.key] ?? defaults[token.key] ?? ""}
            allMedia={allMedia}
          />
        </div>
      );
    }

    if (token.type === "text" || token.type === "url" || token.type === "image-url") {
      return (
        <div key={token.key} className="space-y-1.5">
          <div>
            <label htmlFor={`token-${token.key}`} className="text-sm font-medium text-zinc-700">
              {token.label}
            </label>
            {token.description && (
              <p className="text-xs text-zinc-400 mt-0.5">{token.description}</p>
            )}
          </div>
          <input
            id={`token-${token.key}`}
            type="text"
            name={token.key}
            value={value}
            onChange={e => setValue(token.key, e.target.value)}
            placeholder={token.placeholder}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          {token.type === "image-url" && value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview"
              className="mt-1 h-20 w-auto max-w-[200px] rounded-lg border border-zinc-200 object-contain bg-zinc-50 p-1"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      );
    }

    if (token.type === "range") {
      return (
        <div key={token.key} className="space-y-2">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label htmlFor={`token-${token.key}`} className="text-sm font-medium text-zinc-700">
                {token.label}
              </label>
              {token.description && (
                <p className="text-xs text-zinc-400 mt-0.5">{token.description}</p>
              )}
            </div>
            <span className="text-sm font-mono text-zinc-500 shrink-0 tabular-nums">
              {value}{token.unit ?? ""}
            </span>
          </div>
          <input
            id={`token-${token.key}`}
            type="range"
            name={token.key}
            min={token.min ?? 0}
            max={token.max ?? 100}
            step={token.step ?? 1}
            value={value}
            onChange={e => setValue(token.key, e.target.value)}
            className="w-full accent-zinc-900"
          />
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      {saveStatus === "saving" && <p className="text-xs text-zinc-400 text-right">Saving…</p>}
      {saveStatus === "saved" && <p className="text-xs text-emerald-600 font-medium text-right">Saved</p>}
      {orderedGroups.map(group => {
        const groupTokens = tokens
          .filter(t => t.group === group)
          .sort((a, b) => {
            if (a.order == null && b.order == null) return 0;
            if (a.order == null) return 1;
            if (b.order == null) return -1;
            return a.order - b.order;
          });
        // Label priority: built-in map → first token's groupLabel → auto-capitalize from key
        const firstToken = groupTokens[0];
        const label = GROUP_LABELS[group]
          ?? firstToken?.groupLabel
          ?? group.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const isCustom = !builtInOrder.includes(group);
        const isStructuralGroup = groupTokens.some(t => t.immediatePublish);

        // If the group has a designated gate token, hide all other tokens when it is off
        const gateToken = groupTokens.find(t => t.isGate === true);
        const isGated = gateToken != null && values[gateToken.key] !== "true";

        return (
          <div key={group} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
            <h3 className="text-base font-semibold text-zinc-800 pb-2 border-b border-zinc-100 flex items-center gap-2">
              {label}
              {isCustom && (
                <span className="text-xs font-normal text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                  Theme option
                </span>
              )}
              {isStructuralGroup && (
                <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Live
                </span>
              )}
            </h3>
            {group === "colors" && colorPresets.length > 0 && (
              <div className="space-y-2 pb-1">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        for (const [k, v] of Object.entries(preset.colors)) {
                          setValue(k, v);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm transition-all text-xs font-medium text-zinc-700"
                    >
                      <span className="flex gap-0.5">
                        <span className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: preset.colors.colorBackground }} />
                        <span className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: preset.colors.colorAccent }} />
                        <span className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: preset.colors.colorForeground }} />
                      </span>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          {groupTokens.map(token =>
              isGated && token.key !== gateToken!.key ? null : renderToken(token)
            )}
            {isGated && (
              <p className="text-xs text-zinc-400 italic">
                Enable this section to reveal additional settings.
              </p>
            )}
          </div>
        );
      })}

    </div>
  );
}
