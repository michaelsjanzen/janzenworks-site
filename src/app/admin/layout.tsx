import { getCurrentUser } from "@/lib/get-current-user";
import { getConfig } from "@/lib/config";
import { getAllPlugins } from "@/lib/plugin-registry";
import { getUnreadCountsByPlugin } from "@/lib/notifications";
import { loadPlugins } from "@/lib/plugin-loader";
import AdminShell from "@/components/admin/AdminShell";
import { existsSync, unlinkSync } from "fs";
import path from "path";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Middleware handles the redirect for all non-login admin routes.
  // This fallback covers the login page itself (no AdminShell needed)
  // and provides defence-in-depth if middleware is bypassed.
  if (!user) {
    return <>{children}</>;
  }

  // First-login cleanup: delete the setup-credentials.json file written by
  // replit-init. Runs on every authenticated admin request but is a fast
  // no-op once the file is gone.
  try {
    const credsFile = path.join(process.cwd(), "setup-credentials.json");
    if (existsSync(credsFile)) unlinkSync(credsFile);
  } catch {
    // Non-fatal — file may already be deleted or filesystem may be read-only
  }

  const [config, badges] = await Promise.all([
    getConfig(),
    getUnreadCountsByPlugin().catch(() => ({} as Record<string, number>)),
    loadPlugins(),
  ]);

  const activePlugins = getAllPlugins(
    config.modules.activePlugins,
    config.modules.pluginSettings ?? {}
  ).filter(p => p.isActive);

  return (
    <AdminShell
      user={{ username: user.name || user.email || "Account", role: user.role }}
      plugins={activePlugins.map(p => ({ id: p.id, name: p.name, actionHref: p.actionHref }))}
      badges={badges}
    >
      {children}
    </AdminShell>
  );
}
