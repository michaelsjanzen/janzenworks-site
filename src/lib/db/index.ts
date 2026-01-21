import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Replit automatically provides the DATABASE_URL environment variable 
// once you attach the PostgreSQL tool in the sidebar.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Please attach the PostgreSQL tool in Replit.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
