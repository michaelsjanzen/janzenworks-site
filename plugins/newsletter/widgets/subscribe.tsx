import type { WidgetDef } from "../../../src/types/widget";
import SubscribeForm from "../components/SubscribeForm";

/**
 * Newsletter subscribe form widget.
 * Renders the email opt-in form in any widget area (post footer, sidebars).
 * Label and description are configurable per-instance in the widget settings.
 */
export const subscribeWidget: WidgetDef = {
  id: "newsletter-subscribe",
  label: "Newsletter Subscribe Form",
  description: "Email opt-in form. Adds subscribers to your newsletter list.",
  areas: ["post-footer", "sidebar-post", "sidebar-page"],
  configSchema: {
    label: {
      type: "text",
      label: "Heading",
      default: "Subscribe",
    },
    description: {
      type: "text",
      label: "Description",
      default: "Get new posts delivered to your inbox.",
    },
  },
  async component(_ctx, settings) {
    const label       = settings.label       || "Subscribe";
    const description = settings.description || "Get new posts delivered to your inbox.";
    return <SubscribeForm label={label} description={description} />;
  },
};
