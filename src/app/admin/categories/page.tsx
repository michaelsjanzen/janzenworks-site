import type { Metadata } from "next";

export const metadata: Metadata = { title: "Categories" };

import { db } from "@/lib/db";
import { categories, postCategories } from "@/lib/db/schema";
import { eq, count, asc, desc } from "drizzle-orm";
import { createCategory } from "@/lib/actions/categories";
import DeleteCategoryButton from "./DeleteCategoryButton";
import Link from "next/link";

type SortCol = "name" | "slug" | "description" | "postCount";
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

export default async function CategoriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sortCol = (["name", "slug", "description", "postCount"].includes(sp.sort ?? "") ? sp.sort : "name") as SortCol;
  const sortDir = sp.dir === "desc" ? "desc" : "asc";

  const order = (col: typeof categories.name | typeof categories.slug | typeof categories.description) =>
    sortDir === "asc" ? asc(col) : desc(col);

  const allCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: count(postCategories.postId),
    })
    .from(categories)
    .leftJoin(postCategories, eq(postCategories.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(
      sortCol === "postCount"
        ? sortDir === "asc" ? asc(count(postCategories.postId)) : desc(count(postCategories.postId))
        : sortCol === "slug" ? order(categories.slug)
        : sortCol === "description" ? order(categories.description)
        : order(categories.name)
    );

  const th = "text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wide";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Categories</h1>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">

        {/* Add row */}
        <form action={createCategory}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.5fr_auto] gap-3 p-4 border-b border-zinc-200 bg-zinc-50">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Technology"
                className="w-full border border-zinc-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Slug <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                name="slug"
                placeholder="auto-generated"
                className="w-full border border-zinc-200 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Description <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                name="description"
                placeholder="Brief description…"
                className="w-full border border-zinc-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full sm:w-auto whitespace-nowrap bg-[var(--ds-blue-1000)] text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[var(--ds-blue-900)] transition-colors"
              >
                Add category
              </button>
            </div>
          </div>
        </form>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "name")} className="hover:text-zinc-700 inline-flex items-center">
                  Name {colIcon(sortCol, "name", sortDir)}
                </Link>
              </th>
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "slug")} className="hover:text-zinc-700 inline-flex items-center">
                  Slug {colIcon(sortCol, "slug", sortDir)}
                </Link>
              </th>
              <th className={`${th} hidden sm:table-cell`}>
                <Link href={sortHref(sortCol, sortDir, "description")} className="hover:text-zinc-700 inline-flex items-center">
                  Description {colIcon(sortCol, "description", sortDir)}
                </Link>
              </th>
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "postCount")} className="hover:text-zinc-700 inline-flex items-center">
                  Posts {colIcon(sortCol, "postCount", sortDir)}
                </Link>
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {allCategories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No categories yet. Add one above.
                </td>
              </tr>
            ) : (
              allCategories.map(cat => (
                <tr key={cat.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{cat.name}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{cat.description ?? <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3 text-zinc-500">{cat.postCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/categories/${cat.id}/edit`} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">Edit</Link>
                      <DeleteCategoryButton id={cat.id} name={cat.name} />
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
