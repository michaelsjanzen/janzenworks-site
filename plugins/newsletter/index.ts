import type { PugmillPlugin, PluginSettings } from "../../src/lib/plugin-registry";
import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";
import { pluginNewsletterSends } from "./schema";
import { getActiveSubscribers } from "./db";
import type { PostPayload } from "../../src/lib/hook-catalogue";
import AdminPage from "./components/AdminPage";
import { subscribeWidget } from "./widgets/subscribe";

/**
 * Send the newsletter to all active subscribers for a given post.
 * Awaited inside the hook — ensures delivery completes before the
 * serverless function returns. Never throws; errors are logged only.
 */
async function sendNewsletter(post: PostPayload, settings: PluginSettings): Promise<void> {
  try {
    const { sendEmail } = await import("../../src/lib/email");
    const { getConfig }  = await import("../../src/lib/config");

    const config     = await getConfig();
    const siteUrl    = config.site.url.replace(/\/$/, "");
    const replyTo    = (settings.replyTo as string) || config.email?.toAddress || undefined;

    // Build the post URL — posts live at /post/[slug], pages at /[slug]
    const postUrl = post.type === "page"
      ? `${siteUrl}/${post.slug}`
      : `${siteUrl}/post/${post.slug}`;

    const subject     = post.title;
    const subscribers = await getActiveSubscribers();
    if (subscribers.length === 0) return;

    let successCount = 0;
    let failCount    = 0;

    // Send to each subscriber with their personal unsubscribe link
    await Promise.allSettled(
      subscribers.map(async (subscriber) => {
        const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${subscriber.token}`;
        const result = await sendEmail({
          to:      subscriber.email,
          subject,
          replyTo,
          text: [
            post.title,
            "",
            `Read: ${postUrl}`,
            "",
            "---",
            `Unsubscribe: ${unsubscribeUrl}`,
          ].join("\n"),
          html: [
            `<h2>${post.title}</h2>`,
            `<p><a href="${postUrl}">Read the full post →</a></p>`,
            `<hr>`,
            `<p style="font-size:12px;color:#666;">`,
            `  <a href="${unsubscribeUrl}">Unsubscribe</a> from this list.`,
            `</p>`,
          ].join("\n"),
        });

        if (result.ok) { successCount++; } else { failCount++; }
      })
    );

    // Log the send campaign
    await db.insert(pluginNewsletterSends).values({
      postId:         post.id,
      subject,
      recipientCount: subscribers.length,
      successCount,
      failCount,
    } as typeof pluginNewsletterSends.$inferInsert);

  } catch (err) {
    console.error("[newsletter] Auto-send failed:", err);
  }
}

export const newsletterPlugin: PugmillPlugin = {
  id:          "newsletter",
  name:        "Newsletter",
  version:     "1.0.0",
  description: "Self-managed subscriber list. Sends new posts to subscribers via Settings → Email when a post is published.",

  settingsDefs: [
    {
      key:         "sendOnPublish",
      label:       "Auto-send on publish",
      type:        "boolean",
      default:     true,
      description: "Automatically email subscribers when a post is published. Requires an email provider in Settings → Email.",
    },
    {
      key:         "replyTo",
      label:       "Reply-to address",
      type:        "text",
      default:     "",
      description: "Optional. Defaults to the notification address in Settings → Email.",
    },
  ],

  schema: {
    async migrate() {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_newsletter_subscribers (
          id               SERIAL PRIMARY KEY,
          email            TEXT NOT NULL UNIQUE,
          name             TEXT,
          token            TEXT NOT NULL UNIQUE,
          subscribed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          unsubscribed_at  TIMESTAMPTZ
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS plugin_newsletter_subscribers_token_idx
          ON plugin_newsletter_subscribers (token)
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_newsletter_sends (
          id               SERIAL PRIMARY KEY,
          post_id          INTEGER,
          subject          TEXT NOT NULL,
          sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          recipient_count  INTEGER NOT NULL DEFAULT 0,
          success_count    INTEGER NOT NULL DEFAULT 0,
          fail_count       INTEGER NOT NULL DEFAULT 0
        )
      `);
    },
    async teardown() {
      await db.execute(sql`DROP TABLE IF EXISTS plugin_newsletter_sends`);
      await db.execute(sql`DROP TABLE IF EXISTS plugin_newsletter_subscribers`);
    },
  },

  adminPage: AdminPage,

  widgets: [subscribeWidget],

  async initialize(hooks, settings) {
    hooks.addAction("post:after-publish", async ({ post }) => {
      const sendOnPublish = settings.sendOnPublish !== false; // default true
      if (!sendOnPublish) return;
      // Awaited — ensures delivery completes before the serverless function exits.
      await sendNewsletter(post, settings);
    });
  },
};
