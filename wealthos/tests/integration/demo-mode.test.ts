import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, withUser } from "@/server/db/client";
import { startDemoSession } from "@/server/demo/session";
import { resolveSession } from "@/server/identity/sessions";
import { beginMfaEnrollment, changePassword, requestPasswordReset, signUp } from "@/server/identity/service";
import { createSharedSpace, inviteMember } from "@/server/identity/members";
import { updatePreferences } from "@/server/identity/preferences";
import { startTrial } from "@/server/billing/service";
import { eraseAccount, exportUserData } from "@/server/privacy/service";
import { createCase } from "@/server/support/service";
import { makeUser } from "./helpers";

let demo: Awaited<ReturnType<typeof makeUser>>;
let demoOrg: string;
const meta = { ip: null, userAgent: null };
const on = () => {
  process.env.DEMO_MODE = "1";
  process.env.DEMO_USER_EMAIL = demo.email;
};

beforeAll(async () => {
  demo = await makeUser("Demo Visitor");
  const r = await withUser(demo.userId, (tx) => tx.execute<{ id: string }>(sql`select app_create_organization(${demo.userId}::uuid, 'Founder demo portfolio', 'personal'::org_kind, true) as id`));
  demoOrg = r.rows[0]!.id;
});
afterEach(() => {
  delete process.env.DEMO_MODE;
  delete process.env.DEMO_USER_EMAIL;
});
afterAll(async () => closeDb());

describe("public demo mode", () => {
  it("the demo sign-in exists only in demo mode", async () => {
    await expect(startDemoSession()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enters as the shared demo user on the DEMO portfolio, recording nothing about the visitor", async () => {
    on();
    const s = await startDemoSession();
    const record = await resolveSession(s.token);
    expect(record).toMatchObject({ userId: demo.userId, mfaSatisfied: true, activeOrgId: demoOrg });
  });

  it("refuses anything that could lock other visitors out, contact people or create money owed", async () => {
    on();
    const forbidden = { code: "FORBIDDEN" };
    await expect(signUp({ displayName: "X", email: "x@example.test", password: "correct horse battery staple", acceptTerms: true }, meta)).rejects.toMatchObject(forbidden);
    await expect(requestPasswordReset(demo.email, meta)).rejects.toMatchObject(forbidden);
    await expect(changePassword(demo.userId, "s", "correct horse battery staple", "another long passphrase", meta)).rejects.toMatchObject(forbidden);
    await expect(beginMfaEnrollment(demo.userId)).rejects.toMatchObject(forbidden);
    await expect(updatePreferences(demo.userId, {})).rejects.toMatchObject(forbidden);
    await expect(inviteMember(demo.ctx, { email: "friend@example.test", role: "member" })).rejects.toMatchObject(forbidden);
    await expect(createSharedSpace(demo.userId, { name: "Mine", kind: "household" })).rejects.toMatchObject(forbidden);
    await expect(startTrial(demo.ctx, "plus")).rejects.toMatchObject(forbidden);
    await expect(createCase(demo.ctx, { subject: "Hi", body: "Hello" })).rejects.toMatchObject(forbidden);
    await expect(exportUserData(demo.userId, meta)).rejects.toMatchObject(forbidden);
    await expect(eraseAccount(demo.userId, "correct horse battery staple", "DELETE", meta)).rejects.toMatchObject(forbidden);
  });
});
