import Header from "./components/Header";
import Footer from "./components/Footer";
import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig } from "@/lib/design-config";
import { buildCssString, buildGoogleFontsUrl, DESIGN_TOKEN_DEFS } from "./design";
import { cookies } from "next/headers";

export default async function ThemeLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig();
  const themeId = sanitizeThemeName(config.appearance.activeTheme);
  const cookieStore = await cookies();
  const isPreview = cookieStore.get("__pugmill_design_preview")?.value === "1";
  const designConfig = await getDesignConfig(themeId, isPreview ? "draft" : "published");
  const cssString = buildCssString(designConfig, DESIGN_TOKEN_DEFS);
  const fontUrl = buildGoogleFontsUrl(designConfig);

  return (
    <div
      className="antialiased"
      style={{
        backgroundColor: "var(--color-background)",
        color: "var(--color-foreground)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: cssString }} precedence="default" />
      {fontUrl && (
        <link rel="stylesheet" href={fontUrl} precedence="default" />
      )}
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-700 text-white text-xs font-medium text-center py-1.5 flex items-center justify-center gap-4">
          <span>Previewing draft design changes</span>
          <a
            href="/api/design-preview/disable"
            className="underline hover:no-underline"
          >
            Exit preview
          </a>
        </div>
      )}
      <Header />
      <main
        className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16${
          isPreview ? " pt-20" : ""
        }`}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
