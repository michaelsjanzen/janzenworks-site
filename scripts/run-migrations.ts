/**
 * run-migrations.ts
 *
 * Applies all pending migration scripts in alphabetical order.
 * Tracks applied migrations in a schema_migrations table so each
 * script runs exactly once, even if the command is re-run.
 *
 * Usage: npm run db:migrate
 *
 * Convention: migration scripts must be named migrate-NNN-*.ts
 * and live in the scripts/ directory. They must call process.exit()
 * on completion (success or failure) — the runner treats any non-zero
 * exit code as a failure and aborts.
 */
import { existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { config } from "dotenv";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  // Ensure the tracking table exists.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT     PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Fetch already-applied migrations.
  const result = await db.execute(sql`SELECT filename FROM schema_migrations ORDER BY filename`);
  const applied = new Set(result.rows.map((r: Record<string, unknown>) => r.filename as string));

  // Discover migration files in scripts/.
  const scriptsDir = resolve(process.cwd(), "scripts");
  const files = readdirSync(scriptsDir)
    .filter(f => /^migrate-\d+.*\.ts$/.test(f))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  [skip]  ${file}`);
      continue;
    }

    console.log(`  [apply] ${file} ...`);
    try {
      execSync(`tsx --env-file=.env.local scripts/${file}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch {
      console.error(`  [fail]  ${file} — aborting.`);
      process.exit(1);
    }

    await db.execute(sql`INSERT INTO schema_migrations (filename) VALUES (${file})`);
    console.log(`  [done]  ${file}`);
    ran++;
  }

  if (ran === 0) {
    console.log("  All migrations already applied.");
  } else {
    console.log(`  ${ran} migration(s) applied.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Migration runner failed:", err);
  process.exit(1);
});
