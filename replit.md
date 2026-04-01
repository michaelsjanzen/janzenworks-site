# Pugmill CMS

## AGENT SETUP PROTOCOL — FOLLOW THIS BEFORE STARTING THE APP

When the init script runs it will print a banner listing required actions.
**After the app starts, pause and complete all items in that banner before
telling the user setup is done.** Specifically:

1. Save `NEXTAUTH_SECRET` as a Replit secret (value is shown in the banner)
2. **Ask the user for their production URL** — say something like:
   *"Before you deploy, I need your production URL. Check Replit's deployment
   panel for the domain (e.g. `https://yourapp.replit.app`) and paste it here.
   I'll save it as `PRODUCTION_URL` so login works after deployment."*
3. Wait for the user's reply, then save it using the **environment-secrets skill** (the same
   method used for NEXTAUTH_SECRET) — this shows the user a confirmation dialog they must
   interact with. Do NOT just mention the value in chat; that will be ignored.
4. Only after both secrets are saved, tell the user setup is complete

Do not skip step 2–3. A missing `PRODUCTION_URL` causes authentication to
fail silently in production and the site will be unusable.

A self-hosted, Next.js-based CMS with admin panel, plugin system, and theme support.

## Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Database**: PostgreSQL via Replit's built-in database (Drizzle ORM)
- **Auth**: NextAuth v5 (credentials + optional GitHub/Google OAuth)
- **Storage**: Local (`public/uploads/`) or S3-compatible
- **Styling**: Tailwind CSS
- **Package manager**: npm

## Running the App

The app starts automatically via the "Start application" workflow (`npm run dev`).

- Port: **5000**
- On first run, visit **`/setup`** to create your admin account
- On subsequent runs, visit **`/admin/login`**

On first run, `scripts/replit-init.ts` automatically:
- Generates `NEXTAUTH_SECRET` and `AI_ENCRYPTION_KEY` (saved to `.env.local`)
- Detects and sets `NEXTAUTH_URL` from the Replit dev domain
- Creates all database tables (idempotent)
- Runs pending migrations
- Verifies `public/uploads/` is writable for image uploads

## Environment Variables

### Auto-provisioned by Replit
- `DATABASE_URL` — PostgreSQL connection string (Replit database integration)

### Auto-generated on first run (saved to `.env.local`)
- `NEXTAUTH_SECRET` — also save as a Replit secret for deployment persistence
- `AI_ENCRYPTION_KEY` — encrypts AI provider keys at rest
- `NEXTAUTH_URL` — detected from `REPLIT_DEV_DOMAIN`

### Optional secrets
- `PRODUCTION_URL` — custom domain override for production deployments
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth login
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth login
- `STORAGE_PROVIDER=s3` + S3 credentials — for persistent media on ephemeral hosts

## First-Time Setup

1. Start the app — the init script runs automatically
2. The init log will display a banner with **2 required actions**. Do both before the user deploys:
   - Save `NEXTAUTH_SECRET` as a Replit secret
   - **Ask the user for their production URL**, then save it as `PRODUCTION_URL` — e.g. `https://yourapp.replit.app`. The user can find this in Replit's deployment panel or domain settings. This is required for login to work after deployment.
3. Visit **`/setup`** in the preview pane to create your admin account
4. That's it — no manual credential files or env vars required

## Deployment

**During initial setup — while you are already asking the user to save NEXTAUTH_SECRET —
also ask them for their production URL and save it as a secret before they click Deploy.**

This is the right moment: the user is present, you have their attention, and the secret
needs to be in place before the production container boots for the first time.

Why this matters: `replit-init.ts` reads `PRODUCTION_URL` at first boot to set `NEXTAUTH_URL`
in the prod container. If it is missing, the script attempts auto-detection from Replit env
vars — but Replit's current UUID-based domain format (`*.riker.replit.dev`) may not be
detected correctly, leaving `NEXTAUTH_URL` wrong. When `NEXTAUTH_URL` is wrong, login
redirects and OAuth callbacks fail and the site is unusable.

What to ask the user:
> "Before you hit Deploy, I need one more thing: your production URL. You can find it in
> Replit's deployment panel or domain settings — it will look like
> `https://yourapp.replit.app` or a custom domain. I'll save it as a secret now so login
> works correctly on first boot."

Then save: `PRODUCTION_URL=https://their-url`

After deployment, check the init log for:
`Production URL: https://... (PRODUCTION_URL secret)` — confirms it was picked up correctly.

## Database Scripts

```bash
npm run db:create     # Recreate schema (IF NOT EXISTS — safe)
npm run db:migrate    # Run pending migrations
npm run db:studio     # Open Drizzle Studio
npm run replit:init   # Force re-run first-run setup
```

## Architecture Notes

- `src/app/` — Next.js App Router pages and API routes
- `src/lib/` — shared server utilities (db, auth, storage, config)
- `plugins/` — built-in CMS plugins (contact form, widgets, bot analytics)
- `themes/` — theme definitions (default theme included)
- `scripts/` — setup, migration, and utility scripts
- `tests/` — Vitest unit tests (`npm test`)

## Important

- Admin accounts are created exclusively through the `/setup` wizard — there are no env vars for pre-seeding credentials
- The `/setup` route is gated: it redirects to `/admin/login` once an admin account exists
- Dev and production containers have separate databases — complete setup in **production**, not dev
