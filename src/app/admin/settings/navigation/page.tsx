import type { Metadata } from "next";

export const metadata: Metadata = { title: "Navigation" };

import { getConfig, updateConfig } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import NavEditor from "../NavEditor";
import { PageShell, SaveButton } from "../_components";

export default async function NavigationPage({ searchParams }: { searchParams: Promise<{ toast?: string }> }) {
  const [config, sp] = await Promise.all([getConfig(), searchParams]);
  const saved = sp.toast === "saved";

  async function saveNavigation(formData: FormData) {
    "use server";
    const current = await getConfig();
    let navigation = current.appearance.navigation;
    try {
      const raw = formData.get("navigation") as string | null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              typeof item.label === "string" &&
              typeof item.path === "string"
          )
        ) {
          navigation = parsed;
        }
      }
    } catch { /* keep existing */ }
    await updateConfig({
      ...current,
      appearance: { ...current.appearance, navigation },
    });
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/navigation");
    redirect("/admin/settings/navigation?toast=saved");
  }

  return (
    <PageShell
      title="Navigation"
      description="Links that appear in the site header. Drag to reorder."
      saved={saved}
    >
      <form action={saveNavigation}>
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <NavEditor initialItems={config.appearance.navigation as { label: string; path: string }[]} />
          <SaveButton />
        </section>
      </form>
    </PageShell>
  );
}
