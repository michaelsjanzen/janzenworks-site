import { db } from "../../src/lib/db";
import { sql, eq, desc } from "drizzle-orm";
import { pluginWebhooksEndpoints, pluginWebhooksDeliveries } from "./schema";

/** All active endpoints whose event list includes `event` or "*". */
export async function getEndpointsForEvent(event: string): Promise<typeof pluginWebhooksEndpoints.$inferSelect[]> {
  const rows = await db
    .select()
    .from(pluginWebhooksEndpoints)
    .where(eq(pluginWebhooksEndpoints.active, true));

  return rows.filter((row) => {
    try {
      const events: string[] = JSON.parse(row.events);
      return events.includes("*") || events.includes(event);
    } catch {
      return false;
    }
  });
}

/** All endpoints (active + inactive) for the admin page. */
export async function getAllEndpoints() {
  return db
    .select()
    .from(pluginWebhooksEndpoints)
    .orderBy(pluginWebhooksEndpoints.createdAt);
}

/** Recent deliveries for a given endpoint, newest first. */
export async function getDeliveries(endpointId: number, limit = 20) {
  return db
    .select()
    .from(pluginWebhooksDeliveries)
    .where(eq(pluginWebhooksDeliveries.endpointId, endpointId))
    .orderBy(desc(pluginWebhooksDeliveries.deliveredAt))
    .limit(limit);
}

/** Recent deliveries across all endpoints (for overview). */
export async function getRecentDeliveries(limit = 30) {
  return db
    .select()
    .from(pluginWebhooksDeliveries)
    .orderBy(desc(pluginWebhooksDeliveries.deliveredAt))
    .limit(limit);
}

/** Log a delivery result and prune old rows for this endpoint. */
export async function logDelivery(entry: {
  endpointId: number;
  event: string;
  payload: string;
  status: "success" | "failed";
  responseCode?: number;
  error?: string;
}) {
  await db.insert(pluginWebhooksDeliveries).values({
    endpointId:   entry.endpointId,
    event:        entry.event,
    payload:      entry.payload,
    status:       entry.status,
    responseCode: entry.responseCode ?? null,
    error:        entry.error ?? null,
  } as typeof pluginWebhooksDeliveries.$inferInsert);

  // Prune: keep last 200 deliveries per endpoint and drop anything older than 30 days.
  void db.execute(sql`
    DELETE FROM plugin_webhooks_deliveries
    WHERE endpoint_id = ${entry.endpointId}
      AND id NOT IN (
        SELECT id FROM plugin_webhooks_deliveries
        WHERE endpoint_id = ${entry.endpointId}
        ORDER BY delivered_at DESC
        LIMIT 200
      )
  `);
  void db.execute(sql`
    DELETE FROM plugin_webhooks_deliveries
    WHERE delivered_at < NOW() - INTERVAL '30 days'
  `);
}
