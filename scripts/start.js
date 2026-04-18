/**
 * start.js
 *
 * Wrapper around `next start` that explicitly loads .env.local before
 * launching the server. This ensures environment variables written by
 * replit-init.ts (prestart) are available to the Next.js process even
 * in environments where .env.local is not automatically picked up.
 *
 * On Vercel: .env.local does not exist — env vars come from Vercel's
 * secrets panel. This script skips loading gracefully.
 *
 * On Replit: .env.local may contain NEXTAUTH_URL and other vars written
 * by replit-init.ts at prestart time.
 */
const { existsSync } = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const envFile = path.join(process.cwd(), '.env.local');
if (existsSync(envFile)) {
  // dotenv is a direct dependency (used in drizzle.config.ts)
  require('dotenv').config({ path: envFile, override: false });
}

const port = process.env.PORT || '5000';
const result = spawnSync(
  process.execPath,
  [
    path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start',
    '-p', port,
    '-H', '0.0.0.0',
  ],
  { stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 0);
