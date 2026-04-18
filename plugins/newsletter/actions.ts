"use server";
import { revalidatePath } from "next/cache";
import { db } from "../../src/lib/db";
import { pluginNewsletterSubscribers } from "./schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "../../src/lib/get-current-user";
import { loadPlugins } from "../../src/lib/plugin-loader";
import { getSubscriberByToken } from "./db";
import { z } from "zod";
import crypto from "crypto";

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Forbidden");
  return user;
}

// ─── Public: subscribe ────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  name:  z.string().max(100).optional(),
});

export async function subscribeNewsletter(
  formData: FormData
): Promise<{ ok: boolean; error?: string; alreadySubscribed?: boolean }> {
  await loadPlugins();

  const parsed = subscribeSchema.safeParse({
    email: formData.get("email"),
    name:  (formData.get("name") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  const { email, name } = parsed.data;
  const token = crypto.randomBytes(32).toString("hex");

  try {
    await db.insert(pluginNewsletterSubscribers).values({
      email:  email.toLowerCase().trim(),
      name:   name?.trim() || null,
      token,
    } as typeof pluginNewsletterSubscribers.$inferInsert).onConflictDoNothing();
  } catch {
    return { ok: false, error: "Could not subscribe. Please try again." };
  }

  // Check if they were already subscribed (onConflictDoNothing silently skips)
  const existingRows = await db
    .select()
    .from(pluginNewsletterSubscribers)
    .where(eq(pluginNewsletterSubscribers.email, email.toLowerCase().trim()))
    .limit(1);
  const existing = existingRows[0] ?? null;
  if (existing?.unsubscribedAt) {
    // Re-subscribe: clear the unsubscribed_at
    await db
      .update(pluginNewsletterSubscribers)
      .set({ unsubscribedAt: null } as Partial<typeof pluginNewsletterSubscribers.$inferInsert>)
      .where(eq(pluginNewsletterSubscribers.email, email.toLowerCase().trim()));
  }

  revalidatePath("/admin/plugins/newsletter");
  return { ok: true };
}

// ─── Public: unsubscribe by token ─────────────────────────────────────────────

export async function unsubscribeByToken(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  await loadPlugins();

  if (!token) return { ok: false, error: "Invalid unsubscribe link." };

  const subscriber = await getSubscriberByToken(token);
  if (!subscriber) return { ok: false, error: "Unsubscribe link not found." };
  if (subscriber.unsubscribedAt) return { ok: true }; // already unsubscribed

  await db
    .update(pluginNewsletterSubscribers)
    .set({ unsubscribedAt: new Date() } as Partial<typeof pluginNewsletterSubscribers.$inferInsert>)
    .where(eq(pluginNewsletterSubscribers.token, token));

  revalidatePath("/admin/plugins/newsletter");
  return { ok: true };
}

// ─── Admin: delete subscriber ─────────────────────────────────────────────────

export async function deleteSubscriber(id: number): Promise<void> {
  await requireAdmin();
  await loadPlugins();
  await db.delete(pluginNewsletterSubscribers).where(eq(pluginNewsletterSubscribers.id, id));
  revalidatePath("/admin/plugins/newsletter");
}
