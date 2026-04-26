import type { Metadata } from "next";

export const metadata: Metadata = { title: "Homepage — Design" };
export const dynamic = "force-dynamic";

import { savePartialDesignDraft } from "@/lib/actions/design";
import { db } from "@/lib/db";
import { media, categories, posts } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { DraftBanner, PublishActions } from "./DraftControls";
import { DesignSaveProvider } from "./DesignSaveContext";
import { loadDesignData } from "./_loadDesignData";
import { parseHomepageSections } from "@/lib/homepage-sections";
import SectionStack from "./SectionStack";

export default async function DesignHomepage() {
  const { draftConfig, hasDraft } = await loadDesignData();

  const [allMedia, allCategories, recentPosts] = await Promise.all([
    db
      .select({ id: media.id, url: media.url, fileName: media.fileName })
      .from(media)
      .orderBy(desc(media.createdAt)),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .orderBy(categories.name),
    db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(and(eq(posts.published, true), eq(posts.type, "post")))
      .orderBy(desc(posts.publishedAt))
      .limit(50),
  ]);

  const sections = parseHomepageSections(draftConfig);

  return (
    <DesignSaveProvider>
      <div className={`-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 transition-colors duration-500 ${hasDraft ? "bg-amber-50" : "bg-zinc-50"}`}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Homepage</h2>
            <p className="text-sm text-zinc-500 mt-1">Build your homepage by stacking sections.</p>
          </div>
          <PublishActions hasDraft={hasDraft} />
        </div>

        <DraftBanner hasDraft={hasDraft} />

        <SectionStack
          initialSections={sections}
          saveAction={savePartialDesignDraft}
          allMedia={allMedia}
          categories={allCategories}
          recentPosts={recentPosts}
        />

        <div className="flex justify-start">
          <PublishActions hasDraft={hasDraft} />
        </div>

      </div>
    </DesignSaveProvider>
  );
}
