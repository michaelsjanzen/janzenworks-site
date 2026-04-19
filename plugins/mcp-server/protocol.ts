/**
 * MCP JSON-RPC 2.0 protocol types and response helpers.
 *
 * Implements the Model Context Protocol (MCP) wire format directly
 * with no external SDK dependency — the protocol is simple enough
 * to implement inline.
 *
 * Spec ref: https://spec.modelcontextprotocol.io/specification/2025-03-26/
 */

// ─── JSON-RPC 2.0 types ───────────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

// ─── MCP-specific types ───────────────────────────────────────────────────────

export interface McpToolContent {
  type: "text";
  text: string;
}

export interface McpToolResult {
  content: McpToolContent[];
  isError?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ─── JSON-RPC error codes ─────────────────────────────────────────────────────

export const RPC_PARSE_ERROR      = -32700;
export const RPC_INVALID_REQUEST  = -32600;
export const RPC_METHOD_NOT_FOUND = -32601;
export const RPC_INVALID_PARAMS   = -32602;
export const RPC_INTERNAL_ERROR   = -32603;

// ─── Response helpers ─────────────────────────────────────────────────────────

export function rpcSuccess(id: string | number | null, result: unknown): JsonRpcSuccessResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  };
}

export function toolSuccess(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

export function toolError(message: string): McpToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

// ─── Request helpers ──────────────────────────────────────────────────────────

/**
 * Returns true when the request is a JSON-RPC notification (no id field).
 * Notifications must not receive a response.
 */
export function isNotification(req: JsonRpcRequest): boolean {
  return req.id === undefined;
}

/**
 * Safely extract the id from a parsed body that may or may not be a valid request.
 * Guaranteed to return null rather than throw.
 */
export function extractId(body: unknown): string | number | null {
  if (body && typeof body === "object" && "id" in body) {
    const id = (body as Record<string, unknown>).id;
    if (typeof id === "string" || typeof id === "number") return id;
  }
  return null;
}
