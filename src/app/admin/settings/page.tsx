import type { Metadata } from "next";

export const metadata: Metadata = { title: "Site Identity" };

import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getConfig, updateConfig } from "@/lib/config";
import { detectSiteUrl, isDevUrl } from "@/lib/detect-site-url";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageShell, Field, SaveButton, ToggleField } from "./_components";
import MediaUrlPicker from "@/components/admin/MediaUrlPicker";
import IdentityModeRadio from "./IdentityModeRadio";

export default async function SiteIdentityPage({ searchParams }: { searchParams: Promise<{ toast?: string }> }) {
  const [config, sp, allMedia] = await Promise.all([
    getConfig(),
    searchParams,
    db.select({ id: media.id, url: media.url, fileName: media.fileName })
      .from(media)
      .orderBy(desc(media.createdAt)),
  ]);
  const saved = sp.toast === "saved";

  async function saveIdentity(formData: FormData) {
    "use server";
    const current = await getConfig();
    const headerIdentityRaw = formData.get("headerIdentity") as string;
    const headerIdentity =
      headerIdentityRaw === "name-only" || headerIdentityRaw === "logo-and-name"
        ? headerIdentityRaw
        : "logo-only";
    await updateConfig({
      ...current,
      site: {
        ...current.site,
        name: (formData.get("siteName") as string) || current.site.name,
        description: (formData.get("siteDescription") as string) || current.site.description,
        logo: (formData.get("logo") as string) || undefined,
        favicon: (formData.get("favicon") as string) || undefined,
        headerIdentity,
        showPoweredBy: formData.get("showPoweredBy") === "true",
        adminAnnouncement: (formData.get("adminAnnouncement") as string) || undefined,
      },
    });
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    redirect("/admin/settings?toast=saved");
  }

  return (
    <PageShell title="Site Identity" saved={saved}>
      <form action={saveIdentity}>
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <Field label="Site Name" name="siteName" defaultValue={config.site.name} />
          <Field label="Description" name="siteDescription" defaultValue={config.site.description} />
          {(() => {
            const displayUrl = detectSiteUrl() ?? config.site.url;
            const isPlaceholder = displayUrl === "https://your-site.com";
            const needsSetup = isPlaceholder || isDevUrl(displayUrl);
            return (
              <div>
                <p className="text-sm font-medium text-zinc-700 mb-1">Site URL</p>
                <p className="text-sm text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 font-mono">
                  {displayUrl}
                </p>
                {needsSetup ? (
                  <p className="text-xs text-amber-600 mt-1">
                    This URL is not your final production URL. Before going live with a custom domain, set{" "}
                    <code className="bg-zinc-100 px-1 rounded">NEXTAUTH_URL</code> to{" "}
                    <code className="bg-zinc-100 px-1 rounded">https://yourdomain.com</code> in your host&apos;s environment/secrets panel, then redeploy.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 mt-1">
                    Read from <code className="bg-zinc-100 px-1 rounded">NEXTAUTH_URL</code> — update that environment variable to change it.
                  </p>
                )}
              </div>
            );
          })()}
          <MediaUrlPicker
            label="Logo"
            name="logo"
            defaultValue={config.site.logo ?? ""}
            hint="Choose from the media library or paste a URL."
            allMedia={allMedia}
          />
          <IdentityModeRadio defaultValue={config.site.headerIdentity ?? "logo-only"} />
          <MediaUrlPicker
            label="Favicon"
            name="favicon"
            defaultValue={config.site.favicon ?? ""}
            hint="Choose an image from the library or paste a URL. .ico, .png, and .svg all work."
            allMedia={allMedia}
          />
          <ToggleField
            label='Show "Made with Pugmill" credit'
            hint="Displays a small credit link in the footer."
            name="showPoweredBy"
            defaultChecked={config.site.showPoweredBy !== false}
          />
          <div>
            <label htmlFor="adminAnnouncement" className="block text-sm font-medium text-zinc-700 mb-1">
              Admin Announcement
            </label>
            <input
              id="adminAnnouncement"
              type="text"
              name="adminAnnouncement"
              defaultValue={config.site.adminAnnouncement ?? ""}
              placeholder="Optional message shown as a dismissable banner to all admins"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <p className="text-xs text-zinc-400 mt-1">Leave blank to hide the banner. Admins can dismiss it per session.</p>
          </div>
          <SaveButton />
        </section>
      </form>
    </PageShell>
  );
}
