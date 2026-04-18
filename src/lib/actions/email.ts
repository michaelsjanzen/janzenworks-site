"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getConfig, updateConfig } from "@/lib/config";
import { encryptString } from "@/lib/encrypt";
import { getCurrentUser } from "@/lib/get-current-user";
import { auditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function saveEmailSettings(formData: FormData) {
  const user = await requireAdmin();
  const current = await getConfig();

  const provider = formData.get("provider") as string | null;
  const validProvider = provider === "resend" || provider === "smtp" ? provider : null;

  // Resend API key — only update if a new value was typed (placeholder = key already set)
  const rawApiKey = (formData.get("apiKey") as string) ?? "";
  const apiKey = rawApiKey && rawApiKey !== "__REDACTED__"
    ? encryptString(rawApiKey)
    : (current.email?.apiKey ?? "");

  // SMTP password — same redaction pattern
  const rawSmtpPassword = (formData.get("smtpPassword") as string) ?? "";
  const smtpPassword = rawSmtpPassword && rawSmtpPassword !== "__REDACTED__"
    ? encryptString(rawSmtpPassword)
    : (current.email?.smtpPassword ?? "");

  const smtpPort = parseInt(formData.get("smtpPort") as string ?? "587", 10);

  await updateConfig({
    ...current,
    email: {
      provider: validProvider,
      fromName: (formData.get("fromName") as string) ?? "",
      fromAddress: (formData.get("fromAddress") as string) ?? "",
      toAddress: (formData.get("toAddress") as string) ?? "",
      apiKey,
      smtpHost: (formData.get("smtpHost") as string) ?? "",
      smtpPort: isNaN(smtpPort) ? 587 : smtpPort,
      smtpUser: (formData.get("smtpUser") as string) ?? "",
      smtpPassword,
      smtpSecure: formData.get("smtpSecure") === "true",
    },
  });

  auditLog({ action: "settings.update", userId: user.id, detail: "email provider" });
  revalidatePath("/admin/settings/email");
  redirect("/admin/settings/email?toast=saved");
}

/**
 * sendTestEmail — fires a test message to the configured toAddress.
 * Returns { ok, error } so the client can display the result inline.
 */
export async function sendTestEmail(): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const config = await getConfig();
  const toAddress = config.email?.toAddress;
  if (!toAddress) return { ok: false, error: "No destination address configured." };

  const result = await sendEmail({
    to: toAddress,
    subject: "Pugmill CMS — email test",
    text: "This is a test email from your Pugmill CMS installation. If you received this, your email provider is configured correctly.",
  });

  return result;
}
