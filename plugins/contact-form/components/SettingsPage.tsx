import { getConfig, updateConfig } from "../../../src/lib/config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageShell, Field, SaveButton } from "../../../src/app/admin/settings/_components";

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

function CheckboxCell({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <td className="px-4 py-3 text-center">
      <input type="hidden" name={name} value="0" />
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
      />
    </td>
  );
}

function LockedCell({ checked }: { checked: boolean }) {
  return (
    <td className="px-4 py-3 text-center">
      {checked ? (
        <span className="inline-flex items-center justify-center">
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="text-zinc-300 text-sm">—</span>
      )}
    </td>
  );
}

export default async function ContactFormSettingsPage({ searchParams }: Props) {
  const [config, sp] = await Promise.all([getConfig(), Promise.resolve(searchParams)]);
  const saved = sp.toast === "saved";
  const settings = config.modules.pluginSettings?.["contact-form"] ?? {};

  const showPhone     = settings.showPhone     !== false && settings.showPhone     !== "false";
  const requirePhone  = settings.requirePhone  === true  || settings.requirePhone  === "true";
  const showSocialUrl = settings.showSocialUrl !== false && settings.showSocialUrl !== "false";
  const requireSocialUrl = settings.requireSocialUrl === true || settings.requireSocialUrl === "true";
  const pageSlug      = (settings.pageSlug as string)      || "contact";
  const successMessage = (settings.successMessage as string) || "Thank you for your message. We'll be in touch soon.";

  async function save(formData: FormData) {
    "use server";
    const current = await getConfig();
    const existing = current.modules.pluginSettings?.["contact-form"] ?? {};
    await updateConfig({
      ...current,
      modules: {
        ...current.modules,
        pluginSettings: {
          ...(current.modules.pluginSettings ?? {}),
          "contact-form": {
            ...existing,
            pageSlug:        (formData.get("pageSlug") as string) || "contact",
            showPhone:       formData.getAll("showPhone").includes("1"),
            requirePhone:    formData.getAll("requirePhone").includes("1"),
            showSocialUrl:   formData.getAll("showSocialUrl").includes("1"),
            requireSocialUrl: formData.getAll("requireSocialUrl").includes("1"),
            successMessage:  (formData.get("successMessage") as string) || "Thank you for your message. We'll be in touch soon.",
          },
        },
      },
    });
    revalidatePath("/admin/plugins/contact-form");
    redirect("/admin/plugins/contact-form?toast=saved");
  }

  return (
    <PageShell
      title="Contact Form"
      description="Configure which fields appear on the contact form and how they behave."
      saved={saved}
    >
      <form action={save} className="space-y-6">

        {/* Field table */}
        <section className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Field</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wide w-24">Show</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wide w-24">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* Name — always shown, always required */}
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">Name</td>
                <LockedCell checked={true} />
                <LockedCell checked={true} />
              </tr>
              {/* Email — always shown, always required */}
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">Email</td>
                <LockedCell checked={true} />
                <LockedCell checked={true} />
              </tr>
              {/* Phone */}
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">Phone</td>
                <CheckboxCell name="showPhone" defaultChecked={showPhone} />
                <CheckboxCell name="requirePhone" defaultChecked={requirePhone} />
              </tr>
              {/* Social Profile URL */}
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">Social Profile URL</td>
                <CheckboxCell name="showSocialUrl" defaultChecked={showSocialUrl} />
                <CheckboxCell name="requireSocialUrl" defaultChecked={requireSocialUrl} />
              </tr>
            </tbody>
          </table>
        </section>

        {/* Other settings */}
        <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <Field
            name="pageSlug"
            label="Page Slug"
            defaultValue={pageSlug}
            hint="The slug of the page where the contact form appears. A page is created automatically on activation."
          />
          <Field
            name="successMessage"
            label="Success Message"
            defaultValue={successMessage}
            hint="Shown to visitors after a successful submission."
          />
        </section>

        <SaveButton />
      </form>
    </PageShell>
  );
}
