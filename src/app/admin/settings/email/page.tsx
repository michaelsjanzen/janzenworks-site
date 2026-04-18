import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getConfig } from "@/lib/config";
import { saveEmailSettings } from "@/lib/actions/email";
import { PageShell, Field, SaveButton } from "../_components";
import { ToggleField } from "../_components";
import TestEmailButton from "./TestEmailButton";

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const [config, sp] = await Promise.all([getConfig(), searchParams]);
  const email = config.email;
  const saved = sp.toast === "saved";
  const isConfigured = !!email?.provider;

  return (
    <PageShell title="Email" description="Send notification emails from your CMS." saved={saved}>

      {isConfigured && (
        <div className="bg-emerald-600 rounded-lg px-4 py-3 text-sm text-white">
          Email is active — provider: <strong>{email.provider}</strong>
          {email.fromAddress ? `, from: ${email.fromAddress}` : ""}
        </div>
      )}

      <form action={saveEmailSettings} className="space-y-8">

        {/* Provider selection */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-700">Provider</h3>
          <p className="text-xs text-zinc-400 -mt-2">
            Leave disabled to use the CMS without email. Contact form submissions will still appear in the admin inbox.
          </p>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email provider</label>
            <select
              name="provider"
              defaultValue={email?.provider ?? ""}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">— Disabled —</option>
              <option value="resend">Resend</option>
              <option value="smtp">SMTP</option>
            </select>
          </div>
        </div>

        {/* Shared sender / recipient */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-700">Sender &amp; recipient</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="From name"
              name="fromName"
              defaultValue={email?.fromName}
              placeholder="My Blog"
              hint="Display name in the From header."
            />
            <Field
              label="From address"
              name="fromAddress"
              defaultValue={email?.fromAddress}
              placeholder="noreply@yourdomain.com"
              hint="Must be a verified sender for Resend, or your SMTP account address."
            />
          </div>
          <Field
            label="Notification destination"
            name="toAddress"
            defaultValue={email?.toAddress}
            placeholder="you@yourdomain.com"
            hint="Where CMS notifications are delivered (contact form, etc.)."
          />
        </div>

        {/* Resend */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-700">Resend</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Get an API key at resend.com. No egress fees. Free tier: 100 emails/day.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">API key</label>
            <input
              name="apiKey"
              type="password"
              defaultValue={email?.apiKey ? "__REDACTED__" : ""}
              placeholder={email?.apiKey ? "Key saved — paste new key to change" : "re:..."}
              autoComplete="off"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
        </div>

        {/* SMTP */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-700">SMTP</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Works with Gmail App Passwords, Mailgun, Postmark, Brevo, or any self-hosted server.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field
                label="Host"
                name="smtpHost"
                defaultValue={email?.smtpHost}
                placeholder="smtp.mailgun.org"
              />
            </div>
            <Field
              label="Port"
              name="smtpPort"
              defaultValue={String(email?.smtpPort ?? 587)}
              placeholder="587"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Username"
              name="smtpUser"
              defaultValue={email?.smtpUser}
              placeholder="postmaster@yourdomain.com"
            />
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
              <input
                name="smtpPassword"
                type="password"
                defaultValue={email?.smtpPassword ? "__REDACTED__" : ""}
                placeholder={email?.smtpPassword ? "Password saved — paste new password to change" : ""}
                autoComplete="off"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </div>
          <ToggleField
            label="TLS on connect (port 465)"
            name="smtpSecure"
            hint="Enable for port 465. Leave off for port 587 (STARTTLS)."
            defaultChecked={email?.smtpSecure ?? false}
          />
        </div>

        <SaveButton label="Save email settings" />
      </form>

      {/* Test — only shown when a provider is configured */}
      {isConfigured && (
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700">Test connection</h3>
          <p className="text-xs text-zinc-400">
            Sends a test email to your notification destination address.
          </p>
          <TestEmailButton />
        </div>
      )}
    </PageShell>
  );
}
