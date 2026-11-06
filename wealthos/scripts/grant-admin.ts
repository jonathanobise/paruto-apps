/**
 * Grant or revoke a platform staff role. Run deliberately by an operator with the OWNER database
 * role; there is no in-app path to become staff.
 *
 *   npx tsx scripts/grant-admin.ts someone@example.com                      # administrator
 *   npx tsx scripts/grant-admin.ts someone@example.com --role support       # support agent
 *   npx tsx scripts/grant-admin.ts someone@example.com --role compliance    # compliance reviewer
 *   npx tsx scripts/grant-admin.ts someone@example.com --revoke             # back to a normal user
 *
 * Staff can only act once they have turned on two-step verification.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
const email = process.argv[2];
if (!email) throw new Error("Usage: grant-admin.ts <email> [--revoke]");
const roleArg = process.argv[process.argv.indexOf("--role") + 1];
const role = process.argv.includes("--revoke") ? "user" : process.argv.includes("--role") ? roleArg : "admin";
if (!["user", "support", "compliance", "admin"].includes(role ?? "")) throw new Error("--role support|compliance|admin");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
try {
  const r = await pool.query("update users set platform_role = $2, updated_at = now() where email = $1 and deleted_at is null returning id, mfa_enabled_at", [email, role]);
  if (!r.rowCount) throw new Error(`No active user ${email}`);
  await pool.query("insert into security_events (user_id, type, metadata) values ($1, $2, $3)", [r.rows[0].id, role === "user" ? "role.staff_revoked" : `role.${role}_granted`, JSON.stringify({ via: "grant-admin script" })]);
  console.log(`${email} is now '${role}'.${role !== "user" && !r.rows[0].mfa_enabled_at ? " They must enable two-step verification before admin actions work." : ""}`);
} finally {
  await pool.end();
}
