import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { detectSetupUrl, isDevUrl } from "@/lib/detect-site-url";
import SetupWizard from "./SetupWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup — Pugmill CMS",
};

export default async function SetupPage() {
  // DB gate: if any admin exists, this setup has already been completed
  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (existing.length > 0) {
    redirect("/admin/login");
  }

  const detectedUrl = detectSetupUrl() ?? "";
  const currentSecret = process.env.NEXTAUTH_SECRET ?? "";
  // On Replit the agent saves NEXTAUTH_SECRET as a platform secret — hide the
  // manual secret section so users don't copy a stale value or hit Regenerate
  // (which would write a new value that isn't saved as a Replit secret).
  const isReplit = !!(
    process.env.REPL_SLUG ||
    process.env.REPLIT_DEV_DOMAIN ||
    process.env.REPLIT_CLUSTER
  );
  // REPLIT_DEPLOYMENT="1" is set in production containers — never show the dev
  // warning there even if the URL pattern matches (Replit prod URLs also use .replit.dev).
  const isReplitProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const isDevEnvironment = !isReplitProduction && isDevUrl(detectedUrl);

  return (
    <div className="min-h-screen bg-zinc-50">
      {isDevEnvironment && (
        <div className="bg-amber-50 border-b-2 border-amber-400 px-6 py-4">
          <p className="text-sm font-semibold text-amber-900 mb-1">
            ⚠ You are running setup on a development environment
          </p>
          <p className="text-sm text-amber-800">
            This appears to be a Replit dev preview (<code className="bg-amber-100 px-1 rounded font-mono text-xs">{detectedUrl}</code>).
            Dev and production use <strong>separate databases</strong> — any account created here will not exist in production.
          </p>
          <p className="text-sm text-amber-800 mt-1">
            <strong>Recommended:</strong> Deploy your app first, then visit <code className="bg-amber-100 px-1 rounded font-mono text-xs">/setup</code> on your production URL to create your admin account.
          </p>
        </div>
      )}
      <SetupWizard detectedUrl={detectedUrl} currentSecret={currentSecret} hideSecret={isReplit} />
    </div>
  );
}
