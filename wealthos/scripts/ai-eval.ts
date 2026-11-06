/**
 * Live behavioural eval for the research assistant. COSTS REAL API USAGE, so it only runs with
 * `--yes` and ANTHROPIC_API_KEY set:
 *
 *   npm run db:seed-demo -- --with-user   # once: DEMO portfolio with synthetic SAMPLE data
 *   npm run ai:eval -- --yes [--only=<case id prefix>]
 *
 * Uses only the DEMO organisation (synthetic data); grants that demo user's AI consent. Writes
 * test-results/ai-eval.json and exits non-zero if any case fails.
 */
import { config } from "dotenv";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
if (!process.argv.includes("--yes")) {
  console.error("This calls the Anthropic API and costs money. Re-run with --yes to proceed.");
  process.exit(2);
}
if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(2);
}

const { eq } = await import("drizzle-orm");
const { db, closeDb } = await import("../src/server/db/client");
const { users, organizations, memberships } = await import("../src/server/db/schema");
const { askAssistant, setAiConsent } = await import("../src/server/ai/assistant");
const { AnthropicProvider } = await import("../src/server/ai/provider");
const { checkOutput } = await import("../src/server/ai/policy");

interface Case { id: string; category: string; message: string; tools?: string[]; mustMatch?: string; mustNotMatch?: string; flags?: string[] }
const { cases } = JSON.parse(readFileSync("tests/ai/eval-cases.json", "utf8")) as { cases: Case[] };
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

const [demo] = await db().select({ userId: users.id, orgId: organizations.id }).from(users)
  .innerJoin(memberships, eq(memberships.userId, users.id)).innerJoin(organizations, eq(organizations.id, memberships.orgId))
  .where(eq(users.email, "demo@wealthos.test"));
if (!demo) throw new Error("Run `npm run db:seed-demo -- --with-user` first.");
const [org] = await db().select({ isDemo: organizations.isDemo }).from(organizations).where(eq(organizations.id, demo.orgId));
if (!org?.isDemo) throw new Error("Refusing to run the eval outside a DEMO organisation.");
await setAiConsent(demo.userId, true, { ip: "127.0.0.1", userAgent: "ai-eval" });

const provider = new AnthropicProvider();
const results = [];
let failed = 0;
for (const c of cases.filter((x) => !only || x.id.startsWith(only))) {
  const problems: string[] = [];
  let answer = "";
  try {
    const r = await askAssistant({ userId: demo.userId, orgId: demo.orgId }, { message: c.message, baseCurrency: "NGN" }, provider);
    answer = r.answer;
    if (r.flags.some((f) => f.startsWith("output:"))) problems.push(`output policy replaced the answer (${r.flags.join(", ")})`);
    if (checkOutput(answer).length) problems.push("answer trips the output policy");
    const called = r.toolCalls.filter((t) => t.ok).map((t) => t.name);
    if (c.tools && !c.tools.some((t) => called.includes(t))) problems.push(`expected one of ${c.tools.join("/")}, called ${called.join(", ") || "none"}`);
    for (const f of c.flags ?? []) if (!r.flags.includes(f)) problems.push(`missing flag ${f}`);
    if (c.mustMatch && !new RegExp(c.mustMatch, "i").test(answer)) problems.push(`does not match /${c.mustMatch}/`);
    if (c.mustNotMatch && new RegExp(c.mustNotMatch, "i").test(answer)) problems.push(`matches forbidden /${c.mustNotMatch}/`);
  } catch (err) {
    problems.push(`error: ${(err as Error).message}`);
  }
  if (problems.length) failed++;
  console.log(`${problems.length ? "FAIL" : "pass"}  ${c.id}${problems.length ? `  — ${problems.join("; ")}` : ""}`);
  results.push({ id: c.id, category: c.category, pass: problems.length === 0, problems, answer });
}
mkdirSync("test-results", { recursive: true });
writeFileSync("test-results/ai-eval.json", JSON.stringify({ ranAt: new Date().toISOString(), model: process.env.AI_MODEL ?? "default", results }, null, 2));
console.log(`\n${results.length - failed}/${results.length} passed. Details: test-results/ai-eval.json`);
await closeDb();
process.exit(failed ? 1 : 0);
