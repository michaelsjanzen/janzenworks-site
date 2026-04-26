import { getConfig } from "../../../src/lib/config";
import { SOCIAL_PLATFORM_MAP } from "../../../src/lib/social-platforms";
import Link from "next/link";

export default async function Footer() {
  const config = await getConfig();
  const socialLinks = (config.site.socialLinks ?? []) as { platform: string; url: string }[];
  const footerNav = (config.appearance.footerNavigation ?? []) as { label: string; path: string }[];

  return (
    <footer className="border-t border-[var(--color-border)] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Footer nav links */}
        {footerNav.length > 0 && (
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerNav.map(item => (
              <Link
                key={item.path}
                href={item.path}
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-muted)]">
            &copy; {new Date().getFullYear()} {config.site.name}.
            {config.site.showPoweredBy !== false && (
              <> · <a href="https://pugmillcms.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-foreground)] transition-colors">Made with Pugmill</a></>
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
                    className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition"
                  >
                    {platform?.icon ?? <span className="text-xs capitalize">{item.platform}</span>}
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
