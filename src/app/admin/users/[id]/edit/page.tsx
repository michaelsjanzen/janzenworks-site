import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateUser, saveUserAuthorVoice } from "@/lib/actions/users";
import Link from "next/link";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, id),
  });
  if (!user) notFound();

  const action = updateUser.bind(null, id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="text-sm text-zinc-500 hover:text-zinc-700">← Users</Link>
        <h2 className="text-2xl font-bold">Edit User</h2>
      </div>

      <form action={action} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4" id="edit-user-form">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
          <input
            name="name"
            required
            defaultValue={user.name || ""}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={user.email}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
          <select name="role" defaultValue={user.role} className="w-full border rounded px-3 py-2 text-sm bg-white">
            <option value="editor">Editor — can create and edit posts</option>
            <option value="admin">Admin — full access</option>
          </select>
        </div>
        <p className="text-xs text-zinc-400">To change this user&apos;s password, ask them to use their Profile page.</p>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm"
          >
            Save Changes
          </button>
          <Link href="/admin/users" className="px-5 py-2 rounded border text-sm text-zinc-600 hover:bg-zinc-50">
            Cancel
          </Link>
        </div>
      </form>

      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <div className="border-b pb-3">
          <h3 className="font-semibold text-zinc-800">Author&apos;s Voice</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Style guide used by AI when refining this author&apos;s content. The author can also edit this from their Profile page.
          </p>
        </div>
        <form action={saveUserAuthorVoice.bind(null, id)} className="space-y-4">
          <textarea
            name="authorVoice"
            rows={5}
            defaultValue={user.authorVoice ?? ""}
            placeholder="Describe this author's writing voice and style preferences..."
            className="w-full border rounded px-3 py-2 text-sm resize-y"
          />
          <button type="submit" className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm">
            Save Voice Guide
          </button>
        </form>
      </section>
    </div>
  );
}
