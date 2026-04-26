import type { Metadata } from "next";

export const metadata: Metadata = { title: "Homepage — Design" };
export const dynamic = "force-dynamic";

import { savePartialDesignDraft } from "@/lib/actions/design";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { extractHeroConfig } from "../../../../themes/default/design";
import { DraftBanner, PublishActions } from "./DraftControls";
import HomepageLayoutCard from "./HomepageLayoutCard";
import { DesignSaveProvider } from "./DesignSaveContext";
import { loadDesignData } from "./_loadDesignData";

export default async function DesignHomepage() {
  const { draftConfig, hasDraft, DESIGN_DEFAULTS } = await loadDesignData();

  const allMedia = await db
    .select({ id: media.id, url: media.url, fileName: media.fileName })
    .from(media)
    .orderBy(desc(media.createdAt));

  const heroConfig      = extractHeroConfig(draftConfig);
  const initialFeedStyle      = ((draftConfig.homeFeedStyle      ?? DESIGN_DEFAULTS.homeFeedStyle      ?? "list")    as "list" | "grid");
  const initialListStyle      = ((draftConfig.homeListStyle      ?? DESIGN_DEFAULTS.homeListStyle      ?? "compact") as "compact" | "editorial" | "feature" | "text-only");
  const initialColumns        = ((draftConfig.homeColumns        ?? DESIGN_DEFAULTS.homeColumns        ?? "1")       as "1" | "2" | "3");
  const initialGap            = ((draftConfig.homeGap            ?? DESIGN_DEFAULTS.homeGap            ?? "md")      as "sm" | "md" | "lg");
  const initialContentDisplay = ((draftConfig.homeContentDisplay ?? DESIGN_DEFAULTS.homeContentDisplay ?? "excerpt") as "excerpt" | "none");

  return (
    <DesignSaveProvider>
      <div className={`-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 transition-colors duration-500 ${hasDraft ? "bg-amber-50" : "bg-zinc-50"}`}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Homepage</h2>
            <p className="text-sm text-zinc-500 mt-1">Feed layout and hero section.</p>
          </div>
          <PublishActions hasDraft={hasDraft} />
        </div>

        <DraftBanner hasDraft={hasDraft} />

        <HomepageLayoutCard
          initialFeedStyle={initialFeedStyle}
          initialListStyle={initialListStyle}
          initialColumns={initialColumns}
          initialGap={initialGap}
          initialContentDisplay={initialContentDisplay}
          heroConfig={heroConfig}
          allMedia={allMedia}
          hasDraft={hasDraft}
          saveAction={savePartialDesignDraft}
        />

        <div className="flex justify-start">
          <PublishActions hasDraft={hasDraft} />
        </div>

      </div>
    </DesignSaveProvider>
  );
}
