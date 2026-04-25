import type { Metadata } from "next";
import "./globals.css";
import { validateEnv } from "@/lib/validate-env";
import { getConfig } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const siteName = config.site?.name?.trim() || "Pugmill";
  return {
    title: {
      template: `%s - ${siteName}`,
      default: siteName,
    },
    description: config.site?.description || "A rebuildable CMS",
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Run env validation at request time, not build time.
  // This prevents misconfigured secrets from crashing the build pipeline.
  validateEnv();

  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
