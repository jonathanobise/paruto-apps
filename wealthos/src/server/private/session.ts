import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, withUser } from "@/server/db/client";
import { userPreferences, users } from "@/server/db/schema";
import { hashPassword } from "@/server/identity/crypto";
import { createSession } from "@/server/identity/sessions";
import { AppError } from "@/server/platform/errors";
import { privateOwnerEmail, verifiedOwner } from "@/lib/private-mode";

/**
 * Signs the owner in on a private deployment, creating the owner's account on first visit (the
 * database is rebuilt at each deploy). Cloudflare Access has already checked the owner's mailbox
 * with a one-time code and the Worker has verified that, so this session counts as fully
 * authenticated. The account has a random password nobody knows: password sign-in is closed.
 */
export async function startOwnerSession(headers: Headers): Promise<{ token: string; expiresAt: Date }> {
  const email = verifiedOwner(headers);
  if (!email || email !== privateOwnerEmail()) throw new AppError("FORBIDDEN", "This is a private deployment.");
  let [user] = await db().select({ id: users.id }).from(users).where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1);
  if (!user) {
    const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
    [user] = await db().insert(users).values({ email, displayName: email.split("@")[0]!, passwordHash, emailVerifiedAt: new Date() }).returning({ id: users.id });
    await db().insert(userPreferences).values({ userId: user!.id });
    await withUser(user!.id, (tx) => tx.execute(sql`select app_create_organization(${user!.id}::uuid, ${"Personal"}, 'personal'::org_kind, false)`));
  }
  return createSession(user!.id, { mfaSatisfied: true, ip: null, userAgent: null });
}
