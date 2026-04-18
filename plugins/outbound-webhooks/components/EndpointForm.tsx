"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEndpoint } from "../actions";
import { AVAILABLE_EVENTS } from "../constants";

export default function EndpointForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);
  const router = useRouter();

  function toggleEvent(value: string) {
    if (value === "*") {
      setSelectedEvents(["*"]);
      return;
    }
    setSelectedEvents((prev) => {
      const without = prev.filter((e) => e !== "*");
      return without.includes(value)
        ? without.filter((e) => e !== value)
        : [...without, value];
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    // Replace events in formData with state-managed selection
    fd.delete("events");
    for (const ev of selectedEvents) fd.append("events", ev);

    const result = await createEndpoint(fd);
    setPending(false);
    if (!result.ok) { setError(result.error ?? "Failed"); return; }
    setOpen(false);
    setSelectedEvents(["*"]);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        Add endpoint
      </button>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700">New webhook endpoint</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              name="name"
              required
              maxLength={100}
              placeholder="My integration"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">URL</label>
            <input
              name="url"
              required
              type="url"
              placeholder="https://hooks.zapier.com/..."
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Signing secret <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="secret"
            type="password"
            placeholder="Leave blank for unsigned webhooks"
            autoComplete="off"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <p className="text-xs text-zinc-400 mt-1">
            When set, each request includes <code className="bg-zinc-100 px-1 rounded">X-Pugmill-Signature: sha256=…</code>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Events</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AVAILABLE_EVENTS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(value)}
                  onChange={() => toggleEvent(value)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                />
                <span className="text-zinc-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={pending || selectedEvents.length === 0}
            className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {pending ? "Saving…" : "Save endpoint"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null); }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
