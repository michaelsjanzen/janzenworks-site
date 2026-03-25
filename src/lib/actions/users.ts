"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/get-current-user";
import { auditLog } from "@/lib/audit-log";
import bcrypt from "bcryptjs";
import { z } from "zod";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized: admin role required");
  return user;
}

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  role: z.enum(["admin", "editor"]),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "editor"]),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(12, "New password must be at least 12 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Admin: create a new user
export async function createUser(formData: FormData) {
  const admin = await requireAdmin();

  const result = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map(i => i.message).join(", "));
  }

  // Check email not already in use
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, result.data.email),
  });
  if (existing) throw new Error("A user with this email already exists");

  const passwordHash = await bcrypt.hash(result.data.password, 12);

  await db.insert(adminUsers).values({
    name: result.data.name,
    email: result.data.email,
    passwordHash,
    role: result.data.role,
  } as typeof adminUsers.$inferInsert);

  auditLog({ action: "user.create", userId: admin.id, detail: `Created user: ${result.data.email}` });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// Admin: update any user's name, email, role
export async function updateUser(targetId: string, formData: FormData) {
  const admin = await requireAdmin();

  const result = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map(i => i.message).join(", "));
  }

  // Check email not taken by another user
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, result.data.email),
  });
  if (existing && existing.id !== targetId) {
    throw new Error("Email already in use by another user");
  }

  await db.update(adminUsers)
    .set({ name: result.data.name, email: result.data.email, role: result.data.role } as Partial<typeof adminUsers.$inferInsert>)
    .where(eq(adminUsers.id, targetId));

  auditLog({ action: "user.update", userId: admin.id, resourceId: targetId, detail: `Updated user: ${result.data.email}` });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// Admin: delete a user (cannot delete yourself)
export async function deleteUser(targetId: string) {
  const admin = await requireAdmin();

  if (String(admin.id) === targetId) {
    throw new Error("You cannot delete your own account");
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, targetId));

  auditLog({ action: "user.delete", userId: admin.id, resourceId: targetId });
  revalidatePath("/admin/users");
}

// Any user: update their own profile (name and email only)
export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const profileSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
  });

  const result = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!result.success) {
    throw new Error(result.error.issues.map(i => i.message).join(", "));
  }

  // Check email not taken by another user
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, result.data.email),
  });
  if (existing && existing.id !== String(user.id)) {
    throw new Error("Email already in use");
  }

  await db.update(adminUsers)
    .set({ name: result.data.name, email: result.data.email } as Partial<typeof adminUsers.$inferInsert>)
    .where(eq(adminUsers.id, String(user.id)));

  auditLog({ action: "user.update", userId: user.id, detail: "Updated own profile" });
  revalidatePath("/admin/profile");
  redirect("/admin/profile?saved=1");
}

const authorVoiceSchema = z.object({
  authorVoice: z.string().max(10000),
});

// Any user: save their own Author's Voice style guide
export async function saveAuthorVoice(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = authorVoiceSchema.safeParse({ authorVoice: (formData.get("authorVoice") as string) ?? "" });
  if (!result.success) throw new Error(result.error.issues.map(i => i.message).join(", "));

  await db.update(adminUsers)
    .set({ authorVoice: result.data.authorVoice } as Partial<typeof adminUsers.$inferInsert>)
    .where(eq(adminUsers.id, String(user.id)));

  auditLog({ action: "user.update", userId: user.id, detail: "Updated Author's Voice" });
  revalidatePath("/admin/profile");
  revalidatePath("/admin");
  redirect("/admin/profile?toast=saved");
}

// Admin: save another user's Author's Voice
export async function saveUserAuthorVoice(targetId: string, formData: FormData) {
  await requireAdmin();
  const result = authorVoiceSchema.safeParse({ authorVoice: (formData.get("authorVoice") as string) ?? "" });
  if (!result.success) throw new Error(result.error.issues.map(i => i.message).join(", "));

  await db.update(adminUsers)
    .set({ authorVoice: result.data.authorVoice } as Partial<typeof adminUsers.$inferInsert>)
    .where(eq(adminUsers.id, targetId));

  revalidatePath(`/admin/users/${targetId}/edit`);
  revalidatePath("/admin");
  redirect(`/admin/users/${targetId}/edit?toast=saved`);
}

// Any user: change their own password
export async function changePassword(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join(", ");
    return redirect(`/admin/profile?error=${encodeURIComponent(msg)}`);
  }

  const dbUser = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, String(user.id)),
  });

  if (!dbUser || !dbUser.passwordHash) throw new Error("User not found");

  const valid = await bcrypt.compare(result.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return redirect(`/admin/profile?error=${encodeURIComponent("Current password is incorrect")}`);
  }

  const newHash = await bcrypt.hash(result.data!.newPassword, 12);
  await db.update(adminUsers)
    .set({ passwordHash: newHash } as Partial<typeof adminUsers.$inferInsert>)
    .where(eq(adminUsers.id, String(user.id)));

  auditLog({ action: "user.update", userId: user.id, detail: "Changed password" });
  redirect("/admin/profile?saved=1");
}
