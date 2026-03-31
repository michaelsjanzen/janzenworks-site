"use client";
import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";
import DarkModeToggle from "./DarkModeToggle";

function CommandTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors bg-zinc-50 dark:bg-zinc-800"
      aria-label="Open command palette"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      Search or jump to…
      <kbd className="ml-1 font-mono text-zinc-300 dark:text-zinc-600">⌘K</kbd>
    </button>
  );
}

interface Props {
  user: { username: string; role: string };
  onMenuClick: () => void;
}

export default function TopBar({ user, onMenuClick }: Props) {
  return (
    <header className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left — hamburger + wordmark on mobile */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">Pugmill</span>
      </div>

      {/* Center — command palette trigger (desktop) */}
      <CommandTrigger />

      {/* Spacer on desktop (hidden when command trigger shows) */}
      <div className="hidden" />

      {/* Right — user actions */}
      <div className="flex items-center gap-4 text-sm">
        <DarkModeToggle />
        <span className="text-zinc-200 dark:text-zinc-700 hidden sm:block">|</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors hidden sm:flex items-center gap-1"
        >
          View Site
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <span className="text-zinc-200 dark:text-zinc-700 hidden sm:block">|</span>
        <Link
          href="/admin/profile"
          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors hidden sm:block"
        >
          {user.username}
        </Link>
        <span className="text-zinc-200 dark:text-zinc-700 hidden sm:block">|</span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-sm"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
