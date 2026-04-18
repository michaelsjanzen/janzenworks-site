import type { EmailProvider, SendEmailOptions, SendResult } from "./types";
export type { EmailProvider, SendEmailOptions, SendResult } from "./types";

/**
 * getEmailProvider()
 *
 * Returns an EmailProvider for the currently configured provider, or null
 * if no provider is configured (built-in mode — emails are not sent).
 *
 * Call sites should treat null as "email disabled" and proceed silently.
 * Never throws.
 *
 * Config is read fresh on each call so that admin changes take effect
 * without a server restart. Provider instances are cheap to construct.
 */
export async function getEmailProvider(): Promise<EmailProvider | null> {
  try {
    // Avoid importing config at module level — this file may be required in
    // contexts where the DB is not yet available (e.g. edge runtime checks).
    const { getConfig } = await import("@/lib/config");
    const { decryptString } = await import("@/lib/encrypt");
    const config = await getConfig();
    const email = config.email;

    if (!email?.provider) return null;

    if (email.provider === "resend") {
      const apiKey = decryptString(email.apiKey ?? "");
      if (!apiKey || !email.fromAddress) return null;
      const { ResendEmailProvider } = await import("./resend");
      return new ResendEmailProvider(apiKey, email.fromAddress, email.fromName ?? "");
    }

    if (email.provider === "smtp") {
      const password = decryptString(email.smtpPassword ?? "");
      if (!email.smtpHost || !email.smtpUser || !email.fromAddress) return null;
      const { SmtpEmailProvider } = await import("./smtp");
      return new SmtpEmailProvider({
        host: email.smtpHost,
        port: email.smtpPort ?? 587,
        user: email.smtpUser,
        password,
        secure: email.smtpSecure ?? false,
        fromAddress: email.fromAddress,
        fromName: email.fromName ?? "",
      });
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * sendEmail()
 *
 * Convenience wrapper — gets the provider and sends in one call.
 * Returns { ok: false } silently when no provider is configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendResult> {
  const provider = await getEmailProvider();
  if (!provider) return { ok: false, error: "No email provider configured" };
  return provider.send(options);
}
