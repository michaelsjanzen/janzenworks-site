"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";


interface MonthlyRow {
  month: string;
  posts: number;
  pages: number;
}

interface StatusRow {
  name: string;
  value: number;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  lastActive: Date | null;
}

interface Props {
  monthly: MonthlyRow[];
  postStatus: StatusRow[];
  pageStatus: StatusRow[];
  totalMedia: number;
  unusedMedia: number;
  users: UserRow[];
}

const BLUE = "#3b82f6";
const VIOLET = "#a78bfa";

// ── inline components ──────────────────────────────────────────────────────────

function PublishedBar({ published, total, color }: { published: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((published / total) * 100);
  return (
    <div className="space-y-1 w-full">
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{published} published</span>
        <span>{total - published} draft</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  children,
}: {
  label: string;
  value: number | string;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border p-5 flex flex-col items-center text-center gap-3">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-bold" style={{ color }}>{value}</p>
      {children}
    </div>
  );
}

// ── main export ────────────────────────────────────────────────────────────────

export default function DashboardCharts({
  monthly,
  postStatus,
  pageStatus,
  totalMedia,
  unusedMedia,
  users,
}: Props) {
  const totalPosts = postStatus.reduce((s, r) => s + r.value, 0);
  const publishedPosts = postStatus.find(r => r.name === "Published")?.value ?? 0;
  const totalPages = pageStatus.reduce((s, r) => s + r.value, 0);
  const publishedPages = pageStatus.find(r => r.name === "Published")?.value ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Top stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Posts */}
        <StatCard label="Posts" value={totalPosts} color={BLUE}>
          <PublishedBar published={publishedPosts} total={totalPosts} color={BLUE} />
        </StatCard>

        {/* Pages */}
        <StatCard label="Pages" value={totalPages} color={VIOLET}>
          <PublishedBar published={publishedPages} total={totalPages} color={VIOLET} />
        </StatCard>

        {/* Media */}
        <div className="bg-white rounded-lg border p-5 flex flex-col items-center text-center gap-3">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Media</p>
          <p className="text-4xl font-bold text-zinc-700">{totalMedia}</p>
          <p className="text-xs text-zinc-500">
            {unusedMedia === 0
              ? "All files in use"
              : <><span className="font-semibold text-amber-600">{unusedMedia}</span> not used in any post</>}
          </p>
        </div>
      </div>

      {/* ── Activity chart ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border p-5">
        <p className="text-sm font-medium text-zinc-700 mb-4">Content created (last 12 months)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              cursor={{ fill: "#f8fafc" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="posts" name="Posts" fill={BLUE} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="pages" name="Pages" fill={VIOLET} radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Users table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <p className="text-sm font-medium text-zinc-700">Users</p>
          <a
            href="/admin/users/new"
            className="text-xs px-3 py-1.5 rounded-full bg-[var(--ds-blue-1000)] text-white hover:bg-[var(--ds-blue-900)] transition"
          >
            + New user
          </a>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Last active</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400 text-sm">No users yet.</td>
              </tr>
            )}
            {users.map(user => (
              <tr key={user.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800">{user.name || "—"}</td>
                <td className="px-4 py-3 text-zinc-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {user.lastActive
                    ? formatRelative(user.lastActive)
                    : <span className="text-zinc-300">Never</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/admin/users/${user.id}/edit`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Manage
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}
