import type { PugmillPlugin } from "../../src/lib/plugin-registry";
import AdminPage from "./components/AdminPage";

export const mcpServerPlugin: PugmillPlugin = {
  id:          "mcp-server",
  name:        "MCP Server",
  version:     "1.0.0",
  description: "Exposes this CMS as an MCP server. Connect Claude Desktop, Cursor, or any MCP-compatible AI agent to read and write content.",

  adminPage: AdminPage,

  async initialize(_hooks) {
    // No hooks needed — the HTTP endpoint at /api/mcp handles everything.
  },
};
