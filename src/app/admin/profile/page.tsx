import { getCurrentUser } from "@/lib/get-current-user";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateProfile, changePassword, saveAuthorVoice } from "@/lib/actions/users";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; toast?: string; error?: string }>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin/login");

  const dbUser = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, String(currentUser.id)),
  });
  if (!dbUser) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Profile</h2>

      {/* Success / error banners */}
      {(params.saved || params.toast === "saved") && (
        <div className="bg-emerald-600 rounded-lg px-4 py-3 text-sm text-white">
          Changes saved successfully.
        </div>
      )}
      {params.error && (
        <div className="bg-red-600 rounded-lg px-4 py-3 text-sm text-white">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {/* Profile info */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 mb-1">
          <h3 className="font-semibold text-zinc-800">Profile Information</h3>
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            dbUser.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-zinc-100 text-zinc-600"
          }`}>
            {dbUser.role}
          </span>
        </div>
        <form action={updateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              name="name"
              required
              defaultValue={dbUser.name || ""}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={dbUser.email}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm"
          >
            Save Profile
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-zinc-800 border-b pb-3">Change Password</h3>
        <form action={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Current Password</label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">New Password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Confirm New Password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-zinc-800 text-white px-5 py-2 rounded hover:bg-zinc-900 text-sm"
          >
            Change Password
          </button>
        </form>
      </section>

      {/* Author's Voice */}
      <section className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
        <div className="border-b pb-3">
          <h3 className="font-semibold text-zinc-800">Author&apos;s Voice</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Describe your writing style, tone, and preferences. The AI will use this as a style guide when refining your content. You can update this anytime.
          </p>
        </div>
        <form action={saveAuthorVoice} className="space-y-4">
          <textarea
            name="authorVoice"
            rows={6}
            defaultValue={dbUser.authorVoice ?? ""}
            placeholder={`Example:\n"Write in a conversational but authoritative tone. Use short paragraphs and clear headings. Avoid jargon. My audience is technical but prefers plain language. I prefer active voice and concrete examples over abstract explanations."`}
            className="w-full border rounded px-3 py-2 text-sm resize-y font-sans"
          />
          <button type="submit" className="bg-[var(--ds-blue-1000)] text-white px-5 py-2 rounded-full hover:bg-[var(--ds-blue-900)] text-sm">
            Save Voice Guide
          </button>
        </form>
      </section>

      {/* Account info (read-only) */}
      <section className="bg-zinc-50 border rounded-lg p-4 text-sm text-zinc-500">
        <p>Account created: {new Date(dbUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </section>
    </div>
  );
}
