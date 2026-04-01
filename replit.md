# Pugmill CMS

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
2. Save `NEXTAUTH_SECRET` as a Replit secret (displayed in the init log)
3. Visit **`/setup`** in the preview pane to create your admin account
4. That's it — no manual credential files or env vars required

## Deployment

1. Ensure `NEXTAUTH_SECRET` is saved as a Replit secret (step 2 above)
2. Deploy via Replit — build and start commands are pre-configured in `.replit`
3. For custom domains, set `PRODUCTION_URL=https://your-domain.com` as a secret before deploying
4. The init script auto-detects the production URL from Replit env vars when no custom domain is set

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
