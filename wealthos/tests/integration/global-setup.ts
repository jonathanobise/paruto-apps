import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/** Recreate the test database schema from migrations (as the owner role). */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_OWNER_URL ?? "postgres://wealthos_owner:wealthos_owner_dev@localhost:5432/wealthos_test";
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
