import type { Metadata } from "next";

export const metadata: Metadata = { title: "Widgets" };

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAllWidgets } from "@/lib/widget-registry";
import { getWidgetSettingsBulk, saveWidgetSettingsFromForm } from "@/lib/actions/widgets";
import { PageShell } from "../../settings/_components";

export default async function WidgetsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string }>;
}) {

  const sp = await searchParams;
  const saved = sp.toast === "saved";

  const allWidgets = getAllWidgets().filter(w => w.configSchema && Object.keys(w.configSchema).length > 0);
  const widgetIds = allWidgets.map(w => w.id);
  const allSettings = await getWidgetSettingsBulk(widgetIds);

  async function save(formData: FormData) {
    "use server";
    await saveWidgetSettingsFromForm(formData);
    revalidatePath("/admin/design/widgets");
    redirect("/admin/design/widgets?toast=saved");
  }

  return (
    <PageShell
      title="Widget Settings"
      description="Configure default settings for built-in and plugin widgets."
      saved={saved}
    >
      {allWidgets.length === 0 ? (
        <p className="text-sm text-zinc-500">No configurable widgets registered.</p>
      ) : (
        <form action={save} className="space-y-6">
          {allWidgets.map(widget => {
            const settings = allSettings[widget.id] ?? {};
            const schema = widget.configSchema!;
            return (
              <div key={widget.id} className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-800">{widget.label}</h3>
                  {widget.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">{widget.description}</p>
                  )}
                </div>
                <div className="space-y-3">
                  {Object.entries(schema).map(([key, field]) => {
                    const currentValue = settings[key] ?? field.default;
                    const inputName = `${widget.id}:${key}`;
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">
                          {field.label}
                        </label>
                        {field.type === "select" ? (
                          <select
                            name={inputName}
                            defaultValue={currentValue}
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                          >
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === "number" ? "number" : "text"}
                            name={inputName}
                            defaultValue={currentValue}
                            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                          />
                        )}
                        {field.description && (
                          <p className="text-xs text-zinc-500 mt-1">{field.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="pt-2">
            <button
              type="submit"
              className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[var(--ds-blue-900)] transition-colors"
            >
              Save Widget Settings
            </button>
          </div>
        </form>
      )}
    </PageShell>
  );
}
