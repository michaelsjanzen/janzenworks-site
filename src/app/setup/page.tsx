import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { detectSiteUrl } from "@/lib/detect-site-url";
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

  const detectedUrl = detectSiteUrl() ?? "";
  const currentSecret = process.env.NEXTAUTH_SECRET ?? "";

  return (
    <div className="min-h-screen bg-zinc-50">
      <SetupWizard detectedUrl={detectedUrl} currentSecret={currentSecret} />
    </div>
  );
}
