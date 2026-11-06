import { describe, expect, it } from "vitest";
import { factsSchema } from "@/server/research/facts";

describe("product facts schema", () => {
  it("treats blank form fields as not provided", () => {
    const r = factsSchema.parse({ summary: "", ongoingChargePct: "", entryFeePct: "  ", minimumInvestment: "", minimumInvestmentCurrency: "", riskFactors: [] });
    expect(r).toEqual({ riskFactors: [] });
  });
  it("validates provided values", () => {
    expect(factsSchema.safeParse({ ongoingChargePct: "1.5%", riskFactors: [] }).success).toBe(false);
    expect(factsSchema.parse({ ongoingChargePct: "1.5", minimumInvestmentCurrency: "ngn", riskFactors: ["Interest-rate risk"] })).toMatchObject({ ongoingChargePct: "1.5", minimumInvestmentCurrency: "NGN" });
  });
});
