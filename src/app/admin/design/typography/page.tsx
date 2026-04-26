import type { Metadata } from "next";

export const metadata: Metadata = { title: "Typography — Design" };
export const dynamic = "force-dynamic";

import { savePartialDesignDraft } from "@/lib/actions/design";
import { DraftBanner, PublishActions } from "../DraftControls";
import DesignForm from "../DesignForm";
import { DesignSaveProvider } from "../DesignSaveContext";
import { loadDesignData } from "../_loadDesignData";

export default async function DesignTypography() {
  const { draftConfig, hasDraft, DESIGN_TOKEN_DEFS, DESIGN_DEFAULTS, SANS_FONTS, MONO_FONTS } = await loadDesignData();

  const typographyTokens = DESIGN_TOKEN_DEFS.filter(
    t => t.editable !== false && t.group === "typography"
  );

  return (
    <DesignSaveProvider>
      <div className={`-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6 transition-colors duration-500 ${hasDraft ? "bg-amber-50" : "bg-zinc-50"}`}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Typography</h2>
            <p className="text-sm text-zinc-500 mt-1">Fonts and type settings.</p>
          </div>
          <PublishActions hasDraft={hasDraft} />
        </div>

        <DraftBanner hasDraft={hasDraft} />

        <DesignForm
          tokens={typographyTokens}
          defaults={DESIGN_DEFAULTS}
          draftConfig={draftConfig}
          sansFonts={SANS_FONTS}
          monoFonts={MONO_FONTS}
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
