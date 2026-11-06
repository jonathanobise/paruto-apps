import "server-only";
import { z } from "zod";
import { regulatoryFeatureApprovals } from "@/server/db/schema";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { asStaff, type AdminContext } from "@/server/admin/context";
import { FEATURES } from "./features";

const schema = z.object({
  feature: z.string(),
  status: z.enum(["approved", "rejected", "suspended", "pending_review"]),
  reference: z.string().trim().min(5, "Cite the memo, opinion or decision document").max(300),
  notes: z.string().trim().max(1000).optional(),
  jurisdiction: z.string().regex(/^[A-Z]{2}$/).default("NG"),
});

/**
 * Record a compliance decision (append-only) as the signed-in compliance reviewer. Hard-disabled
 * (regulated) features can't be approved this way: they need a code change and authorisation.
 */
export async function recordComplianceDecision(reviewer: AdminContext, input: unknown): Promise<void> {
  const d = parseOrThrow(schema, input);
  const def = FEATURES.find((f) => f.key === d.feature);
  if (!def) throw new AppError("NOT_FOUND", "Unknown feature.");
  if (def.hardDisabled && d.status === "approved") throw new AppError("FORBIDDEN", `${def.name} is hard-disabled in code (regulated activity); it can't be approved here.`);
  await asStaff(reviewer, ["compliance"], async (tx) => {
    await tx.insert(regulatoryFeatureApprovals).values({ featureKey: def.key, jurisdiction: d.jurisdiction, status: d.status, reviewerUserId: reviewer.userId, reference: d.reference, notes: d.notes ?? null });
    await recordAudit(tx, { orgId: null, actorUserId: reviewer.userId, action: "compliance.decision_recorded", targetType: "feature", targetId: def.key, metadata: { status: d.status, jurisdiction: d.jurisdiction, reference: d.reference } });
  });
}
