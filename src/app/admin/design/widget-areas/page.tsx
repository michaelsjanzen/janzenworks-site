import type { Metadata } from "next";

export const metadata: Metadata = { title: "Widget Areas — Design" };
export const dynamic = "force-dynamic";

import { saveWidgetAreaDraft } from "@/lib/actions/design";
import { getWidgetAreaAssignmentsBulk } from "@/lib/actions/widgets";
import { WIDGET_AREAS } from "../../../../../themes/default/design";
import { getWidgetsForArea } from "@/lib/widget-registry";
import { DraftBanner, PublishActions } from "../DraftControls";
import WidgetAreaCard from "../WidgetAreaCard";
import { DesignSaveProvider } from "../DesignSaveContext";
import { loadDesignData } from "../_loadDesignData";

export default async function DesignWidgetAreas() {
  const { draftConfig, hasDraft } = await loadDesignData();

  const areaAssignments = await getWidgetAreaAssignmentsBulk(WIDGET_AREAS.map(a => a.id));

  return (
    <DesignSaveProvider>
      <div className={`-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 transition-colors duration-500 ${hasDraft ? "bg-amber-50" : "bg-zinc-50"}`}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Widget Areas</h2>
            <p className="text-sm text-zinc-500 mt-1">Assign widgets to sidebars and footer slots.</p>
          </div>
          <PublishActions hasDraft={hasDraft} />
        </div>

        <DraftBanner hasDraft={hasDraft} />

        <div className="space-y-4">
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

        <div className="flex justify-start">
          <PublishActions hasDraft={hasDraft} />
        </div>

      </div>
    </DesignSaveProvider>
  );
}
