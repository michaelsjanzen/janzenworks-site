/**
 * Runtime environment validation.
 * Called on app startup to catch misconfiguration early.
 * In production: throws and prevents startup.
 * In development: logs warnings only.
 */

const KNOWN_WEAK = new Set([
  "secret",
  "changeme",
  "local-dev-secret-change-in-production",
  "your-secret-here",
  "password",
]);

export function validateEnv() {
  // Next.js sets NEXT_PHASE during `next build`. Skip validation then —
  // it runs on every real request instead, so misconfigurations are still caught.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const isProd = process.env.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is not set.");
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    errors.push("NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32");
  } else if (secret.length < 32) {
    errors.push(`NEXTAUTH_SECRET is too short (${secret.length} chars). Minimum 32 characters required.`);
  } else if (KNOWN_WEAK.has(secret.toLowerCase())) {
    const msg = "NEXTAUTH_SECRET is set to a known weak/placeholder value.";
    if (isProd) errors.push(msg);
    else warnings.push(msg + " Replace before deploying.");
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl) {
    const msg = "NEXTAUTH_URL is not set. Login redirects and OAuth callbacks will fail.";
    if (isProd) errors.push(msg + " Set PRODUCTION_URL as a Replit secret and redeploy.");
    else warnings.push(msg + " Defaulting to http://localhost:3000");
  } else {
    try {
      const parsed = new URL(nextAuthUrl);
      if (isProd && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
        errors.push(
          `NEXTAUTH_URL is set to a localhost address (${nextAuthUrl}) in production. ` +
          "Login will not work. Set PRODUCTION_URL=https://your-domain.com as a Replit secret and redeploy."
        );
      }
    } catch {
      errors.push(`NEXTAUTH_URL "${nextAuthUrl}" is not a valid URL.`);
    }
  }

  // Storage provider validation
  const storageProvider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase().trim();
  if (storageProvider === "s3") {
    const s3Required = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;
    for (const key of s3Required) {
      if (!process.env[key]) {
        errors.push(`STORAGE_PROVIDER=s3 requires ${key} to be set.`);
      }
    }
    if (!process.env.S3_PUBLIC_URL && !process.env.S3_ENDPOINT) {
      warnings.push(
        "S3_PUBLIC_URL is not set. File URLs will default to https://{bucket}.s3.{region}.amazonaws.com. " +
        "Set S3_PUBLIC_URL to your CDN or R2 public URL for correct behaviour."
      );
    }
  } else if (storageProvider !== "local") {
    warnings.push(`Unknown STORAGE_PROVIDER="${storageProvider}". Valid values: "local", "s3". Defaulting to local.`);
  }

  // AI encryption key — required in production to avoid storing API keys as plaintext
  if (!process.env.AI_ENCRYPTION_KEY) {
    const msg = "AI_ENCRYPTION_KEY is not set — AI API keys will be stored unencrypted. Generate: openssl rand -hex 32";
    if (isProd) errors.push(msg);
    else warnings.push(msg);
  } else if (process.env.AI_ENCRYPTION_KEY.length !== 64 || !/^[0-9a-f]+$/i.test(process.env.AI_ENCRYPTION_KEY)) {
    errors.push("AI_ENCRYPTION_KEY must be a 64-character hex string. Generate: openssl rand -hex 32");
  }

  // OAuth provider warnings — inform but don't block startup
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    warnings.push("GitHub OAuth not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET). GitHub login will be unavailable.");
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push("Google OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Google login will be unavailable.");
  }

  for (const w of warnings) console.warn(`[Pugmill] ⚠️  ${w}`);

  if (errors.length > 0) {
    const message = [
      "[Pugmill] ❌ Environment configuration errors:",
      ...errors.map(e => `  • ${e}`),
      "  See SECURITY.md and .env.example for guidance.",
    ].join("\n");
    if (isProd) throw new Error(message);
    else console.error(message);
  }
}
