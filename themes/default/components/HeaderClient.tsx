"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavItem { label: string; path: string }

type HeaderIdentity = "logo-only" | "name-only" | "logo-and-name";

interface Props {
  siteName: string;
  logoUrl: string | null;
  headerIdentity: HeaderIdentity;
  navItems: NavItem[];
}

function isActive(itemPath: string, pathname: string): boolean {
  if (itemPath === "/") return pathname === "/";
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}

export default function HeaderClient({ siteName, logoUrl, headerIdentity, navItems }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const showLogo = logoUrl && headerIdentity !== "name-only";
  const showName = headerIdentity === "name-only" || headerIdentity === "logo-and-name" || !logoUrl;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-background)]/80 border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / name */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          {showLogo && (
            <Image src={logoUrl!} alt={siteName} height={32} width={200} className="h-8 w-auto object-contain" />
          )}
          {showName && (
            <span className="text-lg font-bold tracking-tight text-[var(--color-foreground)]">{siteName}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <Link
              key={item.path}
              href={item.path}
              className={`text-sm transition ${
                isActive(item.path, pathname)
                  ? "text-[var(--color-foreground)] font-medium"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-md text-sm transition ${
                  isActive(item.path, pathname)
                    ? "bg-[var(--color-surface)] text-[var(--color-foreground)] font-medium"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
