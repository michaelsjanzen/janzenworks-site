"use client";
import { useState } from "react";
import { sendTestEmail } from "@/lib/actions/email";

export default function TestEmailButton() {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setState("sending");
    setError(null);
    const result = await sendTestEmail();
    if (result.ok) {
      setState("ok");
      setTimeout(() => setState("idle"), 4000);
    } else {
      setState("error");
      setError(result.error ?? "Unknown error");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "sending"}
        className="bg-zinc-100 text-zinc-700 border border-zinc-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors"
      >
        {state === "sending" ? "Sending…" : state === "ok" ? "Sent!" : "Send test email"}
      </button>
      {state === "ok" && (
        <p className="text-xs text-green-600">Test email delivered to your destination address.</p>
      )}
      {state === "error" && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
