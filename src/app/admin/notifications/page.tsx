import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications" };

import { listNotifications, markAllNotificationsRead } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { NotificationRow } from "@/lib/notifications";

async function markAllRead() {
  "use server";
  await markAllNotificationsRead();
  revalidatePath("/admin/notifications");
  redirect("/admin/notifications");
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const typeStyles: Record<string, string> = {
  info: "bg-[var(--ds-blue-1000)] text-white",
  warning: "bg-amber-700 text-white",
  error: "bg-red-600 text-white",
};

function NotificationRow({ n }: { n: NotificationRow }) {
  const style = typeStyles[n.type] ?? typeStyles.info;
  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg border ${n.read ? "bg-white border-zinc-100" : "bg-zinc-50 border-zinc-200"}`}>
      <span className={`mt-0.5 inline-block text-xs font-medium px-1.5 py-0.5 rounded border ${style} shrink-0`}>
        {n.type}
      </span>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={`text-sm ${n.read ? "text-zinc-500" : "text-zinc-800 font-medium"}`}>
          {n.message}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{n.pluginId}</span>
          <span>·</span>
          <span>{timeAgo(n.createdAt)}</span>
          {!n.read && (
            <>
              <span>·</span>
              <span className="text-blue-500 font-medium">unread</span>
            </>
          )}
        </div>
      </div>
      {n.href && (
        <a
          href={n.href}
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded px-2 py-1 hover:bg-zinc-50 transition"
        >
          View →
        </a>
      )}
    </div>
  );
}

export default async function NotificationsPage() {
  const notifications = await listNotifications({ limit: 100 });
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-zinc-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-3 py-1.5 hover:bg-zinc-50 transition"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-lg p-8 text-center">
          <p className="text-sm text-zinc-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <NotificationRow key={n.id} n={n} />
          ))}
        </div>
      )}
    </div>
  );
}
