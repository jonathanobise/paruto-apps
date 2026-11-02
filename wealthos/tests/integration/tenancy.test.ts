/**
 * Adversarial tenant-isolation tests. Each attack is attempted through the service layer AND
 * directly against Postgres as the runtime role, to prove isolation does not depend on UI or
 * service code alone.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { closeDb, db, withTenant, withUser } from "@/server/db/client";
import { financialAccounts, ledgerEvents, memberships, organizations, auditEvents } from "@/server/db/schema";
import { createAccount, getAccount, listAccounts } from "@/server/accounts/service";
import { postEvent, reverseEvent } from "@/server/ledger/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { exportUserData } from "@/server/privacy/service";
import { expectDbRejection, makeUser, meta } from "./helpers";

let alice: Awaited<ReturnType<typeof makeUser>>;
let bob: Awaited<ReturnType<typeof makeUser>>;
let aliceAccountId: string;
let aliceEventId: string;

beforeAll(async () => {
  alice = await makeUser("Alice");
  bob = await makeUser("Bob");
  const acc = await createAccount(alice.ctx, { name: "Alice Bank", type: "bank", currency: "NGN" });
  aliceAccountId = acc.id;
  aliceEventId = (await postEvent(alice.ctx, { type: "deposit", accountId: acc.id, currency: "NGN", amount: "1000000", occurredOn: "2025-01-02" })).id;
});
afterAll(async () => closeDb());

describe("service-layer isolation", () => {
  it("Bob cannot list, read or value Alice's accounts", async () => {
    expect(await listAccounts(bob.ctx)).toHaveLength(0);
    await expect(getAccount(bob.ctx, aliceAccountId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const dash = await buildDashboard(bob.ctx, { baseCurrency: "NGN", period: "ALL" });
    expect(dash.totals.netWorth).toBe("0.00");
  });

  it("Bob forging Alice's org id in his context sees nothing (membership checked in Postgres)", async () => {
    const forged = { userId: bob.userId, orgId: alice.orgId };
    expect(await listAccounts(forged)).toHaveLength(0);
    await expectDbRejection(createAccount(forged, { name: "Injected", type: "bank", currency: "NGN" }), /row-level security/);
    await expect(postEvent(forged, { type: "deposit", accountId: aliceAccountId, currency: "NGN", amount: "1", occurredOn: "2025-01-03" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("Bob cannot post into Alice's account from his own organisation", async () => {
    await expect(postEvent(bob.ctx, { type: "deposit", accountId: aliceAccountId, currency: "NGN", amount: "1", occurredOn: "2025-01-03" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("Bob cannot reverse Alice's transaction", async () => {
    await expect(reverseEvent(bob.ctx, aliceEventId, "malicious")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("exports contain only the user's own organisations", async () => {
    const exp = await exportUserData(bob.userId, meta);
    const ids = exp.organizations.flatMap((o) => o.accounts.map((a) => a.id));
    expect(ids).not.toContain(aliceAccountId);
  });
});

describe("database-level isolation (runtime role)", () => {
  it("every table with an org_id column has row-level security enabled", async () => {
    const r = await db().execute<{ relname: string; rls: boolean }>(sql`
      select c.relname, c.relrowsecurity as rls from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'org_id' and not a.attisdropped
      where c.relkind = 'r' and n.nspname = current_schema()`);
    expect(r.rows.length).toBeGreaterThan(15);
    expect(r.rows.filter((x) => !x.rls).map((x) => x.relname)).toEqual([]);
  });

  it("returns no tenant rows without a context", async () => {
    expect(await db().select().from(financialAccounts)).toHaveLength(0);
    expect(await db().select().from(ledgerEvents)).toHaveLength(0);
    expect(await db().select().from(organizations)).toHaveLength(0);
  });

  it("rejects an insert that names another tenant's org even with raw SQL", async () => {
    await expectDbRejection(
      withTenant(bob.ctx, (tx) => tx.execute(sql`insert into financial_accounts (org_id, name, type, account_class, currency) values (${alice.orgId}, 'x', 'bank', 'ledger', 'NGN')`))
    , /row-level security/);
  });

  it("rejects a ledger entry pointing at another tenant's account (composite foreign key)", async () => {
    await expectDbRejection(
      withTenant(bob.ctx, async (tx) => {
        const [ev] = await tx.insert(ledgerEvents).values({ orgId: bob.orgId, type: "deposit", occurredOn: "2025-01-01", payload: {} }).returning();
        await tx.execute(sql`insert into ledger_entries (org_id, event_id, account_id, currency, cash_delta) values (${bob.orgId}, ${ev!.id}, ${aliceAccountId}, 'NGN', 1)`);
      })
    , /foreign key/);
  });

  it("forbids updating or deleting ledger history, even within the owning tenant", async () => {
    await expectDbRejection(withTenant(alice.ctx, (tx) => tx.update(ledgerEvents).set({ description: "tampered" }).where(eq(ledgerEvents.id, aliceEventId))), /permission denied|WOS_IMMUTABLE/);
    await expectDbRejection(withTenant(alice.ctx, (tx) => tx.delete(ledgerEvents).where(eq(ledgerEvents.id, aliceEventId))), /permission denied|WOS_IMMUTABLE/);
    await expectDbRejection(withTenant(alice.ctx, (tx) => tx.delete(auditEvents)), /permission denied|WOS_IMMUTABLE/);
  });

  it("does not let Bob add himself to Alice's organisation", async () => {
    await expectDbRejection(withUser(bob.userId, (tx) => tx.insert(memberships).values({ orgId: alice.orgId, userId: bob.userId, role: "owner" })), /permission denied/);
  });

  it("does not let Bob create organisations for, or erase, another user", async () => {
    await expectDbRejection(withUser(bob.userId, (tx) => tx.execute(sql`select app_create_organization(${alice.userId}::uuid, 'x', 'personal'::org_kind, false)`)), /WOS_FORBIDDEN/);
    await expectDbRejection(withUser(bob.userId, (tx) => tx.execute(sql`select app_erase_user(${alice.userId}::uuid)`)), /WOS_FORBIDDEN/);
  });

  it("the runtime role cannot bypass RLS or alter the schema", async () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      const r = await pool.query("select rolbypassrls, rolsuper from pg_roles where rolname = current_user");
      expect(r.rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
      await expectDbRejection(pool.query("alter table financial_accounts disable row level security"), /must be owner/);
      await expectDbRejection(pool.query("set role wealthos_owner"), /permission denied/);
    } finally {
      await pool.end();
    }
  });
});

describe("viewer role", () => {
  it("can read but not write", async () => {
    const viewer = await makeUser("Viewer");
    // Grant viewer membership via the owner role (no runtime path exists to do this yet).
    const owner = new pg.Pool({ connectionString: "postgres://wealthos_owner:wealthos_owner_dev@localhost:5432/wealthos_test", max: 1 });
    await owner.query("insert into memberships (org_id, user_id, role) values ($1, $2, 'viewer')", [alice.orgId, viewer.userId]);
    await owner.end();
    const ctx = { userId: viewer.userId, orgId: alice.orgId };
    expect((await listAccounts(ctx)).map((a) => a.id)).toContain(aliceAccountId);
    await expectDbRejection(createAccount(ctx, { name: "Nope", type: "bank", currency: "NGN" }), /row-level security/);
    await expectDbRejection(postEvent(ctx, { type: "deposit", accountId: aliceAccountId, currency: "NGN", amount: "5", occurredOn: "2025-01-05" }), /row-level security/);
  });
});
