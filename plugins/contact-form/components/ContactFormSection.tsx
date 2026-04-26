import { getConfig } from "../../../src/lib/config";
import type { PostFooterSlotProps } from "../../../src/lib/plugin-registry";
import ContactFormUI from "./ContactFormUI";

/**
 * Renders the contact form at the bottom of the designated page.
 * Only active on the page whose slug matches the `pageSlug` setting (default: "contact").
 * Site owners create a standard page with that slug — no special setup required.
 */
export default async function ContactFormSection({ postSlug }: PostFooterSlotProps) {
  const config = await getConfig();

  if (!config.modules.activePlugins.includes("contact-form")) return null;

  const settings = config.modules.pluginSettings?.["contact-form"] ?? {};
  const pageSlug = (settings.pageSlug as string) || "contact";

  // Only render on the designated contact page
  if (postSlug !== pageSlug) return null;

  const showPhone = settings.showPhone !== false;
  const requirePhone = settings.requirePhone === true;
  const showSocialUrl = settings.showSocialUrl !== false;
  const requireSocialUrl = settings.requireSocialUrl === true;

  return (
    <section
      className="mt-12 space-y-6 border-t pt-10"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div>
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--color-foreground)" }}
        >
          Get in touch
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-muted)" }}
        >
          Fill in the form below and we'll get back to you.
        </p>
      </div>
      <ContactFormUI
        showPhone={showPhone}
        requirePhone={requirePhone}
        showSocialUrl={showSocialUrl}
        requireSocialUrl={requireSocialUrl}
      />
    </section>
  );
}
