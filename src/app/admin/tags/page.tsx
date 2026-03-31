import { db } from "@/lib/db";
import { tags, postTags } from "@/lib/db/schema";
import { eq, count, asc, desc } from "drizzle-orm";
import { createTag } from "@/lib/actions/tags";
import DeleteTagButton from "./DeleteTagButton";
import Link from "next/link";

type SortCol = "name" | "slug" | "postCount";
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

export default async function TagsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sortCol = (["name", "slug", "postCount"].includes(sp.sort ?? "") ? sp.sort : "name") as SortCol;
  const sortDir = sp.dir === "desc" ? "desc" : "asc";

  const order = (col: typeof tags.name | typeof tags.slug) =>
    sortDir === "asc" ? asc(col) : desc(col);

  const allTags = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      postCount: count(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(
      sortCol === "postCount"
        ? sortDir === "asc" ? asc(count(postTags.postId)) : desc(count(postTags.postId))
        : sortCol === "slug" ? order(tags.slug)
        : order(tags.name)
    );

  const th = "text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wide";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Tags</h1>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">

        {/* Add row */}
        <form action={createTag}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 p-4 border-b border-zinc-200 bg-zinc-50">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Name</label>
              <input
                name="name"
                required
                placeholder="e.g. javascript"
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
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full sm:w-auto whitespace-nowrap bg-[var(--ds-blue-1000)] text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[var(--ds-blue-900)] transition-colors"
              >
                Add tag
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
              <th className={th}>
                <Link href={sortHref(sortCol, sortDir, "postCount")} className="hover:text-zinc-700 inline-flex items-center">
                  Posts {colIcon(sortCol, "postCount", sortDir)}
                </Link>
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {allTags.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No tags yet. Add one above.
                </td>
              </tr>
            ) : (
              allTags.map(tag => (
                <tr key={tag.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{tag.name}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{tag.slug}</td>
                  <td className="px-4 py-3 text-zinc-500">{tag.postCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/tags/${tag.id}/edit`} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">Edit</Link>
                      <DeleteTagButton id={tag.id} name={tag.name} />
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
