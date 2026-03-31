import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/get-current-user";
import { asc, desc } from "drizzle-orm";
import DeleteUserButton from "./DeleteUserButton";

type SortCol = "name" | "email" | "role" | "joined";
type SortDir = "asc" | "desc";

function colIcon(current: SortCol, col: SortCol, dir: SortDir) {
  if (current !== col) return <span className="ml-1 text-zinc-300">↕</span>;
  return <span className="ml-1 text-zinc-600">{dir === "asc" ? "↑" : "↓"}</span>;
}

function sortHref(current: SortCol, dir: SortDir, col: SortCol) {
  const nextDir = current === col && dir === "asc" ? "desc" : "asc";
  return `?sort=${col}&dir=${nextDir}`;
}

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function UsersPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") redirect("/admin");

  const sp = await searchParams;
  const sortCol = (["name", "email", "role", "joined"].includes(sp.sort ?? "") ? sp.sort : "joined") as SortCol;
  const sortDir = sp.dir === "desc" ? "desc" : "asc";

  const orderBy =
    sortCol === "name" ? (sortDir === "asc" ? asc(adminUsers.name) : desc(adminUsers.name))
    : sortCol === "email" ? (sortDir === "asc" ? asc(adminUsers.email) : desc(adminUsers.email))
    : sortCol === "role" ? (sortDir === "asc" ? asc(adminUsers.role) : desc(adminUsers.role))
    : (sortDir === "asc" ? asc(adminUsers.createdAt) : desc(adminUsers.createdAt));

  const allUsers = await db.select({
    id: adminUsers.id,
    name: adminUsers.name,
    email: adminUsers.email,
    role: adminUsers.role,
    createdAt: adminUsers.createdAt,
  }).from(adminUsers).orderBy(orderBy);

  const th = "text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wide";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Users</h1>
        <Link
          href="/admin/users/new"
          className="bg-[var(--ds-blue-1000)] text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[var(--ds-blue-900)] transition-colors"
        >
          + New User
        </Link>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "name")} className="hover:text-zinc-700 inline-flex items-center">
                  Name {colIcon(sortCol, "name", sortDir)}
                </Link>
              </th>
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "email")} className="hover:text-zinc-700 inline-flex items-center">
                  Email {colIcon(sortCol, "email", sortDir)}
                </Link>
              </th>
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "role")} className="hover:text-zinc-700 inline-flex items-center">
                  Role {colIcon(sortCol, "role", sortDir)}
                </Link>
              </th>
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "joined")} className="hover:text-zinc-700 inline-flex items-center">
                  Joined {colIcon(sortCol, "joined", sortDir)}
                </Link>
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {allUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No users found.
                </td>
              </tr>
            ) : (
              allUsers.map(user => (
                <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {user.name || <span className="text-zinc-300">—</span>}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-zinc-400">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/users/${user.id}/edit`} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">Edit</Link>
                      {user.id !== currentUser?.id && <DeleteUserButton id={user.id} name={user.name ?? user.email} />}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
