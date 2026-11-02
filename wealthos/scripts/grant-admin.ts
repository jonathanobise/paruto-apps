/**
 * Grant or revoke the platform administrator role. Run deliberately by an operator with the OWNER
 * database role; there is no in-app path to become an administrator.
 *
 *   npx tsx scripts/grant-admin.ts someone@example.com          # grant
 *   npx tsx scripts/grant-admin.ts someone@example.com --revoke # revoke
 *
 * Administrators can only act once they have turned on two-step verification.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
const email = process.argv[2];
if (!email) throw new Error("Usage: grant-admin.ts <email> [--revoke]");
const role = process.argv.includes("--revoke") ? "user" : "admin";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
try {
  const r = await pool.query("update users set platform_role = $2, updated_at = now() where email = $1 and deleted_at is null returning id, mfa_enabled_at", [email, role]);
  if (!r.rowCount) throw new Error(`No active user ${email}`);
  await pool.query("insert into security_events (user_id, type, metadata) values ($1, $2, $3)", [r.rows[0].id, role === "admin" ? "role.admin_granted" : "role.admin_revoked", JSON.stringify({ via: "grant-admin script" })]);
  console.log(`${email} is now '${role}'.${role === "admin" && !r.rows[0].mfa_enabled_at ? " They must enable two-step verification before admin actions work." : ""}`);
} finally {
  await pool.end();
}
