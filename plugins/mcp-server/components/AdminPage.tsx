import { detectSiteUrl } from "../../../src/lib/detect-site-url";
import { ALL_TOOLS } from "../tools";
import McpKeyGenerator from "./McpKeyGenerator";

export default async function AdminPage(
  _props: { searchParams: Record<string, string | string[] | undefined> }
) {
  const detectedUrl = detectSiteUrl() ?? "https://your-site.com";
  const mcpUrl = `${detectedUrl}/api/mcp`;

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

      {/* Protocol note */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-700">Protocol</h3>
        <p className="text-xs text-zinc-500">
          This server implements{" "}
          <strong className="font-medium text-zinc-600">MCP 2025-03-26</strong>{" "}
          (Model Context Protocol) over stateless HTTP POST. Each request is a JSON-RPC 2.0
          message; responses follow the same format. Authentication uses{" "}
          <code className="font-mono bg-zinc-100 px-1 rounded">Authorization: Bearer pm_...</code>{" "}
          headers — the same API keys used by the REST API.
        </p>
      </div>
    </div>
  );
}
