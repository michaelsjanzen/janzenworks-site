import { getConfig } from "@/lib/config";
import { sanitizeThemeName, getAllThemes } from "@/lib/theme-registry";
import { getDesignConfig, hasDraftConfig, loadThemeDesignDefs } from "@/lib/design-config";
import { savePartialDesignDraft, saveStructuralDesignTokens, saveWidgetAreaDraft } from "@/lib/actions/design";
import { getWidgetAreaAssignmentsBulk } from "@/lib/actions/widgets";
import { extractHeroConfig, WIDGET_AREAS } from "../../../../themes/default/design";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { DraftBanner, PublishActions } from "./DraftControls";
import DesignForm from "./DesignForm";
import HomepageLayoutCard from "./HomepageLayoutCard";
import BlogLayoutCard from "./BlogLayoutCard";
import { DesignSaveProvider } from "./DesignSaveContext";
import WidgetAreaCard from "./WidgetAreaCard";
import { getWidgetsForArea } from "@/lib/widget-registry";

export const dynamic = "force-dynamic";

export default async function DesignPage() {
  const config = await getConfig();
  const themeId = sanitizeThemeName(config.appearance.activeTheme);
  const allThemes = getAllThemes(themeId);
  const activeThemeName = allThemes.find(t => t.id === themeId)?.name ?? themeId;

  const [{ DESIGN_TOKEN_DEFS, DESIGN_DEFAULTS, SANS_FONTS, MONO_FONTS, COLOR_PRESETS }, draftConfig, hasDraft, allMedia, areaAssignments] =
    await Promise.all([
      loadThemeDesignDefs(themeId),
      getDesignConfig(themeId, "draft"),
      hasDraftConfig(themeId),
      db.select({ id: media.id, url: media.url, fileName: media.fileName })
        .from(media)
        .orderBy(desc(media.createdAt)),
      getWidgetAreaAssignmentsBulk(WIDGET_AREAS.map(a => a.id)),
    ]);

  const nonHomepageTokens = DESIGN_TOKEN_DEFS.filter(
    t => t.editable !== false && t.group !== "hero" && t.group !== "layout-home" && t.group !== "layout-blog"
  );
  const heroConfig = extractHeroConfig(draftConfig);
  const initialFeedStyle = ((draftConfig.homeFeedStyle ?? DESIGN_DEFAULTS.homeFeedStyle ?? "list") as "list" | "grid");
  const initialListStyle = ((draftConfig.homeListStyle ?? DESIGN_DEFAULTS.homeListStyle ?? "compact") as "compact" | "editorial" | "feature" | "text-only");
  const initialColumns = ((draftConfig.homeColumns ?? DESIGN_DEFAULTS.homeColumns ?? "1") as "1" | "2" | "3");
  const initialGap = ((draftConfig.homeGap ?? DESIGN_DEFAULTS.homeGap ?? "md") as "sm" | "md" | "lg");
  const initialContentDisplay = ((draftConfig.homeContentDisplay ?? DESIGN_DEFAULTS.homeContentDisplay ?? "excerpt") as "excerpt" | "none");
  const initialBlogFeedStyle = ((draftConfig.blogFeedStyle ?? DESIGN_DEFAULTS.blogFeedStyle ?? "list") as "list" | "grid");
  const initialBlogListStyle = ((draftConfig.blogListStyle ?? DESIGN_DEFAULTS.blogListStyle ?? "compact") as "compact" | "editorial" | "feature" | "text-only");
  const initialBlogColumns = ((draftConfig.blogColumns ?? DESIGN_DEFAULTS.blogColumns ?? "1") as "1" | "2" | "3");
  const initialBlogGap = ((draftConfig.blogGap ?? DESIGN_DEFAULTS.blogGap ?? "md") as "sm" | "md" | "lg");
  const initialBlogContentDisplay = ((draftConfig.blogContentDisplay ?? DESIGN_DEFAULTS.blogContentDisplay ?? "excerpt") as "excerpt" | "none");

  return (
    <DesignSaveProvider>
    <div className={`-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 transition-colors duration-500 ${hasDraft ? "bg-amber-50" : "bg-zinc-50"}`}>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Design</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Customizing: <span className="font-medium text-zinc-700">{activeThemeName}</span>
          </p>
        </div>
        <PublishActions hasDraft={hasDraft} />
      </div>

      <DraftBanner hasDraft={hasDraft} />

      {/* Homepage layout card: feed style + hero canvas */}
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

      {/* Blog archive layout card */}
      <BlogLayoutCard
        initialFeedStyle={initialBlogFeedStyle}
        initialListStyle={initialBlogListStyle}
        initialColumns={initialBlogColumns}
        initialGap={initialBlogGap}
        initialContentDisplay={initialBlogContentDisplay}
        hasDraft={hasDraft}
        saveAction={savePartialDesignDraft}
      />

      {/* Token form for colors, typography, other layout sections */}
      <DesignForm
        tokens={nonHomepageTokens}
        defaults={DESIGN_DEFAULTS}
        draftConfig={draftConfig}
        sansFonts={SANS_FONTS}
        monoFonts={MONO_FONTS}
        colorPresets={COLOR_PRESETS}
        hasDraft={hasDraft}
        saveAction={savePartialDesignDraft}
        saveStructuralAction={saveStructuralDesignTokens}
        allMedia={allMedia}
      />

      {/* Widget areas */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-zinc-800">Widget Areas</h3>
        {WIDGET_AREAS.map(area => {
          const availableWidgets = getWidgetsForArea(area.id).map(w => ({
            id: w.id,
            label: w.label,
            description: w.description,
          }));
          return (
            <WidgetAreaCard
              key={area.id}
              areaId={area.id}
              areaLabel={area.label}
              initialWidgetIds={
                draftConfig[`widgetArea:${area.id}`] !== undefined
                  ? draftConfig[`widgetArea:${area.id}`].split(",").map((s: string) => s.trim()).filter(Boolean)
                  : (areaAssignments[area.id] ?? [])
              }
              availableWidgets={availableWidgets}
              saveAction={saveWidgetAreaDraft}
            />
          );
        })}
      </div>

      {/* Bottom publish bar */}
      <div className="flex justify-start">
        <PublishActions hasDraft={hasDraft} />
      </div>

    </div>
    </DesignSaveProvider>
  );
}
