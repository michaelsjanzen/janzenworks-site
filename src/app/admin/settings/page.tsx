import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getConfig, updateConfig } from "@/lib/config";
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
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-1">Site URL</p>
            <p className="text-sm text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 font-mono">
              {config.site.url}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Set via the <code className="bg-zinc-100 px-1 rounded">NEXTAUTH_URL</code> environment variable — not editable here for security reasons.
              Before going live with a custom domain, update <code className="bg-zinc-100 px-1 rounded">NEXTAUTH_URL</code> to your production URL (e.g. <code className="bg-zinc-100 px-1 rounded">https://yourdomain.com</code>).
              Ask your AI agent to update it in your host&apos;s environment/secrets panel, or do it manually before you deploy.
            </p>
          </div>
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
          <SaveButton />
        </section>
      </form>
    </PageShell>
  );
}
