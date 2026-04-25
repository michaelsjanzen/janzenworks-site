import type { Metadata } from "next";

export const metadata: Metadata = { title: "Themes" };

import { getConfig } from "@/lib/config";
import { getAllThemes } from "@/lib/theme-registry";
import ThemeCard from "./ThemeCard";

export default async function ThemesPage() {
  const config = await getConfig();
  const themes = getAllThemes(config.appearance.activeTheme);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Themes</h2>
        <p className="text-sm text-zinc-500 mt-1">
          One theme is active at a time. Activating a new theme takes effect immediately on the public site.
        </p>
      </div>

      <div className="space-y-3">
        {themes.map(theme => (
          <ThemeCard key={theme.id} {...theme} isOnly={themes.length === 1} />
        ))}
      </div>
    </div>
  );
}
