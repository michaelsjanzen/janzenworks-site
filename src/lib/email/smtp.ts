import type { EmailProvider, SendEmailOptions, SendResult } from "./types";

/**
 * SmtpEmailProvider
 *
 * Sends email via any SMTP server using nodemailer.
 * Works with Gmail (App Password), Mailgun SMTP, Postmark, self-hosted Postfix, etc.
 *
 * Required config:
 *   host         — SMTP hostname (e.g. "smtp.mailgun.org")
 *   port         — SMTP port (25, 465, 587)
 *   user         — SMTP username
 *   password     — SMTP password
 *   secure       — true for TLS on connect (port 465); false for STARTTLS (port 587)
 *   fromAddress  — sender address
 *   fromName     — display name
 */
export class SmtpEmailProvider implements EmailProvider {
  constructor(
    private readonly config: {
      host: string;
      port: number;
      user: string;
      password: string;
      secure: boolean;
      fromAddress: string;
      fromName: string;
    }
  ) {}

  async send(options: SendEmailOptions): Promise<SendResult> {
    // Dynamic import keeps nodemailer out of the bundle when SMTP is not configured.
    const nodemailer = (await import("nodemailer")).default;

    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
    });

    const from = this.config.fromName
      ? `${this.config.fromName} <${this.config.fromAddress}>`
      : this.config.fromAddress;

    try {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        ...(options.html ? { html: options.html } : {}),
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      });

      return { ok: true, messageId: info.messageId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}
