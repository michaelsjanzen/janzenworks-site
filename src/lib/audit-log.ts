/**
 * Audit log — records admin actions to the database.
 * Helps trace who did what and when in case of incident.
 *
 * USAGE
 *   import { auditLog } from "@/lib/audit-log";
 *   auditLog({ action: "post.create", userId: user.id, resourceId: post.id, detail: "slug: my-post" });
 *
 * The call is synchronous from the caller's perspective — the DB write happens
 * fire-and-forget in the background and never blocks the main operation.
 * If the write fails, it falls back to a structured console.log so the entry
 * is still captured by log aggregators.
 *
 * READING THE LOG
 *   Entries are in the `audit_logs` table.
 *   An admin UI can be added at /admin/audit-log once the volume warrants it.
 */

import { db } from "./db";
import { auditLogs } from "./db/schema";
import { sql } from "drizzle-orm";

export type AuditAction =
  | "post.create" | "post.update" | "post.delete"
  | "media.upload" | "media.delete"
  | "plugin.activate" | "plugin.deactivate" | "plugin.settings_update" | "plugin.uninstall"
  | "user.login" | "user.logout" | "user.create" | "user.update" | "user.delete"
  | "settings.update"
  | "post.publish_scheduled"
  | "design.draft_save" | "design.publish" | "design.draft_discard" | "design.structural_save"
  | "comment.approve" | "comment.delete"
  | "contact.submission_delete"
  | "api_key.create" | "api_key.revoke"
  | "network.report_sent" | "network.report_skipped" | "network.report_error";

interface AuditEntry {
  action: AuditAction;
  userId?: string | number;
  resourceId?: string | number;
  detail?: string;
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

let schemaEnsured = false;

/**
 * Idempotently create the audit_logs table.
 * Called from loadPlugins() on every cold start — safe to run repeatedly.
 */
export async function ensureAuditLogSchema(): Promise<void> {
  if (schemaEnsured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          SERIAL PRIMARY KEY,
      action      VARCHAR(100) NOT NULL,
      user_id     TEXT,
      resource_id TEXT,
      detail      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  schemaEnsured = true;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Record an admin action. Fire-and-forget — never throws, never blocks.
 * Falls back to console.log if the DB write fails (e.g. on cold starts where
 * ensureAuditLogSchema() has not yet run for this request). The entry is still
 * captured by log aggregators in that case.
 */
export function auditLog(entry: AuditEntry): void {
  const userId = entry.userId !== undefined ? String(entry.userId) : null;
  const resourceId = entry.resourceId !== undefined ? String(entry.resourceId) : null;

  db.insert(auditLogs)
    .values({
      action: entry.action,
      userId,
      resourceId,
      detail: entry.detail ?? null,
    } as typeof auditLogs.$inferInsert)
    .catch((err) => {
      // Fallback: structured log for aggregators if DB write fails.
      // Use console.error so log aggregators treat this as an error-level event.
      console.error(`[AUDIT_FALLBACK] ${JSON.stringify({
        action: entry.action,
        userId,
        resourceId,
        detail: entry.detail,
        createdAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      })}`);
    });
}
