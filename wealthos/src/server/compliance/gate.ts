import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { featureFlags, regulatoryFeatureApprovals } from "@/server/db/schema";
import { db } from "@/server/db/client";
import { env } from "@/server/platform/env";
import { AppError } from "@/server/platform/errors";
import { decideFeature, featureDefinition, type FeatureDecision } from "./features";

export async function featureDecision(key: string, jurisdiction = "NG"): Promise<FeatureDecision> {
  const def = featureDefinition(key);
  const [approval] = await db()
    .select({ status: regulatoryFeatureApprovals.status })
    .from(regulatoryFeatureApprovals)
    .where(and(eq(regulatoryFeatureApprovals.featureKey, key), eq(regulatoryFeatureApprovals.jurisdiction, jurisdiction)))
    .orderBy(desc(regulatoryFeatureApprovals.createdAt))
    .limit(1);
  const [flag] = await db().select({ enabled: featureFlags.enabled }).from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
  return decideFeature(def, jurisdiction, { ...(approval ? { approval: approval.status } : {}), ...(flag ? { flagEnabled: flag.enabled } : {}), environment: env().NODE_ENV });
}

/** Server-side gate. UI hiding is never relied on. */
export async function requireFeature(key: string, jurisdiction = "NG"): Promise<void> {
  const decision = await featureDecision(key, jurisdiction);
  if (!decision.available) throw new AppError("FEATURE_UNAVAILABLE", decision.reason, { feature: key });
}
