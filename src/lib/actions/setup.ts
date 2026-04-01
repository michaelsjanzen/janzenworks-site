"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { getConfig, updateConfig } from "@/lib/config";
import { encryptString } from "@/lib/encrypt";
import { seedDefaultContent } from "../../../seeds/default-content";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { z } from "zod";
import bcrypt from "bcryptjs";

const setupLimiter = createRateLimiter({
  interval: 15 * 60 * 1000,
  uniqueTokenPerInterval: 500,
});

const setupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("A valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  siteName: z.string().min(1, "Site name is required").max(200),
  siteUrl: z.string().min(1, "Site URL is required").max(500),
  authorVoice: z.string().max(5000).optional(),
  aiProvider: z.enum(["anthropic", "openai", "gemini"]).nullable().optional(),
  aiKey: z.string().max(2000).optional(),
  aiModel: z.string().max(200).optional(),
});

async function isAlreadySetup(): Promise<boolean> {
  const rows = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return rows.length > 0;
}

async function testAiKey(
  provider: "anthropic" | "openai" | "gemini",
  key: string
): Promise<boolean> {
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      // 200 = valid key and model; 400 = auth ok but bad payload (key still valid)
      // 401 = invalid key; 403 = key exists but no API access
      return res.ok || res.status === 400;
    }
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      return res.ok || res.status === 400;
    }
    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      );
      return res.ok || res.status === 400;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validate an AI provider key without saving anything.
 * Called from the SetupWizard "Test Key" button.
 */
export async function validateAiKey(
  provider: "anthropic" | "openai" | "gemini",
  key: string
): Promise<{ valid: boolean; error?: string }> {
  if (!key.trim()) return { valid: false, error: "API key cannot be empty." };
  const valid = await testAiKey(provider, key.trim());
  if (!valid) {
    return {
      valid: false,
      error: "Key rejected by the provider — check that it is correct and has API access enabled.",
    };
  }
  return { valid: true };
}

/**
 * Complete first-run setup: create admin user, update site config, seed content.
 * Returns { error } if validation fails; redirects on success.
 */
export async function completeSetup(
  formData: FormData
): Promise<{ error: string } | void> {
  // Security gate: reject if already set up (race condition safe — DB is the gate)
  if (await isAlreadySetup()) {
    return { error: "Setup has already been completed." };
  }

  // Rate limit: 5 attempts per 15 minutes per IP
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rateCheck = setupLimiter.check(ip, 5);
  if (!rateCheck.success) {
    return { error: "Too many setup attempts. Please wait 15 minutes and try again." };
  }

  // Parse and validate inputs
  const rawProvider = formData.get("aiProvider") as string;
  const raw = {
    name: (formData.get("name") as string ?? "").trim(),
    email: (formData.get("email") as string ?? "").trim().toLowerCase(),
    password: formData.get("password") as string ?? "",
    siteName: (formData.get("siteName") as string ?? "").trim(),
    siteUrl: (formData.get("siteUrl") as string ?? "").trim(),
    authorVoice: (formData.get("authorVoice") as string ?? "").trim() || undefined,
    aiProvider: rawProvider && rawProvider !== "" ? rawProvider : null,
    aiKey: (formData.get("aiKey") as string ?? "").trim() || undefined,
    aiModel: (formData.get("aiModel") as string ?? "").trim() || undefined,
  };

  const result = setupSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues.map(i => i.message).join(", ") };
  }

  const { name, email, password, siteName, siteUrl, authorVoice, aiProvider, aiKey, aiModel } =
    result.data;

  // Password confirmation (also validated client-side)
  const confirmPassword = formData.get("confirmPassword") as string ?? "";
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  // Validate AI key if a provider and key were both supplied
  if (aiProvider && aiKey) {
    const keyCheck = await testAiKey(aiProvider, aiKey);
    if (!keyCheck) {
      return {
        error:
          "AI key validation failed — the key was rejected by the provider. Check it and try again.",
      };
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert admin user, get generated ID back
  const inserted = await db
    .insert(adminUsers)
    .values({
      name,
      email,
      passwordHash,
      role: "admin",
      authorVoice: authorVoice ?? null,
    } as typeof adminUsers.$inferInsert)
    .returning({ id: adminUsers.id });

  const adminId = inserted[0].id;

  // Update site config (spread to preserve all other fields)
  const config = await getConfig();
  const aiUpdates =
    aiProvider && aiKey
      ? {
          ai: {
            ...config.ai,
            provider: aiProvider,
            apiKey: encryptString(aiKey),
            model: aiModel || defaultModel(aiProvider),
          },
        }
      : {};

  await updateConfig({
    ...config,
    site: { ...config.site, name: siteName, url: siteUrl },
    ...aiUpdates,
  });

  // Seed default content (idempotent)
  await seedDefaultContent(adminId);

  setupLimiter.reset(ip);
  redirect("/admin/login?setup=1");
}

function defaultModel(provider: "anthropic" | "openai" | "gemini"): string {
  if (provider === "anthropic") return "claude-sonnet-4-6";
  if (provider === "openai") return "gpt-4o-mini";
  return "gemini-1.5-flash";
}
