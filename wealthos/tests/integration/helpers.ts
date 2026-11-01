import { sql } from "drizzle-orm";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { signUp } from "@/server/identity/service";
import { db, withUser } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { listOrganizations } from "@/server/identity/tenancy";

/** Each test file looks like a different client so per-IP rate limits don't couple tests. */
export const meta = { ip: `10.${rand()}.${rand()}.${rand()}`, userAgent: "vitest" };
function rand(): number {
  return Math.floor(Math.random() * 254) + 1;
}

export async function makeUser(name = "Test User") {
  const email = `${name.toLowerCase().replace(/\W+/g, ".")}.${randomUUID().slice(0, 8)}@example.test`;
  await signUp({ displayName: name, email, password: "correct horse battery staple", acceptTerms: true, marketingOptIn: false }, { ...meta, ip: `10.${rand()}.${rand()}.${rand()}` });
  const [u] = await db().select().from(users).where(eq(users.email, email));
  await db().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, u!.id));
  const [org] = await listOrganizations(u!.id);
  return { userId: u!.id, email, orgId: org!.id, ctx: { userId: u!.id, orgId: org!.id } };
}

/** Owner-role pool for seeding global reference data (catalogue writes bypass tenant RLS by design). */
export function ownerPool(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.TEST_DATABASE_OWNER_URL ?? "postgres://wealthos_owner:wealthos_owner_dev@localhost:5432/wealthos_test", max: 2 });
}

export async function createOrg(userId: string, name: string): Promise<string> {
  const r = await withUser(userId, (tx) => tx.execute<{ id: string }>(sql`select app_create_organization(${userId}::uuid, ${name}, 'personal'::org_kind, false) as id`));
  return r.rows[0]!.id;
}

/** Assert that a DB operation is rejected with a Postgres error matching `pattern` (Drizzle wraps it in `cause`). */
export async function expectDbRejection(p: Promise<unknown>, pattern: RegExp): Promise<void> {
  let err: unknown;
  try {
    await p;
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`Expected rejection matching ${pattern}, but the operation succeeded`);
  const messages: string[] = [];
  let cur: unknown = err;
  while (cur && typeof cur === "object" && messages.length < 5) {
    messages.push(String((cur as Error).message));
    cur = (cur as { cause?: unknown }).cause;
  }
  if (!messages.some((m) => pattern.test(m))) throw new Error(`Expected rejection matching ${pattern}, got: ${messages.join(" | ")}`);
}
