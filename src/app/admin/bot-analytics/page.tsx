import { notFound } from "next/navigation";
import { getConfig } from "@/lib/config";
import BotAnalyticsAdminPage from "../../../../plugins/bot-analytics/components/AdminPage";

export default async function BotAnalyticsPage() {
  const config = await getConfig();
  if (!config.modules.activePlugins.includes("bot-analytics")) {
    notFound();
  }
  return <BotAnalyticsAdminPage />;
}
