import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI" };

import { getConfig } from "@/lib/config";
import { saveAiSettings } from "@/lib/actions/ai";

const PROVIDER_OPTIONS = [
  { value: "", label: "— Disabled —" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "gemini", label: "Google Gemini" },
];

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-1.5-flash",
};

export default async function AiSettingsPage() {
  const config = await getConfig();
  const ai = config.ai;
  const isConfigured = !!(ai.provider && ai.apiKey);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Settings</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Connect an AI provider to unlock writing assistance in the post editor. Leave disabled to use the CMS in manual mode.
        </p>
      </div>

      {isConfigured && (
        <div className="bg-emerald-600 rounded-lg px-4 py-3 text-sm text-white">
          AI assistant is active — provider: <strong>{ai.provider}</strong>
          {ai.model ? `, model: ${ai.model}` : ""}
        </div>
      )}

      <form action={saveAiSettings} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Provider</label>
          <select name="provider" defaultValue={ai.provider ?? ""} className="w-full border rounded px-3 py-2 text-sm bg-white">
            {PROVIDER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">API Key</label>
          {/* Never re-display the stored key — show placeholder if set */}
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={ai.apiKey ? "••••••••••••••••••••••• (leave blank to keep current)" : "Paste your API key"}
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-zinc-400 mt-1">Stored server-side only. Never exposed to the browser.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Model override <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="model"
            type="text"
            defaultValue={ai.model}
            placeholder={ai.provider ? (DEFAULT_MODELS[ai.provider] ?? "") : "e.g. claude-opus-4-6"}
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-zinc-400 mt-1">Leave blank to use the recommended default for your provider.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Hourly call limit <span className="text-zinc-400 font-normal">(per user)</span>
          </label>
          <input
            name="aiRateLimit"
            type="number"
            min={1}
            max={500}
            defaultValue={ai.aiRateLimit ?? 50}
            className="w-32 border rounded px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-zinc-400 mt-1">Maximum AI calls per user per hour. Default: 50. Raise for power users, lower to control costs.</p>
        </div>

        <button type="submit" className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm">
          Save AI Settings
        </button>
      </form>

      <section className="bg-zinc-50 border rounded-lg p-4 text-sm text-zinc-500 space-y-1">
        <p className="font-medium text-zinc-600">Recommended models</p>
        <p>Anthropic: <code className="font-mono">claude-sonnet-4-6</code> or <code className="font-mono">claude-opus-4-6</code></p>
        <p>OpenAI: <code className="font-mono">gpt-4o</code> or <code className="font-mono">gpt-4o-mini</code></p>
        <p>Gemini: <code className="font-mono">gemini-1.5-flash</code> or <code className="font-mono">gemini-1.5-pro</code></p>
      </section>
    </div>
  );
}
