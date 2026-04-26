"use client";
import { useState } from "react";

interface NavItem {
  label: string;
  path: string;
}

export default function NavEditor({ initialItems, name = "navigation" }: { initialItems: NavItem[]; name?: string }) {
  const [items, setItems] = useState<NavItem[]>(initialItems);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function update(index: number, field: keyof NavItem, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function add() {
    setItems(prev => [...prev, { label: "", path: "/" }]);
  }

  function remove(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  // Drag-to-reorder
  function onDragStart(index: number) {
    setDragIndex(index);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  }

  function onDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className="space-y-2">
      {/* Serialized value submitted with the form */}
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {items.length === 0 && (
        <p className="text-sm text-zinc-400 py-2">No navigation items. Add one below.</p>
      )}

      {items.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragOver={e => onDragOver(e, i)}
          onDragEnd={onDragEnd}
          className={`flex items-center gap-2 group rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 cursor-grab active:cursor-grabbing transition ${
            dragIndex === i ? "opacity-50" : ""
          }`}
        >
          {/* Drag handle */}
          <svg className="w-4 h-4 text-zinc-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a1 1 0 00-1 1v1H5a1 1 0 000 2h1v1a1 1 0 002 0V6h1a1 1 0 000-2H8V3a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v1h-1a1 1 0 000 2h1v1a1 1 0 002 0V6h1a1 1 0 000-2h-1V3a1 1 0 00-1-1zM7 9a1 1 0 00-1 1v1H5a1 1 0 000 2h1v1a1 1 0 002 0v-1h1a1 1 0 000-2H8v-1a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v1h-1a1 1 0 000 2h1v1a1 1 0 002 0v-1h1a1 1 0 000-2h-1v-1a1 1 0 00-1-1z" />
          </svg>

          <input
            value={item.label}
            onChange={e => update(i, "label", e.target.value)}
            placeholder="Label"
            className="flex-1 min-w-0 bg-white border border-zinc-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <input
            value={item.path}
            onChange={e => update(i, "path", e.target.value)}
            placeholder="/path"
            className="w-40 bg-white border border-zinc-200 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-zinc-300 hover:text-red-400 transition p-1 rounded"
            aria-label="Remove"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="text-sm text-zinc-500 hover:text-zinc-800 border border-dashed border-zinc-300 rounded-lg px-4 py-2 w-full hover:border-zinc-400 transition"
      >
        + Add nav item
      </button>
    </div>
  );
}
