import { pgTable, serial, text, boolean, integer, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * plugin_webhooks_endpoints
 * One row per registered webhook URL.
 * events: JSON array of ActionCatalogue event names, or ["*"] for all events.
 * secret: HMAC-SHA256 signing secret, stored encrypted via AI_ENCRYPTION_KEY.
 */
export const pluginWebhooksEndpoints = pgTable("plugin_webhooks_endpoints", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  url:       text("url").notNull(),
  /** Encrypted signing secret. Empty string = unsigned. */
  secret:    text("secret").notNull().default(""),
  /** JSON-encoded string[]. ["*"] means all events. */
  events:    text("events").notNull().default('["*"]'),
  active:    boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * plugin_webhooks_deliveries
 * Delivery log — one row per dispatch attempt.
 * Retained for 30 days or 200 rows per endpoint (pruned on each delivery).
 */
export const pluginWebhooksDeliveries = pgTable("plugin_webhooks_deliveries", {
  id:           serial("id").primaryKey(),
  /** Plain integer reference to plugin_webhooks_endpoints.id — no FK constraint per plugin rules. */
  endpointId:   integer("endpoint_id").notNull(),
  event:        varchar("event", { length: 100 }).notNull(),
  /** JSON-stringified payload sent to the endpoint. */
  payload:      text("payload").notNull(),
  status:       varchar("status", { length: 20 }).notNull(), // "success" | "failed"
  responseCode: integer("response_code"),
  error:        text("error"),
  deliveredAt:  timestamp("delivered_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WebhookEndpoint  = typeof pluginWebhooksEndpoints.$inferSelect;
export type WebhookDelivery  = typeof pluginWebhooksDeliveries.$inferSelect;
