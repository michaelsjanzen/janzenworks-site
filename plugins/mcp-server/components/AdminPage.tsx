import { detectSiteUrl } from "../../../src/lib/detect-site-url";
import { ALL_TOOLS } from "../tools";
import McpKeyGenerator from "./McpKeyGenerator";

/**
 * Resolves the canonical URL for the MCP endpoint by following any redirect.
 * Common case: a custom domain redirects non-www → www (or vice versa).
 * MCP clients don't follow redirects when POSTing, so we must use the final URL.
 *
 * Returns the resolved URL and whether a redirect was detected.
 * Times out after 3 s and falls back to the original URL on any error.
 */
async function resolveCanonicalMcpUrl(url: string): Promise<{
  resolvedUrl: string;
  redirectedFrom: string | null;
}> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        // location is the full redirect URL (e.g. https://www.janzenworks.com/api/mcp)
        // Normalise to ensure no trailing slash issues.
        const resolved = location.replace(/\/+$/, "");
        return { resolvedUrl: resolved, redirectedFrom: url };
      }
    }
  } catch {
    // Timeout, network error, or self-referential fetch blocked — use original.
  }
  return { resolvedUrl: url, redirectedFrom: null };
}

export default async function AdminPage(
  _props: { searchParams: Record<string, string | string[] | undefined> }
) {
  const detectedUrl = detectSiteUrl() ?? "https://your-site.com";
  const rawMcpUrl = `${detectedUrl}/api/mcp`;

  const { resolvedUrl: mcpUrl, redirectedFrom } = await resolveCanonicalMcpUrl(rawMcpUrl);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">MCP Server</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Connects Claude Desktop, Cursor, and any MCP-compatible agent to this CMS.
          AI agents can read and write content using natural language via the MCP protocol.
        </p>
      </div>

      {/* Connection details */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">Connection details</h2>
        </div>
        <div className="px-6 py-5 space-y-6">

          {/* Redirect notice */}
          {redirectedFrom && (
            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
              <div className="text-xs text-blue-800 space-y-1">
                <p className="font-medium">Canonical URL auto-detected</p>
                <p>
                  <code className="font-mono bg-blue-100 px-1 rounded">{redirectedFrom}</code>{" "}
                  redirects to{" "}
                  <code className="font-mono bg-blue-100 px-1 rounded">{mcpUrl}</code>.
                  MCP clients don&apos;t re-POST after a redirect, so the config below uses the
                  canonical URL automatically.
                </p>
                <p className="text-blue-600">
                  To fix this permanently, update <code className="font-mono bg-blue-100 px-1 rounded">NEXTAUTH_URL</code> in
                  your environment variables to <code className="font-mono bg-blue-100 px-1 rounded">{mcpUrl.replace("/api/mcp", "")}</code>.
                </p>
              </div>
            </div>
          )}

          {/* MCP URL */}
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
              MCP endpoint URL
            </p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 font-mono text-sm text-zinc-700 select-all">
              {mcpUrl}
            </div>
          </div>

          {/* Key generator + config snippet */}
          <McpKeyGenerator mcpUrl={mcpUrl} />

        </div>
      </div>

      {/* Tools listing */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">
            Available tools{" "}
            <span className="text-zinc-400 font-normal">({ALL_TOOLS.length})</span>
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Tool</th>
              <th className="px-6 py-3 text-left font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ALL_TOOLS.map((tool) => (
              <tr key={tool.definition.name} className="hover:bg-zinc-50">
                <td className="px-6 py-3 font-mono text-xs text-zinc-700 whitespace-nowrap">
                  {tool.definition.name}
                </td>
                <td className="px-6 py-3 text-zinc-500 text-xs">
                  {tool.definition.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Setup guide */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-700">Setup guide</h3>
        <ol className="space-y-3 text-xs text-zinc-500 list-decimal list-inside">
          <li>
            <span className="font-medium text-zinc-600">Generate a key</span> — use the form above.
            Give it a name like &ldquo;Claude Desktop&rdquo; so you can identify it later.
          </li>
          <li>
            <span className="font-medium text-zinc-600">Copy the config snippet</span> — click Copy
            once the key is filled in.
          </li>
          <li>
            <span className="font-medium text-zinc-600">Claude Desktop</span> — open{" "}
            <code className="font-mono bg-zinc-100 px-1 rounded">claude_desktop_config.json</code>{" "}
            (Settings → Developer → Edit Config) and paste the snippet into the{" "}
            <code className="font-mono bg-zinc-100 px-1 rounded">mcpServers</code> object, then restart Claude.
          </li>
          <li>
            <span className="font-medium text-zinc-600">Cursor / other clients</span> — add the URL
            and Bearer token to your client&apos;s MCP settings. The endpoint accepts any
            MCP 2025-03-26 compatible client.
          </li>
        </ol>

        <div className="border-t border-zinc-200 pt-4 space-y-2">
          <p className="text-xs font-medium text-zinc-600">Troubleshooting</p>
          <ul className="space-y-1.5 text-xs text-zinc-500 list-disc list-inside">
            <li>
              <span className="font-medium text-zinc-600">Getting &ldquo;Redirecting…&rdquo; instead of a response?</span>{" "}
              Your domain likely redirects www ↔ non-www. MCP clients don&apos;t re-POST after a redirect.
              This page auto-detects and corrects the URL — if you see the blue notice above, copy the corrected URL.
              Permanently fix it by updating <code className="font-mono bg-zinc-100 px-1 rounded">NEXTAUTH_URL</code> to
              your canonical domain.
            </li>
            <li>
              <span className="font-medium text-zinc-600">401 Unauthorized?</span>{" "}
              The Bearer token is invalid or revoked. Generate a new key above.
            </li>
            <li>
              <span className="font-medium text-zinc-600">404 / plugin not active?</span>{" "}
              Ensure the MCP Server plugin is toggled on in{" "}
              <a href="/admin/plugins" className="underline hover:text-zinc-700">Plugins</a>.
            </li>
          </ul>
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <p className="text-xs font-medium text-zinc-600 mb-1">Protocol</p>
          <p className="text-xs text-zinc-500">
            Stateless HTTP POST · JSON-RPC 2.0 · MCP 2025-03-26 ·{" "}
            <code className="font-mono bg-zinc-100 px-1 rounded">Authorization: Bearer pm_...</code>
          </p>
        </div>
      </div>
    </div>
  );
}
