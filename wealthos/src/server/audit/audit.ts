import "server-only";
import { auditEvents, securityEvents } from "@/server/db/schema";
import { db, type Executor } from "@/server/db/client";

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

/** Security event for a user (sign-in, MFA change…). Append-only. */
export async function recordSecurityEvent(userId: string | null, type: string, meta: RequestMeta = {}, metadata: Record<string, unknown> = {}, exec: Executor = db()): Promise<void> {
  await exec.insert(securityEvents).values({ userId, type, ip: validIp(meta.ip), userAgent: meta.userAgent?.slice(0, 500) ?? null, metadata });
}

/** Tenant/admin audit record for a sensitive action. Must run inside the tenant transaction. */
export async function recordAudit(exec: Executor, entry: { orgId: string | null; actorUserId: string | null; action: string; targetType?: string; targetId?: string; metadata?: Record<string, unknown> }): Promise<void> {
  await exec.insert(auditEvents).values({
    orgId: entry.orgId,
    actorUserId: entry.actorUserId,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ?? {},
  });
}

function validIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const first = ip.split(",")[0]!.trim();
  return /^[0-9a-fA-F:.]+$/.test(first) && first.length <= 45 ? first : null;
}
