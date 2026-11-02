import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { supportCases, supportMessages, users } from "@/server/db/schema";
import { withTenant, withUser, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { rateLimit } from "@/server/platform/rate-limit";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { asAdmin, type AdminContext } from "@/server/admin/context";
import { appUrl, sendEmail } from "@/server/identity/email";

export const SUPPORT_TOPICS = { account: "Account and sign-in", billing: "Plans and billing", data: "Figures look wrong", imports: "Importing data", privacy: "Privacy and my data", bug: "Something isn't working", other: "Something else" } as const;

const caseSchema = z.object({
  topic: z.enum(Object.keys(SUPPORT_TOPICS) as [keyof typeof SUPPORT_TOPICS, ...Array<keyof typeof SUPPORT_TOPICS>]),
  subject: z.string().trim().min(4, "Add a short subject").max(120),
  body: z.string().trim().min(10, "Tell us a bit more").max(5000),
});
const bodySchema = z.string().trim().min(2, "Write a message").max(5000);

export async function createCase(ctx: TenantContext, input: unknown): Promise<string> {
  const c = parseOrThrow(caseSchema, input);
  await rateLimit(`support:${ctx.userId}`, 10, 86_400);
  return withTenant(ctx, async (tx) => {
    const [row] = await tx.insert(supportCases).values({ userId: ctx.userId, orgId: ctx.orgId, topic: c.topic, subject: c.subject }).returning({ id: supportCases.id });
    await tx.insert(supportMessages).values({ caseId: row!.id, authorId: ctx.userId, fromStaff: false, body: c.body });
    return row!.id;
  });
}

export async function listMyCases(userId: string) {
  return withUser(userId, (tx) => tx.select().from(supportCases).where(eq(supportCases.userId, userId)).orderBy(desc(supportCases.updatedAt)).limit(50));
}

export async function getMyCase(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "Request not found.");
  return withUser(userId, async (tx) => {
    const [c] = await tx.select().from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new AppError("NOT_FOUND", "Request not found.");
    const messages = await tx.select({ id: supportMessages.id, fromStaff: supportMessages.fromStaff, body: supportMessages.body, createdAt: supportMessages.createdAt }).from(supportMessages).where(eq(supportMessages.caseId, id)).orderBy(asc(supportMessages.createdAt));
    return { case: c, messages };
  });
}

export async function replyToMyCase(userId: string, id: string, body: unknown): Promise<void> {
  const b = parseOrThrow(bodySchema, body);
  await rateLimit(`support-reply:${userId}`, 40, 86_400);
  await withUser(userId, async (tx) => {
    const [c] = await tx.select().from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new AppError("NOT_FOUND", "Request not found.");
    if (c.status === "closed") throw new AppError("CONFLICT", "This request is closed. Open a new one if you still need help.");
    await tx.insert(supportMessages).values({ caseId: id, authorId: userId, fromStaff: false, body: b });
    await tx.update(supportCases).set({ status: "open", updatedAt: new Date() }).where(eq(supportCases.id, id));
  });
}

export async function closeMyCase(userId: string, id: string): Promise<void> {
  await withUser(userId, (tx) => tx.update(supportCases).set({ status: "closed", closedAt: new Date(), updatedAt: new Date() }).where(and(eq(supportCases.id, id), eq(supportCases.userId, userId))));
}

// --- Administrators ---------------------------------------------------------------------------
export async function adminListCases(admin: AdminContext, status: Array<"open" | "answered" | "closed"> = ["open", "answered"]) {
  return asAdmin(admin, (tx) =>
    tx.select({ id: supportCases.id, topic: supportCases.topic, subject: supportCases.subject, status: supportCases.status, updatedAt: supportCases.updatedAt, createdAt: supportCases.createdAt, email: users.email, name: users.displayName })
      .from(supportCases).innerJoin(users, eq(users.id, supportCases.userId)).where(inArray(supportCases.status, status)).orderBy(desc(supportCases.updatedAt)).limit(200),
  );
}

export async function adminGetCase(admin: AdminContext, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "Case not found.");
  return asAdmin(admin, async (tx) => {
    const [c] = await tx.select().from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new AppError("NOT_FOUND", "Case not found.");
    const [u] = await tx.select({ email: users.email, name: users.displayName }).from(users).where(eq(users.id, c.userId));
    const messages = await tx.select().from(supportMessages).where(eq(supportMessages.caseId, id)).orderBy(asc(supportMessages.createdAt));
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.support_case_viewed", targetType: "support_case", targetId: id });
    return { case: c, user: u!, messages };
  });
}

export async function adminReply(admin: AdminContext, id: string, body: unknown, close = false): Promise<void> {
  const b = parseOrThrow(bodySchema, body);
  const to = await asAdmin(admin, async (tx) => {
    const [c] = await tx.select().from(supportCases).where(eq(supportCases.id, id));
    if (!c) throw new AppError("NOT_FOUND", "Case not found.");
    await tx.insert(supportMessages).values({ caseId: id, authorId: admin.userId, fromStaff: true, body: b });
    await tx.update(supportCases).set({ status: close ? "closed" : "answered", closedAt: close ? new Date() : null, updatedAt: new Date() }).where(eq(supportCases.id, id));
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.support_replied", targetType: "support_case", targetId: id, metadata: { closed: close } });
    const [u] = await tx.select({ email: users.email }).from(users).where(eq(users.id, c.userId));
    return { email: u!.email, subject: c.subject };
  });
  await sendEmail({ to: to.email, subject: `Re: ${to.subject}`, text: `WealthOS support replied to your request "${to.subject}".\n\nRead and reply: ${appUrl(`/support/${id}`)}`, purpose: "support" });
}

export async function adminCloseCase(admin: AdminContext, id: string): Promise<void> {
  await asAdmin(admin, async (tx) => {
    await tx.update(supportCases).set({ status: "closed", closedAt: new Date(), updatedAt: new Date() }).where(eq(supportCases.id, id));
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.support_closed", targetType: "support_case", targetId: id });
  });
}

