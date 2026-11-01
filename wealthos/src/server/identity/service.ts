import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { consentRecords, userPreferences, users, verificationTokens } from "@/server/db/schema";
import { db, withUser } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { rateLimit } from "@/server/platform/rate-limit";
import { recordSecurityEvent, type RequestMeta } from "@/server/audit/audit";
import { appUrl, sendEmail } from "./email";
import { decryptSecret, encryptSecret, generateRecoveryCodes, generateTotpSecret, hashPassword, needsRehash, otpauthUri, randomToken, sha256, verifyPassword, verifyTotp } from "./crypto";
import { createSession, markSessionMfa, revokeAllSessions } from "./sessions";
import { CONSENT_VERSIONS, passwordSchema, signInSchema, signUpSchema } from "./validation";
import { z } from "zod";

const LOCK_AFTER_FAILURES = 5;
const LOCK_MINUTES = 15;

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function parseOrThrow<T extends z.ZodType>(schemaDef: T, input: unknown): z.infer<T> {
  const parsed = schemaDef.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  return parsed.data;
}

async function issueToken(userId: string, purpose: "email_verification" | "password_reset" | "account_deletion", ttlMinutes: number): Promise<string> {
  const token = randomToken();
  await db().insert(verificationTokens).values({ userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) });
  return token;
}

async function consumeToken(token: string, purpose: "email_verification" | "password_reset" | "account_deletion"): Promise<string | null> {
  const rows = await db()
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(and(eq(verificationTokens.tokenHash, sha256(token)), eq(verificationTokens.purpose, purpose), isNull(verificationTokens.consumedAt), gt(verificationTokens.expiresAt, new Date())))
    .returning({ userId: verificationTokens.userId });
  return rows[0]?.userId ?? null;
}

export async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = await issueToken(userId, "email_verification", 24 * 60);
  await sendEmail({
    to: email,
    subject: "Confirm your WealthOS email address",
    text: `Confirm your email address to finish setting up WealthOS:\n\n${appUrl(`/verify-email/confirm?token=${token}`)}\n\nThe link expires in 24 hours. If you did not create an account, ignore this email.`,
    purpose: "email_verification",
  });
}

export interface SignUpResult {
  /** A session is only created for genuinely new accounts. */
  session: { token: string; expiresAt: Date } | null;
}

export async function signUp(input: unknown, meta: RequestMeta): Promise<SignUpResult> {
  const data = parseOrThrow(signUpSchema, input);
  await rateLimit(`signup:ip:${meta.ip ?? "unknown"}`, 10, 3600);

  const existing = await db().select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing[0]) {
    // Do not reveal that the address is registered; tell the owner instead.
    await sendEmail({ to: data.email, subject: "Someone tried to create a WealthOS account with your email", text: `An attempt was made to register a new WealthOS account with this email address. If it was you, sign in instead or reset your password at ${appUrl("/reset-password")}.`, purpose: "security_notice" });
    await recordSecurityEvent(existing[0].id, "signup.duplicate_attempt", meta);
    return { session: null };
  }

  const passwordHash = await hashPassword(data.password);
  const [user] = await db().insert(users).values({ email: data.email, displayName: data.displayName, passwordHash }).returning({ id: users.id });
  const userId = user!.id;
  await db().insert(userPreferences).values({ userId });
  const consentRows = [
    { consentKey: "terms", version: CONSENT_VERSIONS.terms, granted: true },
    { consentKey: "privacy", version: CONSENT_VERSIONS.privacy, granted: true },
    { consentKey: "marketing_email", version: CONSENT_VERSIONS.marketing_email, granted: data.marketingOptIn },
  ];
  await db().insert(consentRecords).values(consentRows.map((c) => ({ ...c, userId, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 500) ?? null })));
  await withUser(userId, (tx) => tx.execute(sql`select app_create_organization(${userId}::uuid, ${"Personal"}, 'personal'::org_kind, false)`));
  await recordSecurityEvent(userId, "signup", meta);
  await sendVerificationEmail(userId, data.email);
  const session = await createSession(userId, { mfaSatisfied: true, ...meta });
  return { session };
}

export async function verifyEmail(token: string, meta: RequestMeta): Promise<boolean> {
  const userId = await consumeToken(token, "email_verification");
  if (!userId) return false;
  await db().update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
  await recordSecurityEvent(userId, "email.verified", meta);
  return true;
}

export async function resendVerification(userId: string, meta: RequestMeta): Promise<void> {
  await rateLimit(`verify-resend:${userId}`, 3, 3600);
  const [u] = await db().select({ email: users.email, verified: users.emailVerifiedAt }).from(users).where(eq(users.id, userId));
  if (!u || u.verified) return;
  await sendVerificationEmail(userId, u.email);
  await recordSecurityEvent(userId, "email.verification_resent", meta);
}

export type SignInResult = { status: "ok" | "mfa_required"; session: { token: string; expiresAt: Date } };

export async function signIn(input: unknown, meta: RequestMeta): Promise<SignInResult> {
  const data = parseOrThrow(signInSchema, input);
  await rateLimit(`signin:ip:${meta.ip ?? "unknown"}`, 30, 900);
  await rateLimit(`signin:email:${data.email}`, 10, 900);
  const generic = new AppError("UNAUTHENTICATED", "Email or password is incorrect.");

  const [user] = await db().select().from(users).where(and(eq(users.email, data.email), isNull(users.deletedAt))).limit(1);
  if (!user) {
    await verifyPassword(data.password, null); // timing equalisation
    throw generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordSecurityEvent(user.id, "signin.locked", meta);
    throw new AppError("RATE_LIMITED", "This account is temporarily locked after several failed attempts. Try again in 15 minutes or reset your password.");
  }
  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    const failures = user.failedLoginCount + 1;
    await db()
      .update(users)
      .set({ failedLoginCount: failures, lockedUntil: failures >= LOCK_AFTER_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null })
      .where(eq(users.id, user.id));
    await recordSecurityEvent(user.id, "signin.failed", meta, { failures });
    throw generic;
  }
  const updates: Partial<typeof users.$inferInsert> = { failedLoginCount: 0, lockedUntil: null };
  if (user.passwordHash && needsRehash(user.passwordHash)) updates.passwordHash = await hashPassword(data.password);
  await db().update(users).set(updates).where(eq(users.id, user.id));
  const mfaRequired = Boolean(user.mfaEnabledAt);
  const session = await createSession(user.id, { mfaSatisfied: !mfaRequired, ...meta });
  await recordSecurityEvent(user.id, mfaRequired ? "signin.password_ok_mfa_pending" : "signin.success", meta);
  return { status: mfaRequired ? "mfa_required" : "ok", session };
}

export async function completeMfaChallenge(sessionId: string, userId: string, code: string, meta: RequestMeta): Promise<void> {
  await rateLimit(`mfa:${userId}`, 10, 900);
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user?.mfaTotpSecretEnc || !user.mfaEnabledAt) throw new AppError("VALIDATION", "Two-step verification is not enabled.");
  const normalized = code.trim().toUpperCase();
  if (/^\d{6}$/.test(normalized)) {
    if (!verifyTotp(decryptSecret(user.mfaTotpSecretEnc), normalized)) {
      await recordSecurityEvent(userId, "mfa.challenge_failed", meta);
      throw new AppError("UNAUTHENTICATED", "That code is not valid. Check your authenticator app and try again.");
    }
  } else {
    const hashes = user.mfaRecoveryCodeHashes ?? [];
    const h = sha256(normalized);
    if (!hashes.includes(h)) {
      await recordSecurityEvent(userId, "mfa.recovery_failed", meta);
      throw new AppError("UNAUTHENTICATED", "That recovery code is not valid.");
    }
    await db().update(users).set({ mfaRecoveryCodeHashes: hashes.filter((x) => x !== h) }).where(eq(users.id, userId));
    await recordSecurityEvent(userId, "mfa.recovery_code_used", meta, { remaining: hashes.length - 1 });
  }
  await markSessionMfa(sessionId);
  await recordSecurityEvent(userId, "signin.success", meta, { mfa: true });
}

export async function beginMfaEnrollment(userId: string): Promise<{ secret: string; uri: string }> {
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("NOT_FOUND", "User not found.");
  if (user.mfaEnabledAt) throw new AppError("CONFLICT", "Two-step verification is already enabled.");
  const secret = generateTotpSecret();
  await db().update(users).set({ mfaTotpSecretEnc: encryptSecret(secret) }).where(eq(users.id, userId));
  return { secret, uri: otpauthUri(secret, user.email) };
}

export async function confirmMfaEnrollment(userId: string, sessionId: string, code: string, meta: RequestMeta): Promise<{ recoveryCodes: string[] }> {
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user?.mfaTotpSecretEnc) throw new AppError("VALIDATION", "Start the set-up again.");
  if (user.mfaEnabledAt) throw new AppError("CONFLICT", "Two-step verification is already enabled.");
  if (!verifyTotp(decryptSecret(user.mfaTotpSecretEnc), code.trim())) throw new AppError("VALIDATION", "That code is not valid. Check the time on your phone and try again.");
  const recoveryCodes = generateRecoveryCodes();
  await db().update(users).set({ mfaEnabledAt: new Date(), mfaRecoveryCodeHashes: recoveryCodes.map(sha256) }).where(eq(users.id, userId));
  await markSessionMfa(sessionId);
  await revokeAllSessions(userId, sessionId);
  await recordSecurityEvent(userId, "mfa.enabled", meta);
  await sendEmail({ to: user.email, subject: "Two-step verification is on", text: "Two-step verification was turned on for your WealthOS account. Other signed-in devices were signed out. If this wasn't you, reset your password immediately.", purpose: "security_notice" });
  return { recoveryCodes };
}

export async function disableMfa(userId: string, password: string, meta: RequestMeta): Promise<void> {
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new AppError("UNAUTHENTICATED", "Password is incorrect.");
  await db().update(users).set({ mfaEnabledAt: null, mfaTotpSecretEnc: null, mfaRecoveryCodeHashes: null }).where(eq(users.id, userId));
  await recordSecurityEvent(userId, "mfa.disabled", meta);
  await sendEmail({ to: user.email, subject: "Two-step verification was turned off", text: "Two-step verification was turned off for your WealthOS account. If this wasn't you, reset your password immediately.", purpose: "security_notice" });
}

export async function requestPasswordReset(emailInput: unknown, meta: RequestMeta): Promise<void> {
  const email = parseOrThrow(z.object({ email: z.string().trim().toLowerCase().email() }), emailInput).email;
  await rateLimit(`reset:ip:${meta.ip ?? "unknown"}`, 10, 3600);
  await rateLimit(`reset:email:${email}`, 3, 3600);
  const [user] = await db().select({ id: users.id }).from(users).where(and(eq(users.email, email), isNull(users.deletedAt)));
  if (!user) return; // same response either way
  const token = await issueToken(user.id, "password_reset", 60);
  await sendEmail({ to: email, subject: "Reset your WealthOS password", text: `Use this link to choose a new password (valid for 1 hour):\n\n${appUrl(`/reset-password/confirm?token=${token}`)}\n\nIf you did not ask for this, you can ignore this email.`, purpose: "password_reset" });
  await recordSecurityEvent(user.id, "password.reset_requested", meta);
}

export async function resetPassword(token: string, newPassword: unknown, meta: RequestMeta): Promise<void> {
  const password = parseOrThrow(z.object({ password: passwordSchema }), { password: newPassword }).password;
  const userId = await consumeToken(token, "password_reset");
  if (!userId) throw new AppError("VALIDATION", "This reset link is invalid or has expired. Request a new one.");
  await db().update(users).set({ passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, userId));
  await revokeAllSessions(userId);
  await recordSecurityEvent(userId, "password.reset", meta);
}

export async function changePassword(userId: string, sessionId: string, current: string, next: unknown, meta: RequestMeta): Promise<void> {
  const password = parseOrThrow(z.object({ password: passwordSchema }), { password: next }).password;
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(current, user.passwordHash))) throw new AppError("UNAUTHENTICATED", "Current password is incorrect.");
  await db().update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, userId));
  await revokeAllSessions(userId, sessionId);
  await recordSecurityEvent(userId, "password.changed", meta);
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const [user] = await db().select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId));
  return verifyPassword(password, user?.hash ?? null);
}
