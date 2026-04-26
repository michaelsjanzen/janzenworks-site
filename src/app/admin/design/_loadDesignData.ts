/**
 * Shared data loader for Design sub-pages.
 * Fetches the active theme's token defs, defaults, and current draft config
 * in one call so each sub-page doesn't repeat the same boilerplate.
 */
import { getConfig } from "@/lib/config";
import { sanitizeThemeName } from "@/lib/theme-registry";
import { getDesignConfig, hasDraftConfig, loadThemeDesignDefs } from "@/lib/design-config";

export async function loadDesignData() {
  const config = await getConfig();
  const themeId = sanitizeThemeName(config.appearance.activeTheme);

  const [defs, draftConfig, hasDraft] = await Promise.all([
    loadThemeDesignDefs(themeId),
    getDesignConfig(themeId, "draft"),
    hasDraftConfig(themeId),
  ]);

  return { config, themeId, draftConfig, hasDraft, ...defs };
}
