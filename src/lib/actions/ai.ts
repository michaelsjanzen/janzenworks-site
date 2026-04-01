"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getConfig, updateConfig } from "@/lib/config";
import { encryptString } from "@/lib/encrypt";
import { getCurrentUser } from "@/lib/get-current-user";
import { auditLog } from "@/lib/audit-log";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized: admin role required");
  return user;
}

const aiSettingsSchema = z.object({
  provider: z.enum(["anthropic", "openai", "gemini"]).nullable(),
  apiKey: z.string().max(2000),
  model: z.string().max(200),
  aiRateLimit: z.coerce.number().int().min(1).max(500).default(50),
});

export async function saveAiSettings(formData: FormData) {
  const admin = await requireAdmin();

  const rawProvider = formData.get("provider");
  const result = aiSettingsSchema.safeParse({
    provider: rawProvider === "" || rawProvider === null ? null : rawProvider,
    apiKey: ((formData.get("apiKey") as string) ?? "").trim(),
    model: (formData.get("model") as string) ?? "",
    aiRateLimit: (formData.get("aiRateLimit") as string) ?? "50",
  });
  if (!result.success) throw new Error(result.error.issues.map(i => i.message).join(", "));
  const { provider, apiKey, model, aiRateLimit } = result.data;

  const current = await getConfig();
  await updateConfig({
    ...current,
    ai: {
      provider: provider ?? null,
      // If apiKey is blank (masked field left empty), keep the existing key; otherwise encrypt the new one
      apiKey: apiKey ? encryptString(apiKey) : current.ai.apiKey,
      model,
      aiRateLimit,
    },
  });

  auditLog({ action: "settings.update", userId: admin.id, detail: "Updated AI settings" });
  revalidatePath("/admin/settings/ai");
  redirect("/admin/settings/ai?toast=saved");
}
