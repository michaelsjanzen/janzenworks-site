import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateCategory } from "@/lib/actions/categories";
import Link from "next/link";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await db.query.categories.findFirst({ where: eq(categories.id, parseInt(id)) });
  if (!category) notFound();

  const action = updateCategory.bind(null, category.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/categories" className="text-sm text-zinc-500 hover:text-zinc-700">← Categories</Link>
        <h2 className="text-2xl font-bold">Edit Category</h2>
      </div>
      <form action={action} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
          <input name="name" required defaultValue={category.name} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Slug</label>
          <input name="slug" defaultValue={category.slug} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
          <textarea name="description" rows={3} defaultValue={category.description || ""} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm">Save</button>
          <Link href="/admin/categories" className="px-5 py-2 rounded border text-sm text-zinc-600 hover:bg-zinc-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
