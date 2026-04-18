"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { themeDesignConfigs, widgetSettings } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getCurrentUser } from "@/lib/get-current-user";
import { invalidateDesignCache } from "@/lib/design-config";
import { auditLog } from "@/lib/audit-log";
import { ensureWidgetSettingsSchema } from "@/lib/widget-schema";
import { z } from "zod";

// Max length for a single design token value (CSS value, colour hex, font name, etc.)
// The regex blocks CSS injection characters: semicolons break out of the declaration,
// braces close/open rule blocks, @ starts at-rules, and < > prevent HTML injection.
const designTokenValue = z
  .string()
  .max(500)
  .regex(/^[^;{}@<>\\]*$/, "Invalid characters in CSS token value");

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: admin role required.");
  }
  return user.id;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Save all token values from the unified Design form as a draft.
 * Uses an upsert so only one draft row per theme ever exists in the DB.
 */
export async function saveDesignDraft(formData: FormData): Promise<void> {
  const userId = await requireAdmin();

  const config = await getConfig();
  const themeId = sanitizeThemeName(config.appearance.activeTheme);

  // Build config object from formData — skip Next.js internal keys; cap value length.
  const tokenConfig: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION") || key.startsWith("_")) continue;
    const parsed = designTokenValue.safeParse(String(value));
    if (!parsed.success) continue; // silently drop over-length values
    tokenConfig[key] = parsed.data;
  }

  // Merge into the existing draft so canvas auto-saves (hero, feed) aren't wiped.
  const existing = await db
    .select({ config: themeDesignConfigs.config })
    .from(themeDesignConfigs)
    .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "draft")))
    .limit(1);
  const merged = { ...(existing[0]?.config as Record<string, string> ?? {}), ...tokenConfig };

  await db
    .insert(themeDesignConfigs)
    .values({
      themeId,
      status: "draft",
      config: merged,
    } as typeof themeDesignConfigs.$inferInsert)
    .onConflictDoUpdate({
      target: [themeDesignConfigs.themeId, themeDesignConfigs.status],
      // Match the partial unique index (covers only 'draft' and 'published').
      targetWhere: sql`status IN ('draft', 'published')`,
      set: {
        config: merged,
        updatedAt: sql`NOW()`,
      } as unknown as Partial<typeof themeDesignConfigs.$inferInsert>,
    });

  invalidateDesignCache(themeId);
  revalidatePath("/admin/design", "layout");

  auditLog({ action: "design.draft_save", userId, detail: `theme=${themeId}` });

  redirect("/admin/design");
}

/**
 * Publish the current draft.
 * Guards that a draft exists, then atomically archives the current published
 * row and promotes the draft to published within a single transaction.
 */
export async function publishDesign(): Promise<void> {
  const userId = await requireAdmin();

  const config = await getConfig();
  const themeId = sanitizeThemeName(config.appearance.activeTheme);

  let published = false;
  let publishedWidgetConfig: Record<string, string> = {};

  await db.transaction(async (tx) => {
    // Guard: verify a draft exists before touching the published row.
    const [draftRows, publishedRows] = await Promise.all([
      tx.select({ id: themeDesignConfigs.id, config: themeDesignConfigs.config })
        .from(themeDesignConfigs)
        .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "draft")))
        .limit(1),
      tx.select({ config: themeDesignConfigs.config })
        .from(themeDesignConfigs)
        .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "published")))
        .limit(1),
    ]);

    if (draftRows.length === 0) {
      // No draft to publish — abort without touching anything.
      return;
    }

    // Archive any existing published rows.
    await tx
      .update(themeDesignConfigs)
      .set({ status: "archived" } as Partial<typeof themeDesignConfigs.$inferInsert>)
      .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "published")));

    // Promote draft → published. Use the entire old published config as the base
    // so any key not touched in this draft session is preserved. Draft values
    // take precedence — any key the draft explicitly set overwrites the old value.
    const oldPublishedConfig = (publishedRows[0]?.config ?? {}) as Record<string, string>;
    const draftConfig = (draftRows[0].config ?? {}) as Record<string, string>;
    const mergedConfig = { ...oldPublishedConfig, ...draftConfig };

    // Capture widget area entries so we can flush them to widget_settings
    // after the transaction completes.
    publishedWidgetConfig = Object.fromEntries(
      Object.entries(mergedConfig).filter(([k]) => k.startsWith("widgetArea:"))
    );

    await tx
      .update(themeDesignConfigs)
      .set({
        status: "published",
        config: mergedConfig,
      } as Partial<typeof themeDesignConfigs.$inferInsert>)
      .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "draft")));

    published = true;
  });

  if (!published) {
    // No draft existed — nothing changed, go back without a misleading toast.
    redirect("/admin/design");
  }

  // Safety net: delete any draft row that a concurrent auto-save may have
  // inserted between the transaction completing and this point. Component
  // unmount clears pending debounce timers, but a server action already
  // in-flight on the server cannot be cancelled client-side.
  await db
    .delete(themeDesignConfigs)
    .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "draft")));

  // Flush widget area assignments from the published config into widget_settings
  // so the public site and widget renderers pick them up immediately.
  if (Object.keys(publishedWidgetConfig).length > 0) {
    await ensureWidgetSettingsSchema();
    await Promise.all(
      Object.entries(publishedWidgetConfig).map(([key, value]) => {
        const areaId = key.replace(/^widgetArea:/, "");
        return db
          .insert(widgetSettings)
          .values({ widgetId: `area:${areaId}`, key: "widgets", value } as typeof widgetSettings.$inferInsert)
          .onConflictDoUpdate({
            target: [widgetSettings.widgetId, widgetSettings.key],
            set: { value },
          });
      })
    );
  }

  invalidateDesignCache(themeId);
  revalidatePath("/", "layout");
  revalidatePath("/admin/design", "layout");

  auditLog({ action: "design.publish", userId, detail: `theme=${themeId}` });

  redirect("/admin/design");
}

/**
 * Merge a partial config object into the existing draft without touching other keys.
 * Used by the HeroCanvas auto-save so hero edits don't clobber color/typography drafts.
 */
export async function savePartialDesignDraft(
  partial: Record<string, string>
): Promise<void> {
  await requireAdmin();

  const siteConfig = await getConfig();
  const themeId = sanitizeThemeName(siteConfig.appearance.activeTheme);

  // Fetch existing draft so we can merge rather than replace.
  const existing = await db
    .select({ config: themeDesignConfigs.config })
    .from(themeDesignConfigs)
    .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "draft")))
    .limit(1);

  const existingConfig = (existing[0]?.config ?? {}) as Record<string, string>;
  const merged = { ...existingConfig, ...partial };

  await db
    .insert(themeDesignConfigs)
    .values({
      themeId,
      status: "draft",
      config: merged,
    } as typeof themeDesignConfigs.$inferInsert)
    .onConflictDoUpdate({
      target: [themeDesignConfigs.themeId, themeDesignConfigs.status],
      targetWhere: sql`status IN ('draft', 'published')`,
      set: {
        config: merged,
        updatedAt: sql`NOW()`,
      } as unknown as Partial<typeof themeDesignConfigs.$inferInsert>,
    });

  invalidateDesignCache(themeId);
  revalidatePath("/admin/design", "layout");
}

/**
 * Write structural layout tokens (those with immediatePublish: true) directly
 * to both the published and draft configs.
 *
 * Published: takes effect on the public site immediately (no publish step needed).
 * Draft: ensures structural values are present when the draft is eventually
 *        published, preventing them from reverting to defaults.
 */
export async function saveStructuralDesignTokens(
  partial: Record<string, string>
): Promise<void> {
  const userId = await requireAdmin();

  const siteConfig = await getConfig();
  const themeId = sanitizeThemeName(siteConfig.appearance.activeTheme);

  // Fetch existing published and draft rows in parallel.
  const [existingPublished, existingDraft] = await Promise.all([
    db.select({ config: themeDesignConfigs.config })
      .from(themeDesignConfigs)
      .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "published")))
      .limit(1),
    db.select({ config: themeDesignConfigs.config })
      .from(themeDesignConfigs)
      .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "draft")))
      .limit(1),
  ]);

  const mergedPublished = { ...(existingPublished[0]?.config as Record<string, string> ?? {}), ...partial };

  // Always write to published (immediate effect on the live site).
  // Only update an existing draft — never create one — so structural token
  // changes don't produce a phantom draft that triggers the banner when the
  // user has no pending aesthetic changes.
  const writes: Promise<unknown>[] = [
    db.insert(themeDesignConfigs)
      .values({ themeId, status: "published", config: mergedPublished } as typeof themeDesignConfigs.$inferInsert)
      .onConflictDoUpdate({
        target: [themeDesignConfigs.themeId, themeDesignConfigs.status],
        targetWhere: sql`status IN ('draft', 'published')`,
        set: { config: mergedPublished, updatedAt: sql`NOW()` } as unknown as Partial<typeof themeDesignConfigs.$inferInsert>,
      }),
  ];

  if (existingDraft.length > 0) {
    const mergedDraft = { ...(existingDraft[0].config as Record<string, string> ?? {}), ...partial };
    writes.push(
      db.update(themeDesignConfigs)
        .set({ config: mergedDraft, updatedAt: sql`NOW()` } as unknown as Partial<typeof themeDesignConfigs.$inferInsert>)
        .where(and(eq(themeDesignConfigs.themeId, themeId), eq(themeDesignConfigs.status, "draft")))
    );
  }

  await Promise.all(writes);

  invalidateDesignCache(themeId);
  revalidatePath("/", "layout");
  revalidatePath("/admin/design", "layout");

  auditLog({ action: "design.structural_save", userId, detail: `theme=${themeId} keys=${Object.keys(partial).join(",")}` });
}

/**
 * Discard the current draft, restoring the published config as the live preview.
 * No-ops silently (no toast) if no draft exists.
 */
export async function discardDraft(): Promise<void> {
  const userId = await requireAdmin();

  const config = await getConfig();
  const themeId = sanitizeThemeName(config.appearance.activeTheme);

  // Guard: verify a draft exists before touching anything.
  const draftRows = await db
    .select({ id: themeDesignConfigs.id })
    .from(themeDesignConfigs)
    .where(
      and(
        eq(themeDesignConfigs.themeId, themeId),
        eq(themeDesignConfigs.status, "draft")
      )
    )
    .limit(1);

  if (draftRows.length === 0) {
    redirect("/admin/design");
  }

  await db
    .delete(themeDesignConfigs)
    .where(
      and(
        eq(themeDesignConfigs.themeId, themeId),
        eq(themeDesignConfigs.status, "draft")
      )
    );

  invalidateDesignCache(themeId);
  revalidatePath("/admin/design", "layout");

  auditLog({ action: "design.draft_discard", userId, detail: `theme=${themeId}` });

  redirect("/admin/design");
}

/**
 * Save a widget area assignment into the design draft so it participates
 * in the standard draft → publish cycle.
 * Stored as key `widgetArea:<areaId>` in the draft config.
 */
export async function saveWidgetAreaDraft(
  areaId: string,
  widgetIds: string[]
): Promise<void> {
  await savePartialDesignDraft({ [`widgetArea:${areaId}`]: widgetIds.join(",") });
}
