import { getConfig } from "../../../src/lib/config";
import { SOCIAL_PLATFORM_MAP } from "../../../src/lib/social-platforms";
import Link from "next/link";

export default async function Footer() {
  const config = await getConfig();
  const socialLinks = (config.site.socialLinks ?? []) as { platform: string; url: string }[];
  const footerNav = (config.appearance.footerNavigation ?? []) as { label: string; path: string }[];

  return (
    <footer
      className="mt-16 border-t border-[var(--color-border)]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {footerNav.length > 0 && (
          <nav className="flex flex-wrap gap-x-6 gap-y-1">
            {footerNav.map(item => (
              <Link
                key={item.path}
                href={item.path}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-muted)]">
            <span className="text-[var(--color-accent)]">$</span>{" "}
            &copy; {new Date().getFullYear()} {config.site.name}
            {config.site.showPoweredBy !== false && (
              <> &middot; <a href="https://pugmillcms.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-foreground)] transition-colors">pugmill</a></>
            )}
          </p>

          {socialLinks.length > 0 && (
            <div className="flex items-center gap-4">
              {socialLinks.map((item, i) => {
                const platform = SOCIAL_PLATFORM_MAP.get(item.platform);
                return (
                  <Link
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={platform?.label ?? item.platform}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
                  >
                    {platform?.label ?? item.platform}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </footer>
  );
}
