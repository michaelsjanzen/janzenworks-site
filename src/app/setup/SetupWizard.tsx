"use client";

import { useState, useTransition } from "react";
import { completeSetup, validateAiKey } from "@/lib/actions/setup";
import { regenerateSecret } from "@/lib/actions/regenerate-secret";

// ─── Author voice presets ─────────────────────────────────────────────────────

const PRESETS = [
  {
    id: "direct",
    label: "Direct",
    description: "Short sentences, no hedging",
    value:
      "Write in a clear, direct style. Lead with the main point. Use short, declarative sentences. Avoid hedging language like \"I think\", \"perhaps\", or \"it seems\". Vary sentence length naturally. Never start responses with affirmations like \"Certainly!\", \"Of course!\", or \"Absolutely!\". Don't end with \"In summary\" or \"In conclusion\".",
  },
  {
    id: "conversational",
    label: "Conversational",
    description: "Warm, accessible, plain language",
    value:
      "Write in a warm, conversational tone — as if talking directly to the reader. Use contractions freely. Keep paragraphs short. Explain jargon when you use it. Avoid formal transitions like \"Furthermore\" or \"In conclusion\". Never start with \"Certainly!\", \"Of course!\", or \"Absolutely!\".",
  },
  {
    id: "analytical",
    label: "Analytical",
    description: "Precise, evidence-led, nuanced",
    value:
      "Write with precision and depth. Build arguments logically. Use evidence and specifics rather than generalities. Acknowledge trade-offs and nuance. Avoid rhetorical filler. Never start responses with affirmations like \"Certainly!\" or \"Of course!\".",
  },
] as const;

// ─── Default models per provider ─────────────────────────────────────────────

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  detectedUrl: string;
  currentSecret: string;
  hideSecret?: boolean;
}

export default function SetupWizard({ detectedUrl, currentSecret, hideSecret = false }: Props) {
  // Form state
  const [authorVoice, setAuthorVoice] = useState("");
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiKey, setAiKey] = useState("");
  const [passwordMatch, setPasswordMatch] = useState(true);

  // Secret state
  const [secret, setSecret] = useState(currentSecret);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI key validation state
  const [keyValidState, setKeyValidState] = useState<"idle" | "valid" | "invalid">("idle");
  const [keyValidError, setKeyValidError] = useState<string | null>(null);

  // Submission state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [isValidatingKey, startValidation] = useTransition();
  const [isRegenerating, startRegenerate] = useTransition();

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePreset(value: string) {
    setAuthorVoice(value);
  }

  function handleProviderChange(value: string) {
    setAiProvider(value);
    setAiModel(DEFAULT_MODELS[value] ?? "");
    setAiKey("");
    setKeyValidState("idle");
    setKeyValidError(null);
  }

  function handleTestKey() {
    if (!aiProvider || !aiKey.trim()) return;
    setKeyValidState("idle");
    setKeyValidError(null);
    startValidation(async () => {
      const result = await validateAiKey(
        aiProvider as "anthropic" | "openai" | "gemini",
        aiKey
      );
      setKeyValidState(result.valid ? "valid" : "invalid");
      setKeyValidError(result.error ?? null);
    });
  }

  function handleRegenerate() {
    startRegenerate(async () => {
      const result = await regenerateSecret();
      setSecret(result.secret);
      setSecretRevealed(false);
      setCopied(false);
    });
  }

  async function handleCopy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password !== confirmPassword) {
      setPasswordMatch(false);
      setSubmitError("Passwords do not match.");
      return;
    }
    setPasswordMatch(true);

    const formData = new FormData(form);
    startSubmit(async () => {
      const result = await completeSetup(formData);
      if (result && "error" in result) {
        setSubmitError(result.error);
      }
      // On success, completeSetup() redirects — nothing more to do
    });
  }

  // ── Secret display ───────────────────────────────────────────────────────────

  const maskedSecret = secret ? "•".repeat(Math.min(secret.length, 44)) : "";
  const displayedSecret = secretRevealed ? secret : maskedSecret;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900">Welcome to Pugmill</h1>
        <p className="text-zinc-500 mt-2">
          Let&apos;s get your site set up. You can change everything here later from the admin panel.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ── Section 1: Admin Account ──────────────────────────────────── */}
        <section className="bg-white border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-zinc-900">Your Admin Account</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Jane Smith"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="jane@example.com"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                onChange={() => setPasswordMatch(true)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
                onChange={() => setPasswordMatch(true)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  passwordMatch ? "focus:ring-blue-500" : "border-red-400 focus:ring-red-500"
                }`}
              />
              {!passwordMatch && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 2: Site Info ──────────────────────────────────────── */}
        <section className="bg-white border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-zinc-900">Your Site</h2>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Site Name <span className="text-red-500">*</span>
            </label>
            <input
              name="siteName"
              type="text"
              required
              placeholder="My Blog"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Site URL <span className="text-red-500">*</span>
            </label>
            <input
              name="siteUrl"
              type="text"
              required
              defaultValue={detectedUrl}
              placeholder="https://yourdomain.com"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-xs text-zinc-400 mt-1">
              Used for absolute links, RSS, and OAuth callbacks. Set this to your production URL before going live.
            </p>
          </div>
        </section>

        {/* ── Section 3: Author Voice ───────────────────────────────────── */}
        <section className="bg-white border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Author Voice</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Optional. Guides the AI writing assistant to match your style. You can update this later in Profile settings.
            </p>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePreset(preset.value)}
                className="group flex flex-col items-start border rounded-lg px-4 py-2.5 text-left hover:border-blue-400 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-sm font-medium text-zinc-800 group-hover:text-blue-700">
                  {preset.label}
                </span>
                <span className="text-xs text-zinc-400 group-hover:text-blue-500">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>

          <textarea
            name="authorVoice"
            rows={4}
            value={authorVoice}
            onChange={e => setAuthorVoice(e.target.value)}
            placeholder="Click a preset above, or write your own voice guide here…"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </section>

        {/* ── Section 4: AI Provider ────────────────────────────────────── */}
        <section className="bg-white border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">AI Provider</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Optional. Connect an AI provider to enable writing assistance. Pugmill works fully without one.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Provider</label>
            <select
              name="aiProvider"
              value={aiProvider}
              onChange={e => handleProviderChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">None</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          {aiProvider && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">API Key</label>
                <div className="flex gap-2">
                  <input
                    name="aiKey"
                    type="password"
                    autoComplete="off"
                    value={aiKey}
                    onChange={e => {
                      setAiKey(e.target.value);
                      setKeyValidState("idle");
                      setKeyValidError(null);
                    }}
                    placeholder={
                      aiProvider === "anthropic"
                        ? "sk-ant-…"
                        : aiProvider === "openai"
                        ? "sk-…"
                        : "AIza…"
                    }
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                      keyValidState === "valid"
                        ? "border-green-400 focus:ring-green-500"
                        : keyValidState === "invalid"
                        ? "border-red-400 focus:ring-red-500"
                        : "focus:ring-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isValidatingKey || !aiKey.trim()}
                    className="shrink-0 border rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isValidatingKey ? "Testing…" : "Test Key"}
                  </button>
                </div>
                {keyValidState === "valid" && (
                  <p className="text-xs text-green-600 mt-1">Key validated successfully.</p>
                )}
                {keyValidState === "invalid" && keyValidError && (
                  <p className="text-xs text-red-600 mt-1">{keyValidError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Model <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  name="aiModel"
                  type="text"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  placeholder={DEFAULT_MODELS[aiProvider] ?? ""}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Leave blank to use the default ({DEFAULT_MODELS[aiProvider]}).
                </p>
              </div>
            </>
          )}
        </section>

        {/* ── Section 5: Security (NEXTAUTH_SECRET) ────────────────────── */}
        {secret && !hideSecret && (
          <section className="bg-white border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Auth Secret</h2>
              <p className="text-sm text-zinc-500 mt-1">
                This secret signs your user sessions. It was auto-generated — you can regenerate it now if you like.
                Copy and save it as <code className="font-mono text-xs bg-zinc-100 px-1 rounded">NEXTAUTH_SECRET</code> in your host&apos;s environment secrets before deploying.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-50 border rounded-lg px-3 py-2 font-mono text-sm text-zinc-700 overflow-x-auto whitespace-nowrap select-all">
                {displayedSecret || <span className="text-zinc-400">Not set</span>}
              </div>
              <button
                type="button"
                onClick={() => setSecretRevealed(r => !r)}
                className="shrink-0 border rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition"
                title={secretRevealed ? "Hide" : "Reveal"}
              >
                {secretRevealed ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!secret}
                className="shrink-0 border rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
                title="Copy to clipboard"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="shrink-0 border rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
                title="Generate new secret"
              >
                <svg
                  className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Save this as <code className="font-mono text-xs">NEXTAUTH_SECRET</code> in your host&apos;s environment secrets. Without it pinned, every new deployment regenerates the secret and signs all users out.
            </p>
          </section>
        )}

        {/* ── Submit ────────────────────────────────────────────────────── */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--ds-blue-1000)] text-white py-3 rounded-full text-sm font-semibold hover:bg-[var(--ds-blue-900)] disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? "Setting up…" : "Launch Pugmill"}
        </button>

        <p className="text-center text-xs text-zinc-400">
          Already have an account?{" "}
          <a href="/admin/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
