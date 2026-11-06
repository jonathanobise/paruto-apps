import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { createSession, resolveSession, setActiveOrg } from "@/server/identity/sessions";
import { listOrganizations } from "@/server/identity/tenancy";
import { rateLimit } from "@/server/platform/rate-limit";
import { AppError } from "@/server/platform/errors";
import { demoUserEmail, isDemoMode } from "./mode";

/**
 * "Explore the demo": signs the visitor in as the shared demo user, on the DEMO portfolio.
 * Only in DEMO_MODE. The demo user can't enable two-step verification or change its password
 * there (src/server/demo/mode.ts), so no second factor is skipped.
 */
export async function startDemoSession(): Promise<{ token: string; expiresAt: Date }> {
  if (!isDemoMode()) throw new AppError("FORBIDDEN", "The demo sign-in is only available on the public demo.");
  await rateLimit("demo:signin", 600, 60);
  const [user] = await db()
    .select({ id: users.id, mfa: users.mfaEnabledAt })
    .from(users)
    .where(and(eq(users.email, demoUserEmail()), isNull(users.deletedAt)))
    .limit(1);
  if (!user || user.mfa) throw new AppError("CONFLICT", "The demo is being reset. Try again in a minute.");
  const session = await createSession(user.id, { mfaSatisfied: true, ip: null, userAgent: null });
  const demoOrg = (await listOrganizations(user.id)).find((o) => o.isDemo);
  const record = await resolveSession(session.token);
  if (demoOrg && record) await setActiveOrg(record.id, demoOrg.id);
  return session;
}
