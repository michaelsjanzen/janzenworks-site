import { getConfig } from "../../../src/lib/config";
import SubscribeForm from "./SubscribeForm";
import type { PostFooterSlotProps } from "../../../src/lib/plugin-registry";

export default async function SubscribeFormWrapper(props: PostFooterSlotProps) {
  const config = await getConfig();

  if (!config.modules.activePlugins.includes("newsletter")) return null;

  const settings = config.modules.pluginSettings?.["newsletter"] ?? {};
  const showInPostFooter = settings.showInPostFooter !== false; // default true
  if (!showInPostFooter) return null;

  const label       = (settings.footerLabel       as string) || "Subscribe";
  const description = (settings.footerDescription as string) || "Get new posts delivered to your inbox.";

  return <SubscribeForm {...props} label={label} description={description} />;
}
