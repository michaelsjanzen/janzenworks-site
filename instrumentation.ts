/**
 * Next.js instrumentation hook — runs once at server startup, before the
 * first request is served (and therefore before src/auth.ts is evaluated).
 *
 * This is the mechanism that lets Pugmill store OAuth and storage credentials
 * in the database instead of platform environment variables. On startup we
 * read the DB config and hydrate process.env for any value that isn't already
 * set via a platform secret. The app code (auth.ts, storage/index.ts) reads
 * process.env as normal — it never needs to know where the value came from.
 *
 * Required env vars (true minimum, cannot be moved to DB):
 *   DATABASE_URL  — needed to connect to the DB that holds everything else
 *   AUTH_SECRET   — signs JWTs; must exist before any session can be validated
 *
 * Everything else (OAuth, storage, email, AI) can live in Settings → * in the
 * admin panel. Platform secrets are still respected if set — DB values only
 * fill in gaps.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge). DB connections aren't available
  // in the Edge runtime and instrumentation there is for tracing only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { getConfig }    = await import("./src/lib/config");
    const { decryptString } = await import("./src/lib/encrypt");

    const config = await getConfig();

    // ── Storage ───────────────────────────────────────────────────────────────
    const s = config.storage;
    if (s?.provider === "s3") {
      if (!process.env.STORAGE_PROVIDER)      process.env.STORAGE_PROVIDER      = "s3";
      if (!process.env.S3_BUCKET      && s.bucket)        process.env.S3_BUCKET      = s.bucket;
      if (!process.env.S3_REGION      && s.region)        process.env.S3_REGION      = s.region;
      if (!process.env.S3_ENDPOINT    && s.endpoint)      process.env.S3_ENDPOINT    = s.endpoint;
      if (!process.env.S3_PUBLIC_URL  && s.publicUrl)     process.env.S3_PUBLIC_URL  = s.publicUrl;
      if (!process.env.S3_PUBLIC_ACL)
        process.env.S3_PUBLIC_ACL = s.publicAcl ? "true" : "false";
      if (!process.env.S3_ACCESS_KEY_ID && s.accessKeyId)
        process.env.S3_ACCESS_KEY_ID = s.accessKeyId; // not a secret, no decrypt needed
      if (!process.env.S3_SECRET_ACCESS_KEY && s.secretAccessKey)
        process.env.S3_SECRET_ACCESS_KEY = decryptString(s.secretAccessKey);
    }

    // ── OAuth providers ───────────────────────────────────────────────────────
    const a = config.auth;
    if (a?.googleClientId && !process.env.GOOGLE_CLIENT_ID)
      process.env.GOOGLE_CLIENT_ID = a.googleClientId;
    if (a?.googleClientSecret && !process.env.GOOGLE_CLIENT_SECRET)
      process.env.GOOGLE_CLIENT_SECRET = decryptString(a.googleClientSecret);
    if (a?.githubClientId && !process.env.GITHUB_CLIENT_ID)
      process.env.GITHUB_CLIENT_ID = a.githubClientId;
    if (a?.githubClientSecret && !process.env.GITHUB_CLIENT_SECRET)
      process.env.GITHUB_CLIENT_SECRET = decryptString(a.githubClientSecret);

    console.log("[Pugmill] instrumentation: env hydration complete.");
  } catch (err) {
    // Never block startup — fall back to whatever env vars are already set.
    console.warn("[Pugmill] instrumentation: could not hydrate config from DB.", err);
  }
}
