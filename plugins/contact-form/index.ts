// PUGMILL_PLUGIN: contact-form
// ============================================================
// Adds a contact form to a designated page (default slug: "contact").
// Submissions are stored in the database. Admins view and manage
// them at /admin/contact, with an unread count badge in the sidebar.
//
// No email infrastructure required — this plugin is self-contained.
// Email delivery can be added as a future enhancement by listening
// to a "contact:after-submit" hook once one is added to the catalogue.
// ============================================================

import type { PugmillPlugin } from "../../src/lib/plugin-registry";
import { db } from "../../src/lib/db";
import { sql, eq } from "drizzle-orm";
import { posts } from "../../src/lib/db/schema";
import { deletePluginNotifications, createNotification } from "../../src/lib/notifications";
import { getUnreadCount } from "./db";
import ContactFormSection from "./components/ContactFormSection";
import ContactFormAdminPage from "./components/AdminPage";

export const contactFormPlugin: PugmillPlugin = {
  id: "contact-form",
  name: "Contact Form",
  version: "1.0.0",
  description: "Adds a contact form to a page created automatically on activation. Submissions are reviewed under Notifications → Contact Form.",

  settingsDefs: [
    {
      key: "pageSlug",
      label: "Page Slug",
      type: "text",
      default: "contact",
      description: "The slug of the page where the contact form appears. A page is created automatically when the plugin is activated.",
    },
    {
      key: "requirePhone",
      label: "Require Phone Number",
      type: "boolean",
      default: false,
      description: "Add a required phone number field to the form.",
    },
    {
      key: "successMessage",
      label: "Success Message",
      type: "text",
      default: "Thank you for your message. We'll be in touch soon.",
      description: "Shown to visitors after a successful submission.",
    },
  ],

  actionHref: "/admin/contact",

  async onActivate(settings) {
    // Create the contact page if it doesn't already exist.
    // Uses onConflictDoNothing so repeated activations or pre-existing pages are safe.
    const pageSlug = (settings.pageSlug as string) || "contact";
    const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, pageSlug)).limit(1);
    if (existing.length === 0) {
      await db.insert(posts).values({
        type: "page",
        title: "Contact",
        slug: pageSlug,
        content: "Have a question or want to work together? Fill in the form below.",
        published: true,
        publishedAt: new Date(),
        featured: false,
        robotsNoindex: false,
        robotsNofollow: false,
      } as typeof posts.$inferInsert).onConflictDoNothing();
      console.log(`[contact-form] Created /${pageSlug} page.`);
    }
  },

  async initialize(_hooks, _settings) {
    // Sync the unread notification badge on startup.
    const unread = await getUnreadCount();
    if (unread > 0) {
      await createNotification({
        pluginId: "contact-form",
        message: `${unread} unread contact form submission${unread === 1 ? "" : "s"}.`,
        href: "/admin/contact",
        replaceKey: "contact-form:unread",
        itemCount: unread,
      });
    }
  },

  schema: {
    async migrate() {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_contact_form_submissions (
          id         SERIAL PRIMARY KEY,
          name       VARCHAR(100) NOT NULL,
          email      VARCHAR(255) NOT NULL,
          phone      VARCHAR(50),
          message    TEXT NOT NULL,
          read       BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    },
    async teardown() {
      await db.execute(sql`DROP TABLE IF EXISTS plugin_contact_form_submissions`);
      await deletePluginNotifications("contact-form");
    },
  },

  slots: {
    postFooter: ContactFormSection,
  },

  adminPage: ContactFormAdminPage,
};
