import { notFound } from "next/navigation";
import { getConfig } from "@/lib/config";
import BotAnalyticsAdminPage from "../../../../plugins/bot-analytics/components/AdminPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "AEO Analytics" };

export default async function BotAnalyticsPage() {
  const config = await getConfig();
  if (!config.modules.activePlugins.includes("bot-analytics")) {
    notFound();
  }
  return <BotAnalyticsAdminPage />;
}
