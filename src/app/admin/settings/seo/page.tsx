import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { like, desc } from "drizzle-orm";
import { getConfig, updateConfig } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageShell, Field, SaveButton } from "../_components";
import MediaUrlPicker from "@/components/admin/MediaUrlPicker";
import SiteAeoEditor from "./SiteAeoEditor";

export default async function SearchDiscoveryPage({ searchParams }: { searchParams: Promise<{ toast?: string }> }) {
  const [config, sp, allMedia] = await Promise.all([
    getConfig(),
    searchParams,
    db.select({ id: media.id, url: media.url, fileName: media.fileName })
      .from(media)
      .where(like(media.fileType, "image/%"))
      .orderBy(desc(media.createdAt)),
  ]);
  const saved = sp.toast === "saved";
  const seo = config.site.seoDefaults ?? {};
  const aeo = config.site.aeoDefaults ?? {};

  async function saveAll(formData: FormData) {
    "use server";
    const current = await getConfig();

    let questions: { q: string; a: string }[] = [];
    try {
      const raw = formData.get("aeoQuestions") as string;
      if (raw) questions = JSON.parse(raw);
    } catch { /* keep empty */ }

    await updateConfig({
      ...current,
      site: {
        ...current.site,
        seoDefaults: {
          ogImage: (formData.get("ogImage") as string) || undefined,
          metaDescription: (formData.get("seoMetaDescription") as string) || undefined,
          blockAiBots: formData.get("blockAiBots") === "1",
          robotsCustomRules: (formData.get("robotsCustomRules") as string) || undefined,
        },
        aeoDefaults: {
          summary: (formData.get("aeoSummary") as string) || undefined,
          questions: questions.filter((qa): qa is { q: string; a: string } => !!qa.q.trim() && !!qa.a.trim()),
          organization: {
            name: (formData.get("aeoOrgName") as string) || undefined,
            type: (formData.get("aeoOrgType") as string) || "Organization",
            description: (formData.get("aeoOrgDescription") as string) || undefined,
            url: (formData.get("aeoOrgUrl") as string) || undefined,
          },
        },
      },
    });
    revalidatePath("/admin/settings/seo");
    redirect("/admin/settings/seo?toast=saved");
  }

  return (
    <PageShell
      title="Search & Discovery"
      description="Control how search engines and AI crawlers understand your site."
      saved={saved}
    >
      <form action={saveAll} className="space-y-6">

        {/* Traditional SEO */}
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Traditional SEO</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Fallback values used on pages without their own SEO metadata.</p>
          </div>
          <MediaUrlPicker
            label="Fallback OG Image"
            name="ogImage"
            defaultValue={seo.ogImage ?? ""}
            hint="Used on pages without a featured image. Recommended size: 1200×630px."
            allMedia={allMedia}
          />
          <Field
            label="Fallback Meta Description"
            name="seoMetaDescription"
            defaultValue={seo.metaDescription ?? ""}
            hint="Used on pages without an excerpt. Keep under 160 characters."
            textarea
          />
        </section>

        {/* Crawler Controls */}
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Crawler Controls</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Rules appended to <code className="font-mono">/robots.txt</code>. Changes take effect on the next crawl.</p>
          </div>

          {/* Block AI bots toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="hidden"
              name="blockAiBots"
              value="0"
            />
            <input
              type="checkbox"
              name="blockAiBots"
              value="1"
              defaultChecked={seo.blockAiBots ?? false}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <div>
              <span className="text-sm font-medium text-zinc-800">Block AI training crawlers</span>
              <p className="text-xs text-zinc-500 mt-0.5">
                Adds <code className="font-mono">Disallow: /</code> for GPTBot, CCBot, anthropic-ai, PerplexityBot, and other known AI-training bots.
              </p>
            </div>
          </label>

          {/* Custom rules */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Additional rules</label>
            <textarea
              name="robotsCustomRules"
              defaultValue={seo.robotsCustomRules ?? ""}
              rows={5}
              placeholder={"User-agent: Googlebot\nDisallow: /private/\n\nUser-agent: *\nDisallow: /wp-admin/"}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
            />
            <p className="text-xs text-zinc-400 mt-1">Standard robots.txt syntax. These lines are appended after the default allow-all rule.</p>
          </div>
        </section>

        {/* Site AEO */}
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">AI Engine Optimization (AEO)</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Site-level data surfaced in llms.txt and structured data for AI crawlers.</p>
          </div>
          <SiteAeoEditor
            defaultSummary={aeo.summary}
            defaultQuestions={aeo.questions}
            defaultOrganization={aeo.organization}
            isAiEnabled={!!config.ai?.provider}
          />
        </section>

        <SaveButton />
      </form>
    </PageShell>
  );
}
