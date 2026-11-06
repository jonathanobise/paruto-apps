/**
 * Apply database migrations with the OWNER role (DATABASE_OWNER_URL).
 * The application itself never runs with owner privileges.
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const url = process.env.DATABASE_OWNER_URL;
if (!url) throw new Error("DATABASE_OWNER_URL is required to run migrations");

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
} finally {
  await pool.end();
}
