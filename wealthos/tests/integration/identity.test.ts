import { afterAll, describe, expect, it } from "vitest";
import { and, desc, eq } from "drizzle-orm";
import { db, closeDb, withUser } from "@/server/db/client";
import { consentRecords, emailOutbox, memberships, sessions, users, securityEvents } from "@/server/db/schema";
import { beginMfaEnrollment, completeMfaChallenge, confirmMfaEnrollment, requestPasswordReset, resetPassword, signIn, signUp, verifyEmail } from "@/server/identity/service";
import { resolveSession } from "@/server/identity/sessions";
import { totp } from "@/server/identity/crypto";
import { AppError } from "@/server/platform/errors";
import { makeUser, meta } from "./helpers";

afterAll(async () => closeDb());

async function lastEmailToken(to: string, path: string): Promise<string> {
  const [m] = await db().select().from(emailOutbox).where(eq(emailOutbox.toAddress, to)).orderBy(desc(emailOutbox.createdAt)).limit(1);
  const match = new RegExp(`${path}\\?token=([A-Za-z0-9_-]+)`).exec(m!.textBody);
  return match![1]!;
}

describe("sign-up", () => {
  it("creates the user, a personal organisation, consents and a verification email", async () => {
    const email = `new.${Date.now()}@example.test`;
    const r = await signUp({ displayName: "Ada", email, password: "a long unique passphrase", acceptTerms: true }, meta);
    expect(r.session).not.toBeNull();
    const [u] = await db().select().from(users).where(eq(users.email, email));
    expect(u!.passwordHash).toMatch(/^scrypt\$/);
    expect(u!.emailVerifiedAt).toBeNull();
    // Without a user context, RLS hides memberships entirely.
    expect(await db().select().from(memberships).where(eq(memberships.userId, u!.id))).toHaveLength(0);
    const m = await withUser(u!.id, (tx) => tx.select().from(memberships).where(eq(memberships.userId, u!.id)));
    expect(m).toHaveLength(1);
    expect(m[0]!.role).toBe("owner");
    const c = await db().select().from(consentRecords).where(eq(consentRecords.userId, u!.id));
    expect(c.map((x) => x.consentKey).sort()).toEqual(["marketing_email", "privacy", "terms"]);
    const token = await lastEmailToken(email, "/verify-email/confirm");
    expect(await verifyEmail(token, meta)).toBe(true);
    expect(await verifyEmail(token, meta)).toBe(false); // single use
  });

  it("does not reveal existing accounts and creates no session for duplicates", async () => {
    const { email } = await makeUser("Dup");
    const r = await signUp({ displayName: "Imposter", email, password: "another long passphrase", acceptTerms: true }, meta);
    expect(r.session).toBeNull();
    const [m] = await db().select().from(emailOutbox).where(eq(emailOutbox.toAddress, email)).orderBy(desc(emailOutbox.createdAt)).limit(1);
    expect(m!.subject).toMatch(/tried to create/);
  });

  it("enforces password and consent rules", async () => {
    await expect(signUp({ displayName: "X", email: "x@example.test", password: "short", acceptTerms: true }, meta)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(signUp({ displayName: "X", email: "x2@example.test", password: "a long unique passphrase", acceptTerms: false }, meta)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("sign-in", () => {
  it("issues a hashed session token and resolves it", async () => {
    const { email } = await makeUser("Signer");
    const r = await signIn({ email, password: "correct horse battery staple" }, meta);
    expect(r.status).toBe("ok");
    const stored = await db().select().from(sessions).where(eq(sessions.tokenHash, r.session.token));
    expect(stored).toHaveLength(0); // raw token is never stored
    const s = await resolveSession(r.session.token);
    expect(s?.user.email).toBe(email);
    expect(await resolveSession("not-a-real-token-but-long-enough")).toBeNull();
  });

  it("gives the same error for unknown email and wrong password, and locks after repeated failures", async () => {
    const { email, userId } = await makeUser("Locked");
    const e1 = await signIn({ email: "nobody@example.test", password: "whatever password" }, meta).catch((e) => e);
    const e2 = await signIn({ email, password: "wrong password!!" }, meta).catch((e) => e);
    expect((e1 as AppError).message).toBe((e2 as AppError).message);
    for (let i = 0; i < 4; i++) await signIn({ email, password: "wrong password!!" }, meta).catch(() => null);
    await expect(signIn({ email, password: "correct horse battery staple" }, meta)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    const events = await db().select().from(securityEvents).where(and(eq(securityEvents.userId, userId), eq(securityEvents.type, "signin.failed")));
    expect(events.length).toBeGreaterThanOrEqual(5);
  });
});

describe("password reset", () => {
  it("resets with a single-use token and revokes sessions", async () => {
    const { email } = await makeUser("Resetter");
    const first = await signIn({ email, password: "correct horse battery staple" }, meta);
    await requestPasswordReset({ email }, meta);
    const token = await lastEmailToken(email, "/reset-password/confirm");
    await resetPassword(token, "a brand new passphrase", meta);
    expect(await resolveSession(first.session.token)).toBeNull();
    await expect(resetPassword(token, "yet another passphrase", meta)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(signIn({ email, password: "a brand new passphrase" }, meta)).resolves.toMatchObject({ status: "ok" });
  });

  it("answers identically for unknown emails", async () => {
    await expect(requestPasswordReset({ email: "ghost@example.test" }, meta)).resolves.toBeUndefined();
  });
});

describe("two-step verification (TOTP)", () => {
  it("enrols, requires a code at sign-in, and accepts a recovery code once", async () => {
    const { email, userId } = await makeUser("Mfa");
    const s0 = await signIn({ email, password: "correct horse battery staple" }, meta);
    const session0 = (await resolveSession(s0.session.token))!;
    const { secret } = await beginMfaEnrollment(userId);
    const [u] = await db().select().from(users).where(eq(users.id, userId));
    expect(u!.mfaTotpSecretEnc).not.toContain(secret); // encrypted at rest
    await expect(confirmMfaEnrollment(userId, session0.id, "000000", meta)).rejects.toMatchObject({ code: "VALIDATION" });
    const { recoveryCodes } = await confirmMfaEnrollment(userId, session0.id, totp(secret), meta);
    expect(recoveryCodes).toHaveLength(10);

    const s1 = await signIn({ email, password: "correct horse battery staple" }, meta);
    expect(s1.status).toBe("mfa_required");
    const pending = (await resolveSession(s1.session.token))!;
    expect(pending.mfaSatisfied).toBe(false);
    await expect(completeMfaChallenge(pending.id, userId, "123456", meta)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    // The enrolment code can't be reused; the next 30-second code (within the drift window) works once.
    await expect(completeMfaChallenge(pending.id, userId, totp(secret), meta)).rejects.toMatchObject({ code: "UNAUTHENTICATED", message: /already been used/ });
    const next = totp(secret, Date.now() + 30_000);
    await completeMfaChallenge(pending.id, userId, next, meta);
    expect((await resolveSession(s1.session.token))!.mfaSatisfied).toBe(true);
    const sReplay = await signIn({ email, password: "correct horse battery staple" }, meta);
    const pReplay = (await resolveSession(sReplay.session.token))!;
    await expect(completeMfaChallenge(pReplay.id, userId, next, meta)).rejects.toMatchObject({ message: /already been used/ });
    expect((await resolveSession(sReplay.session.token))!.mfaSatisfied).toBe(false);

    const s2 = await signIn({ email, password: "correct horse battery staple" }, meta);
    const p2 = (await resolveSession(s2.session.token))!;
    await completeMfaChallenge(p2.id, userId, recoveryCodes[0]!, meta);
    const s3 = await signIn({ email, password: "correct horse battery staple" }, meta);
    const p3 = (await resolveSession(s3.session.token))!;
    await expect(completeMfaChallenge(p3.id, userId, recoveryCodes[0]!, meta)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
