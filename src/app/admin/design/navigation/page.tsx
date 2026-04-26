import type { Metadata } from "next";

export const metadata: Metadata = { title: "Navigation" };

import { getConfig, updateConfig } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import NavEditor from "../../settings/NavEditor";
import { PageShell, SaveButton } from "../../settings/_components";

export default async function NavigationPage({ searchParams }: { searchParams: Promise<{ toast?: string }> }) {
  const [config, sp] = await Promise.all([getConfig(), searchParams]);
  const saved = sp.toast === "saved";

  async function saveNavigation(formData: FormData) {
    "use server";
    const current = await getConfig();

    let navigation = current.appearance.navigation;
    let footerNavigation = current.appearance.footerNavigation;

    try {
      const rawHeader = formData.get("navigation") as string | null;
      if (rawHeader) {
        const parsed = JSON.parse(rawHeader);
        if (Array.isArray(parsed) && parsed.every(item => typeof item?.label === "string" && typeof item?.path === "string")) {
          navigation = parsed;
        }
      }
    } catch { /* keep existing */ }

    try {
      const rawFooter = formData.get("footerNavigation") as string | null;
      if (rawFooter) {
        const parsed = JSON.parse(rawFooter);
        if (Array.isArray(parsed) && parsed.every(item => typeof item?.label === "string" && typeof item?.path === "string")) {
          footerNavigation = parsed;
        }
      }
    } catch { /* keep existing */ }

    await updateConfig({
      ...current,
      appearance: { ...current.appearance, navigation, footerNavigation },
    });
    revalidatePath("/", "layout");
    revalidatePath("/admin/design/navigation");
    redirect("/admin/design/navigation?toast=saved");
  }

  return (
    <PageShell
      title="Navigation"
      description="Manage header and footer navigation links. Drag to reorder."
      saved={saved}
    >
      <form action={saveNavigation} className="space-y-6">
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800">Header Navigation</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Links that appear in the site header.</p>
          </div>
          <NavEditor
            name="navigation"
            initialItems={config.appearance.navigation as { label: string; path: string }[]}
          />
        </section>

        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800">Footer Navigation</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Links that appear in the site footer.</p>
          </div>
          <NavEditor
            name="footerNavigation"
            initialItems={(config.appearance.footerNavigation ?? []) as { label: string; path: string }[]}
          />
        </section>

        <SaveButton />
      </form>
    </PageShell>
  );
}
