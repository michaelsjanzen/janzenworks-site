"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleEndpoint, deleteEndpoint } from "../actions";

export function ToggleButton({ id, active }: { id: number; active: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handle() {
    setPending(true);
    await toggleEndpoint(id, !active);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={`text-xs font-medium px-2 py-1 rounded-full transition-colors disabled:opacity-50 ${
        active
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
      }`}
    >
      {active ? "Active" : "Paused"}
    </button>
  );
}

export function DeleteButton({ id, name }: { id: number; name: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handle() {
    if (!confirm(`Delete webhook "${name}"? This will also remove its delivery history.`)) return;
    setPending(true);
    await deleteEndpoint(id);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 font-medium transition-colors"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
