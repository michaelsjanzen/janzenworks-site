import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * plugin_contact_form_submissions — stores all contact form submissions.
 *
 * Rules followed:
 *  - Table name: plugin_<id>_<tablename> with hyphen in id sanitized to underscore
 *    ("contact-form" → "contact_form") to produce a valid unquoted SQL identifier.
 *  - No FK constraints to core tables.
 */
export const pluginContactFormSubmissions = pgTable("plugin_contact_form_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  /** Null when showPhone is false or visitor left it blank. */
  phone: varchar("phone", { length: 50 }),
  /** Null when showSocialUrl is false or visitor left it blank. */
  socialUrl: varchar("social_url", { length: 500 }),
  message: text("message").notNull(),
  /** false until an admin views or explicitly marks as read. */
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubmissionRow = typeof pluginContactFormSubmissions.$inferSelect;
export type SubmissionInsert = typeof pluginContactFormSubmissions.$inferInsert;
