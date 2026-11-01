import { describe, expect, it } from "vitest";
import { FEATURES, decideFeature, featureDefinition } from "@/server/compliance/features";

describe("regulatory feature gates", () => {
  it("every feature declares classification, permissions, disclosures, approval, audit and jurisdictions", () => {
    for (const f of FEATURES) {
      expect(f.classification).toBeTruthy();
      expect(Array.isArray(f.requiredPermissions)).toBe(true);
      expect(Array.isArray(f.disclosures)).toBe(true);
      expect(f.defaultApproval).toBeTruthy();
      expect(f.auditLogging).toBeTruthy();
      expect(Array.isArray(f.jurisdictions)).toBe(true);
    }
  });

  it("never enables regulated advice or execution, even if a reviewer records approval", () => {
    for (const key of ["PERSONALISED_RECOMMENDATIONS", "AUTO_REBALANCING", "DISCRETIONARY_MANAGEMENT", "ORDER_EXECUTION", "CUSTODY_OF_FUNDS", "AUTOMATED_TRADING", "ADVISER_WORKSPACE"]) {
      const def = featureDefinition(key);
      expect(decideFeature(def, "NG", { approval: "approved", flagEnabled: true, environment: "production" }).available).toBe(false);
    }
  });

  it("keeps features pending counsel review out of production", () => {
    const def = featureDefinition("AI_RESEARCH_ASSISTANT");
    expect(decideFeature(def, "NG", { environment: "production" }).available).toBe(false);
    expect(decideFeature(def, "NG", { environment: "development" }).available).toBe(true);
    expect(decideFeature(def, "NG", { approval: "approved", environment: "production" }).available).toBe(true);
    expect(decideFeature(def, "NG", { approval: "suspended", environment: "development" }).available).toBe(false);
  });

  it("respects jurisdiction and operational flags", () => {
    const def = featureDefinition("PORTFOLIO_TRACKING");
    expect(decideFeature(def, "NG", { environment: "production" }).available).toBe(true);
    expect(decideFeature(def, "GH", { environment: "production" }).available).toBe(false);
    expect(decideFeature(def, "NG", { flagEnabled: false, environment: "production" }).available).toBe(false);
  });
});
