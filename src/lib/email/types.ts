export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body. Falls back to `text` when omitted. */
  html?: string;
  /** Reply-to address (e.g. the contact form submitter's email). */
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  /**
   * Send an email. Never throws — errors are returned in `SendResult.error`.
   */
  send(options: SendEmailOptions): Promise<SendResult>;
}
