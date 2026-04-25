"use client";

import { useState } from "react";

interface Props {
  siteHash: string;
}

/**
 * Calls POST /api/cms/register on aeopugmill.com with this site's hash,
 * then fills the token input so the admin can review and save it.
 */
export default function RegisterButton({ siteHash }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleRegister() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://aeopugmill.com/api/cms/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ site_hash: siteHash }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Registration failed (HTTP ${res.status})`);
        return;
      }

      // Fill the token input and the hidden participation field so the admin
      // can review then hit Save.
      const tokenInput = document.querySelector<HTMLInputElement>('input[name="networkToken"]');
      if (tokenInput) {
        // Replace the password field type temporarily so the value is visible
        tokenInput.type  = "text";
        tokenInput.value = data.network_token;
      }

      // Auto-enable participation
      const checkbox = document.getElementById("participateCheck") as HTMLInputElement | null;
      const hidden   = document.getElementById("participateHidden") as HTMLInputElement | null;
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        if (hidden) hidden.value = "true";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="text-sm text-violet-700 hover:text-violet-900 underline underline-offset-2 disabled:opacity-50"
      >
        {loading ? "Registering…" : "Register this site to get a token →"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
