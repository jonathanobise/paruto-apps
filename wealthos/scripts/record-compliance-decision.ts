/**
 * Record a compliance decision for a feature (append-only). Run by an operator on behalf of a
 * named compliance reviewer, with the OWNER database role. Hard-disabled (regulated) features
 * can't be enabled this way: they need a code change and authorisation.
 *
 *   npx tsx --conditions=react-server scripts/record-compliance-decision.ts \
 *     --feature INSTRUMENT_EXPLORER --status approved --reviewer reviewer@example.com \
 *     --reference "Counsel memo 2026-11-15" [--jurisdiction NG] [--notes "…"]
 *
 * Statuses: approved | rejected | suspended | pending_review.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const { FEATURES } = await import("../src/server/compliance/features");
const feature = arg("feature");
const status = arg("status");
const reviewer = arg("reviewer");
const reference = arg("reference");
const jurisdiction = arg("jurisdiction") ?? "NG";
const def = FEATURES.find((f) => f.key === feature);
if (!def) throw new Error(`Unknown feature. Known: ${FEATURES.map((f) => f.key).join(", ")}`);
if (!status || !["approved", "rejected", "suspended", "pending_review"].includes(status)) throw new Error("--status approved|rejected|suspended|pending_review");
if (!reviewer || !reference || reference.trim().length < 5) throw new Error("--reviewer <email> and --reference <document or memo> are required");
if (def.hardDisabled && status === "approved") throw new Error(`${def.key} is hard-disabled in code (${def.classification}); it cannot be approved by configuration.`);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
try {
  const u = await pool.query("select id from users where email = $1 and deleted_at is null", [reviewer]);
  if (!u.rowCount) throw new Error(`No active user ${reviewer} (the reviewer needs a WealthOS account)`);
  await pool.query("insert into regulatory_feature_approvals (feature_key, jurisdiction, status, reviewer_user_id, reference, notes) values ($1,$2,$3,$4,$5,$6)", [def.key, jurisdiction, status, u.rows[0].id, reference, arg("notes") ?? null]);
  await pool.query("insert into audit_events (org_id, actor_user_id, action, target_type, target_id, metadata) values (null, $1, 'compliance.decision_recorded', 'feature', $2, $3)", [u.rows[0].id, def.key, JSON.stringify({ status, jurisdiction, reference, via: "record-compliance-decision script" })]);
  console.log(`${def.key} (${jurisdiction}): ${status} — recorded for ${reviewer}, reference "${reference}".`);
} finally {
  await pool.end();
}
