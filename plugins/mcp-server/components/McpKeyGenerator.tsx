"use client";

import { useState } from "react";
import { createApiKey } from "@/lib/actions/api-keys";

interface Props {
  mcpUrl: string;
}

type State =
  | { phase: "idle" }
  | { phase: "generating" }
  | { phase: "done"; token: string; keyName: string }
  | { phase: "dismissed" };

function buildConfig(mcpUrl: string, token: string) {
  return JSON.stringify(
    {
      mcpServers: {
        "pugmill-cms": {
          type: "http",
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );
}

const PLACEHOLDER_TOKEN = "YOUR_API_KEY";

export default function McpKeyGenerator({ mcpUrl }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [keyName, setKeyName] = useState("Claude Desktop");
  const [nameError, setNameError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const token = state.phase === "done" ? state.token : PLACEHOLDER_TOKEN;
  const configJson = buildConfig(mcpUrl, token);
  const isPlaceholder = state.phase !== "done";

  async function handleGenerate() {
    if (!keyName.trim()) {
      setNameError("Key name is required.");
      return;
    }
    setNameError(null);
    setState({ phase: "generating" });

    const fd = new FormData();
    fd.set("name", keyName.trim());
    const result = await createApiKey(fd);

    if ("error" in result) {
      setState({ phase: "idle" });
      setNameError(result.error);
      return;
    }
    setState({ phase: "done", token: result.token, keyName: keyName.trim() });
  }

  async function copyConfig() {
    await navigator.clipboard.writeText(configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(configJson);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  /** Splits the JSON into segments so we can highlight just the token value. */
  function renderHighlightedJson() {
    if (isPlaceholder) {
      return <span className="text-zinc-500">{configJson}</span>;
    }
    const tokenLiteral = `"Bearer ${token}"`;
    const parts = configJson.split(tokenLiteral);
    return (
      <>
        <span>{parts[0]}</span>
        <span className="bg-amber-100 text-amber-800 rounded px-0.5">{tokenLiteral}</span>
        <span>{parts[1]}</span>
      </>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Step 1: Generate a key ─────────────────────────────────────── */}
      {state.phase !== "dismissed" && (
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            {state.phase === "done" ? "Key generated" : "Generate a key for this config"}
          </p>

          {state.phase === "done" ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800">
                  &ldquo;{state.keyName}&rdquo; created and saved to API Keys.
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  The key is shown in the config below — copy it before dismissing.
                </p>
              </div>
              <button
                onClick={() => setState({ phase: "dismissed" })}
                className="text-xs text-emerald-700 underline underline-offset-2 flex-shrink-0 hover:text-emerald-900"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={keyName}
                  onChange={e => { setKeyName(e.target.value); setNameError(null); }}
                  placeholder="e.g. Claude Desktop"
                  maxLength={100}
                  disabled={state.phase === "generating"}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
                />
                {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
              </div>
              <button
                onClick={handleGenerate}
                disabled={state.phase === "generating"}
                className="flex-shrink-0 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {state.phase === "generating" ? "Generating…" : "Generate key"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Config snippet ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Claude Desktop config snippet
          </p>
          <button
            onClick={state.phase === "done" ? copyConfig : copySnippet}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
              copied || copiedSnippet
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
            }`}
          >
            {copied || copiedSnippet ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        <pre className={`rounded-lg p-4 font-mono text-xs overflow-x-auto border transition-colors ${
          isPlaceholder
            ? "bg-zinc-50 border-zinc-200 text-zinc-400"
            : "bg-zinc-50 border-amber-200 text-zinc-700"
        }`}>
          {renderHighlightedJson()}
        </pre>

        {isPlaceholder && state.phase !== "dismissed" && (
          <p className="text-xs text-zinc-400 mt-1.5">
            Generate a key above to fill this in automatically, or{" "}
            <a href="/admin/settings/api-keys" className="underline hover:text-zinc-600">
              use an existing key
            </a>
            .
          </p>
        )}

        {state.phase === "dismissed" && (
          <p className="text-xs text-zinc-400 mt-1.5">
            Key was saved to{" "}
            <a href="/admin/settings/api-keys" className="underline hover:text-zinc-600">
              API Keys
            </a>
            . Generate a new one above if needed, or paste your key in place of{" "}
            <code className="font-mono bg-zinc-100 px-1 rounded">YOUR_API_KEY</code>.
          </p>
        )}
      </div>

    </div>
  );
}
