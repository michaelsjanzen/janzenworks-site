import type { Metadata } from "next";

export const metadata: Metadata = { title: "Layout — Design" };
export const dynamic = "force-dynamic";

import { savePartialDesignDraft, saveStructuralDesignTokens } from "@/lib/actions/design";
import { DraftBanner, PublishActions } from "../DraftControls";
import BlogLayoutCard from "../BlogLayoutCard";
import DesignForm from "../DesignForm";
import { DesignSaveProvider } from "../DesignSaveContext";
import { loadDesignData } from "../_loadDesignData";

export default async function DesignLayout() {
  const { draftConfig, hasDraft, DESIGN_TOKEN_DEFS, DESIGN_DEFAULTS, SANS_FONTS, MONO_FONTS } = await loadDesignData();

  const layoutTokens = DESIGN_TOKEN_DEFS.filter(
    t => t.editable !== false && (t.group === "layout-post" || t.group === "layout-page")
  );

  const initialBlogFeedStyle      = ((draftConfig.blogFeedStyle      ?? DESIGN_DEFAULTS.blogFeedStyle      ?? "list")    as "list" | "grid");
  const initialBlogListStyle      = ((draftConfig.blogListStyle      ?? DESIGN_DEFAULTS.blogListStyle      ?? "compact") as "compact" | "editorial" | "feature" | "text-only");
  const initialBlogColumns        = ((draftConfig.blogColumns        ?? DESIGN_DEFAULTS.blogColumns        ?? "1")       as "1" | "2" | "3");
  const initialBlogGap            = ((draftConfig.blogGap            ?? DESIGN_DEFAULTS.blogGap            ?? "md")      as "sm" | "md" | "lg");
  const initialBlogContentDisplay = ((draftConfig.blogContentDisplay ?? DESIGN_DEFAULTS.blogContentDisplay ?? "excerpt") as "excerpt" | "none");

  return (
    <DesignSaveProvider>
      <div className={`-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 transition-colors duration-500 ${hasDraft ? "bg-amber-50" : "bg-zinc-50"}`}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Layout</h2>
            <p className="text-sm text-zinc-500 mt-1">Blog archive, post, and page layout settings.</p>
          </div>
          <PublishActions hasDraft={hasDraft} />
        </div>

        <DraftBanner hasDraft={hasDraft} />

        <BlogLayoutCard
          initialFeedStyle={initialBlogFeedStyle}
          initialListStyle={initialBlogListStyle}
          initialColumns={initialBlogColumns}
          initialGap={initialBlogGap}
          initialContentDisplay={initialBlogContentDisplay}
          hasDraft={hasDraft}
          saveAction={savePartialDesignDraft}
        />

        <DesignForm
          tokens={layoutTokens}
          defaults={DESIGN_DEFAULTS}
          draftConfig={draftConfig}
          sansFonts={SANS_FONTS}
          monoFonts={MONO_FONTS}
          hasDraft={hasDraft}
          saveAction={savePartialDesignDraft}
          saveStructuralAction={saveStructuralDesignTokens}
        />

        <div className="flex justify-start">
          <PublishActions hasDraft={hasDraft} />
        </div>

      </div>
    </DesignSaveProvider>
  );
}
