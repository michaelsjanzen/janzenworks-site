import { db } from "../../src/lib/db";
import { desc, isNull, eq } from "drizzle-orm";
import { pluginNewsletterSubscribers, pluginNewsletterSends } from "./schema";
import { posts } from "../../src/lib/db/schema";

/** Active (non-unsubscribed) subscribers. */
export function getActiveSubscribers() {
  return db
    .select()
    .from(pluginNewsletterSubscribers)
    .where(isNull(pluginNewsletterSubscribers.unsubscribedAt))
    .orderBy(desc(pluginNewsletterSubscribers.subscribedAt));
}

/** All subscribers including unsubscribed (for the admin list). */
export function getAllSubscribers() {
  return db
    .select()
    .from(pluginNewsletterSubscribers)
    .orderBy(desc(pluginNewsletterSubscribers.subscribedAt));
}

/** Find subscriber by their unsubscribe token. */
export async function getSubscriberByToken(token: string) {
  const rows = await db
    .select()
    .from(pluginNewsletterSubscribers)
    .where(eq(pluginNewsletterSubscribers.token, token))
    .limit(1);
  return rows[0] ?? null;
}

/** Recent send history, newest first. */
export function getRecentSends(limit = 20) {
  return db
    .select()
    .from(pluginNewsletterSends)
    .orderBy(desc(pluginNewsletterSends.sentAt))
    .limit(limit);
}

/** Recent published posts for the manual send picker, newest first. */
export function getRecentPublishedPosts(limit = 30) {
  return db
    .select({
      id:    posts.id,
      title: posts.title,
      slug:  posts.slug,
      type:  posts.type,
    })
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}
