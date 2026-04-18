import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * plugin_newsletter_subscribers
 * One row per subscriber. Single opt-in — active immediately on subscribe.
 * token: random hex used in unsubscribe links. Permanent per subscriber.
 * unsubscribedAt: null = active, set = unsubscribed (row kept for audit trail).
 */
export const pluginNewsletterSubscribers = pgTable("plugin_newsletter_subscribers", {
  id:             serial("id").primaryKey(),
  email:          text("email").notNull().unique(),
  name:           text("name"),
  /** Random 64-char hex token embedded in unsubscribe links. */
  token:          text("token").notNull().unique(),
  subscribedAt:   timestamp("subscribed_at", { withTimezone: true }).defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

/**
 * plugin_newsletter_sends
 * One row per send campaign (auto or manual).
 * postId: plain integer — no FK constraint to core posts table.
 */
export const pluginNewsletterSends = pgTable("plugin_newsletter_sends", {
  id:             serial("id").primaryKey(),
  /** Core post ID. Plain integer — no FK constraint. */
  postId:         integer("post_id"),
  subject:        text("subject").notNull(),
  sentAt:         timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  successCount:   integer("success_count").notNull().default(0),
  failCount:      integer("fail_count").notNull().default(0),
});

export type NewsletterSubscriber = typeof pluginNewsletterSubscribers.$inferSelect;
export type NewsletterSend       = typeof pluginNewsletterSends.$inferSelect;
