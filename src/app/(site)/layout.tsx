export const dynamic = "force-dynamic";

import { getConfig } from "@/lib/config";
import { loadPlugins } from "@/lib/plugin-loader";
import { sanitizeThemeName, getAllThemes, THEME_ALLOWLIST } from "@/lib/theme-registry";
import { getThemeLayout } from "@/lib/theme-modules";
import { getActiveSlots } from "@/lib/plugin-registry";
import { cookies } from "next/headers";

/** Escape JSON for safe inline script injection. */
function safeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await loadPlugins();

  const [config, cookieStore] = await Promise.all([getConfig(), cookies()]);

  // Theme preview: admins can preview a different theme via cookie before activating.
  const previewThemeId = cookieStore.get("__pugmill_theme_preview")?.value ?? "";
  const isThemePreview = !!(previewThemeId && (THEME_ALLOWLIST as readonly string[]).includes(previewThemeId));

  const activeTheme = isThemePreview
    ? previewThemeId
    : sanitizeThemeName(config.appearance.activeTheme);
  const ThemeLayout = getThemeLayout(activeTheme);

  // Resolve preview theme name for the banner label
  const previewThemeName = isThemePreview
    ? (getAllThemes(config.appearance.activeTheme).find(t => t.id === previewThemeId)?.name ?? previewThemeId)
    : "";

  const aeo = config.site?.aeoDefaults ?? {};
  const org = aeo.organization;
  const siteBannerSlots = getActiveSlots("siteBanner", config.modules.activePlugins, config.modules.pluginSettings);

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.site?.name ?? "",
    url: config.site?.url ?? "",
    description: aeo.summary || config.site?.description || "",
  };

  const orgSchema = org?.name
    ? {
        "@context": "https://schema.org",
        "@type": org.type ?? "Organization",
        name: org.name,
        url: org.url || config.site?.url || "",
        description: org.description || "",
      }
    : null;

  return (
    <>
      {/* WebSite structured data — consumed by Google, Bing, and AI crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(websiteSchema) }}
      />
      {orgSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJson(orgSchema) }}
        />
      )}
      <ThemeLayout>{children}</ThemeLayout>
      {siteBannerSlots.map(({ pluginId, Component, settings }) => (
        <Component key={pluginId} settings={settings} />
      ))}
      {isThemePreview && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-amber-700 text-white text-xs font-medium text-center py-1.5 flex items-center justify-center gap-4">
          <span>Previewing theme: <strong>{previewThemeName}</strong></span>
          <a href="/api/theme-preview/activate" className="underline hover:no-underline font-semibold">
            Activate
          </a>
          <a href="/api/theme-preview/disable" className="underline hover:no-underline">
            Exit preview
          </a>
        </div>
      )}
    </>
  );
}
