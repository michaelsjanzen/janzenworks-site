// Phase 1: Mono header delegates to the shared HeaderClient.
// TODO Phase 2: Replace with a config-driven implementation that reads
// HEADER_LAYOUTS and HEADER_MODIFIERS from mono/design.ts. The Mono
// header should be borderless, monospace throughout, and solid-only.

import { getConfig } from "../../../src/lib/config";
import { hooks } from "../../../src/lib/hooks";
import HeaderClient from "../../default/components/HeaderClient";

export default async function Header() {
  const config = await getConfig();
  const rawNav = (config.appearance.navigation as { label: string; path: string }[]) ?? [];
  const navItems = await hooks.applyFilters("nav:items", { input: rawNav });
  return (
    <HeaderClient
      siteName={config.site.name}
      logoUrl={config.site.logo ?? null}
      headerIdentity={config.site.headerIdentity ?? "logo-only"}
      navItems={navItems}
    />
  );
}
