"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getConfig, updateConfig } from "@/lib/config";
import { encryptString } from "@/lib/encrypt";
import { getCurrentUser } from "@/lib/get-current-user";
import { auditLog } from "@/lib/audit-log";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function saveStorageSettings(formData: FormData) {
  const user = await requireAdmin();
  const current = await getConfig();

  const provider = formData.get("provider") as string;
  const validProvider = provider === "s3" ? "s3" : "local";

  // Access key ID is not a secret (but we store it in config)
  const accessKeyId = (formData.get("accessKeyId") as string) ?? "";

  // Secret access key — only update if a new value was typed
  const rawSecret = (formData.get("secretAccessKey") as string) ?? "";
  const secretAccessKey = rawSecret && rawSecret !== "__REDACTED__"
    ? encryptString(rawSecret)
    : (current.storage?.secretAccessKey ?? "");

  await updateConfig({
    ...current,
    storage: {
      provider: validProvider,
      bucket: (formData.get("bucket") as string) ?? "",
      region: (formData.get("region") as string) || "auto",
      accessKeyId,
      secretAccessKey,
      endpoint: (formData.get("endpoint") as string) ?? "",
      publicUrl: (formData.get("publicUrl") as string) ?? "",
      publicAcl: formData.get("publicAcl") === "true",
    },
  });

  auditLog({ action: "settings.update", userId: user.id, detail: "storage provider" });
  revalidatePath("/admin/settings/storage");
  redirect("/admin/settings/storage?toast=saved");
}
