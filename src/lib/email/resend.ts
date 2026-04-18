import type { EmailProvider, SendEmailOptions, SendResult } from "./types";

/**
 * ResendEmailProvider
 *
 * Sends email via the Resend REST API using native fetch — no SDK dependency.
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Required config:
 *   apiKey       — Resend API key (re:...)
 *   fromAddress  — verified sender address (e.g. "noreply@yourdomain.com")
 *   fromName     — display name (e.g. "My Site")
 */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
    private readonly fromName: string,
  ) {}

  async send(options: SendEmailOptions): Promise<SendResult> {
    const from = this.fromName
      ? `${this.fromName} <${this.fromAddress}>`
      : this.fromAddress;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          ...(options.html ? { html: options.html } : {}),
          ...(options.replyTo ? { reply_to: options.replyTo } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, error: `Resend API error ${res.status}: ${body}` };
      }

      const data = await res.json() as { id?: string };
      return { ok: true, messageId: data.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}
