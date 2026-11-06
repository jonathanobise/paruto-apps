import pg from "pg";
import { config } from "dotenv";

/**
 * Browser tests sign up several users per run from the loopback address, which the (correct)
 * per-IP sign-up limit would otherwise block after a few runs. Reset only loopback buckets, and
 * refuse to touch anything that isn't a local development database.
 */
export default async function globalSetup(): Promise<void> {
  config({ path: ".env.local", quiet: true });
  const url = process.env.DATABASE_OWNER_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) throw new Error("E2E setup only runs against a local database");
  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query("delete from rate_limit_buckets where key like '%:ip:127.0.0.1' or key like '%:ip:::1' or key like '%:ip:::ffff:127.0.0.1'");
  } finally {
    await pool.end();
  }
}
