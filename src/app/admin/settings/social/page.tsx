import type { Metadata } from "next";

export const metadata: Metadata = { title: "Social Links" };

import { getConfig, updateConfig } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageShell, Field, SaveButton } from "../_components";

export default async function SocialLinksPage({ searchParams }: { searchParams: Promise<{ toast?: string }> }) {
  const [config, sp] = await Promise.all([getConfig(), searchParams]);
  const saved = sp.toast === "saved";
  const social = config.site.socialLinks ?? {};

  async function saveSocial(formData: FormData) {
    "use server";
    const current = await getConfig();
    await updateConfig({
      ...current,
      site: {
        ...current.site,
        socialLinks: {
          twitter: (formData.get("twitter") as string) || undefined,
          github: (formData.get("github") as string) || undefined,
          linkedin: (formData.get("linkedin") as string) || undefined,
          instagram: (formData.get("instagram") as string) || undefined,
          youtube: (formData.get("youtube") as string) || undefined,
          facebook: (formData.get("facebook") as string) || undefined,
        },
      },
    });
    revalidatePath("/admin/settings/social");
    redirect("/admin/settings/social?toast=saved");
  }

  return (
    <PageShell title="Social Links" saved={saved}>
      <form action={saveSocial}>
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <Field label="X / Twitter" name="twitter" defaultValue={social.twitter ?? ""} placeholder="https://x.com/yourhandle" />
          <Field label="GitHub" name="github" defaultValue={social.github ?? ""} placeholder="https://github.com/yourusername" />
          <Field label="LinkedIn" name="linkedin" defaultValue={social.linkedin ?? ""} placeholder="https://linkedin.com/in/yourprofile" />
          <Field label="Instagram" name="instagram" defaultValue={social.instagram ?? ""} placeholder="https://instagram.com/yourhandle" />
          <Field label="YouTube" name="youtube" defaultValue={social.youtube ?? ""} placeholder="https://youtube.com/@yourchannel" />
          <Field label="Facebook" name="facebook" defaultValue={social.facebook ?? ""} placeholder="https://facebook.com/yourpage" />
          <SaveButton />
        </section>
      </form>
    </PageShell>
  );
}
