import type { Metadata } from "next";

export const metadata: Metadata = { title: "New User" };

import { createUser } from "@/lib/actions/users";
import Link from "next/link";

export default function NewUserPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="text-sm text-zinc-500 hover:text-zinc-700">← Users</Link>
        <h2 className="text-2xl font-bold">New User</h2>
      </div>

      <form action={createUser} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
          <input
            name="name"
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Minimum 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
          <select name="role" className="w-full border rounded px-3 py-2 text-sm bg-white">
            <option value="editor">Editor — can create and edit posts</option>
            <option value="admin">Admin — full access</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm"
          >
            Create User
          </button>
          <Link href="/admin/users" className="px-5 py-2 rounded border text-sm text-zinc-600 hover:bg-zinc-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
