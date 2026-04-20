"use client";
import { Suspense, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AdminToast from "./AdminToast";
import AnnouncementBanner from "./AnnouncementBanner";
import CommandPalette from "./CommandPalette";

const POLL_INTERVAL_MS = 30_000;

interface Props {
  user: { username: string; role: string };
  siteName?: string;
  children: React.ReactNode;
  plugins?: { id: string; name: string; actionHref?: string }[];
  themes?: { id: string; name: string; isActive: boolean }[];
  badges?: Record<string, number>;
  announcement?: string;
}

export default function AdminShell({ user, siteName = "Pugmill", children, plugins = [], themes = [], badges: initialBadges = {}, announcement }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>(initialBadges);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch("/api/admin/badge-counts");
        if (res.ok) setBadges(await res.json());
      } catch {
        // silently ignore — stale badges are acceptable
      }
    }

    // Refetch when tab regains focus
    function onVisibilityChange() {
      if (document.visibilityState === "visible") fetchBadges();
    }

    // Refetch when any action dispatches this event (e.g. after approving a comment)
    function onActionComplete() {
      fetchBadges();
    }

    const id = setInterval(fetchBadges, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pugmill:badges:refresh", onActionComplete);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pugmill:badges:refresh", onActionComplete);
    };
  }, []);

  return (
    <div data-admin className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} plugins={plugins} themes={themes} badges={badges} siteName={siteName} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {announcement && (
          <AnnouncementBanner message={announcement} id={announcement.slice(0, 40)} />
        )}
        <TopBar user={user} onMenuClick={() => setSidebarOpen(true)} siteName={siteName} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 bg-zinc-50">
          {children}
        </main>
      </div>

      <Suspense>
        <AdminToast />
      </Suspense>

      <CommandPalette plugins={plugins} />
    </div>
  );
}
