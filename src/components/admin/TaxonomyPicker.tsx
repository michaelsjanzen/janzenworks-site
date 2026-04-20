"use client";
import { useState, useRef } from "react";

type Item = { id: number; name: string; slug: string };

interface Props {
  label: string;
  fieldName: string;
  items: Item[];
  selectedIds?: Set<number>;
  onCreate: (name: string) => Promise<Item>;
  onAiSuggest?: () => void;
  aiPending?: boolean;
  suggestions?: string[];
  onSuggestDismiss?: () => void;
}

export default function TaxonomyPicker({ label, fieldName, items, selectedIds, onCreate, onAiSuggest, aiPending, suggestions, onSuggestDismiss }: Props) {
  const [all, setAll] = useState<Item[]>(items);
  const [selected, setSelected] = useState<Set<number>>(selectedIds ?? new Set());
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [applyingName, setApplyingName] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function add(id: number) {
    setSelected(prev => new Set([...prev, id]));
  }

  function remove(id: number) {
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function handleApplySuggestion(name: string) {
    setApplyingName(name);
    const existing = all.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      add(existing.id);
    } else {
      try {
        const created = await onCreate(name);
        setAll(prev => [...prev, created]);
        add(created.id);
      } catch {
        // silently ignore — user can add manually
      }
    }
    setAppliedSuggestions(prev => new Set([...prev, name]));
    setApplyingName(null);
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    try {
      const created = await onCreate(name);
      setAll(prev => [...prev, created]);
      add(created.id);
      setNewName("");
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setAdding(false);
    }
  }

  const selectedItems = all.filter(item => selected.has(item.id));
  const singularLabel = label.toLowerCase().replace(/s$/, "");

  // Autocomplete: match unselected existing items against the current input.
  // Empty input shows nothing — the combobox only appears once the user types.
  const query = newName.trim().toLowerCase();
  const matches = query
    ? all
        .filter(item => !selected.has(item.id))
        .filter(item => item.name.toLowerCase().includes(query))
        .slice(0, 8)
    : [];
  const hasExactMatch = query.length > 0 &&
    matches.some(m => m.name.toLowerCase() === query);
  const showMatches = focused && matches.length > 0;

  function pickMatch(item: Item) {
    add(item.id);
    setNewName("");
    setActiveIdx(0);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
        {onAiSuggest && (
          <button
            type="button"
            onClick={onAiSuggest}
            disabled={aiPending}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-all disabled:cursor-not-allowed ${
              aiPending
                ? "bg-violet-600 border-violet-600 text-white cursor-wait"
                : "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 hover:border-violet-300 disabled:opacity-40"
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {aiPending ? "…" : "Suggest"}
          </button>
        )}
      </div>

      {/* AI suggestions */}
      {suggestions && (() => {
        const pending = suggestions.filter(s => !appliedSuggestions.has(s) && !selectedItems.some(item => item.name.toLowerCase() === s.toLowerCase()));
        const existing = pending.filter(s => all.some(item => item.name.toLowerCase() === s.toLowerCase()));
        const isNew    = pending.filter(s => !all.some(item => item.name.toLowerCase() === s.toLowerCase()));
        if (pending.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-1.5 py-1">
            <span className="text-xs text-zinc-400">AI suggested:</span>
            {existing.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => handleApplySuggestion(name)}
                disabled={applyingName === name}
                className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
              >
                {applyingName === name ? "…" : `+ ${name}`}
              </button>
            ))}
            {isNew.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => handleApplySuggestion(name)}
                disabled={applyingName === name}
                className="text-xs px-2 py-0.5 rounded-full bg-white border border-dashed border-zinc-300 text-zinc-500 hover:bg-zinc-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition"
              >
                {applyingName === name ? "…" : `+ ${name}`}
              </button>
            ))}
            {onSuggestDismiss && (
              <button type="button" onClick={onSuggestDismiss} aria-label="Dismiss suggestions" className="text-xs text-zinc-400 hover:text-zinc-600 ml-1">✕</button>
            )}
          </div>
        );
      })()}

      {/* Hidden inputs carry selected IDs to the server action */}
      {Array.from(selected).map(id => (
        <input key={id} type="hidden" name={fieldName} value={id} />
      ))}

      <div className="border border-zinc-200 rounded-lg bg-zinc-50 divide-y">
        {/* Selected chips */}
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-3">
            {selectedItems.map(item => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800"
              >
                {item.name}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="ml-0.5 text-blue-500 hover:text-blue-800 leading-none transition"
                  aria-label={`Remove ${item.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {selectedItems.length === 0 && all.length === 0 && (
          <p className="px-3 py-2 text-sm text-zinc-400">No {label.toLowerCase()} yet — create one below.</p>
        )}

        {/* Inline add + autocomplete */}
        <div className="px-3 py-2 relative">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setActiveIdx(0); }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                // Delay so click on a suggestion registers before the list unmounts.
                setTimeout(() => setFocused(false), 120);
              }}
              onKeyDown={e => {
                if (showMatches && e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx(i => (i + 1) % matches.length);
                  return;
                }
                if (showMatches && e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx(i => (i - 1 + matches.length) % matches.length);
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  // Prefer selecting an existing match over creating a new one.
                  if (showMatches) {
                    pickMatch(matches[activeIdx]);
                  } else {
                    handleAdd();
                  }
                  return;
                }
                if (e.key === "Escape") setFocused(false);
              }}
              placeholder={`Add or search ${singularLabel}…`}
              role="combobox"
              aria-expanded={showMatches}
              aria-autocomplete="list"
              className="flex-1 border border-zinc-200 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newName.trim() || hasExactMatch}
              title={hasExactMatch ? "Already exists — press Enter to select" : undefined}
              className="px-3 py-1.5 bg-white border border-zinc-200 rounded text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 transition"
            >
              {adding ? "…" : "+ Add"}
            </button>
          </div>

          {showMatches && (
            <ul
              role="listbox"
              className="absolute left-3 right-3 top-full mt-1 z-10 bg-white border border-zinc-200 rounded-md shadow-sm max-h-48 overflow-y-auto"
            >
              {matches.map((item, i) => (
                <li key={item.id} role="option" aria-selected={i === activeIdx}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()} // keep focus so onBlur timeout doesn't pre-empt us
                    onClick={() => pickMatch(item)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full text-left px-3 py-1.5 text-sm ${i === activeIdx ? "bg-blue-50 text-blue-700" : "text-zinc-700 hover:bg-zinc-50"}`}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
