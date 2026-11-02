import { describe, expect, it } from "vitest";
import { JURISDICTIONS, OFFERED_JURISDICTIONS, RECORD_CURRENCIES } from "@/lib/jurisdictions";
import { FEATURES, decideFeature } from "@/server/compliance/features";
import { currencyPolicy, roundToCurrency } from "@/engine";

describe("jurisdictions", () => {
  it("only Nigeria is offered, and no feature is allowed anywhere that isn't offered", () => {
    expect(OFFERED_JURISDICTIONS).toEqual(["NG"]);
    for (const f of FEATURES) for (const j of f.jurisdictions) expect(OFFERED_JURISDICTIONS, f.key).toContain(j);
  });
  it("every feature is unavailable in planned jurisdictions, in every environment", () => {
    for (const j of JURISDICTIONS.filter((x) => !x.offered))
      for (const f of FEATURES)
        for (const environment of ["development", "staging", "production"] as const)
          expect(decideFeature(f, j.code, { environment, approval: "approved" }).available, `${f.key}/${j.code}/${environment}`).toBe(false);
  });
  it("record-keeping currencies have presentation policies (XOF has no minor units)", () => {
    for (const c of RECORD_CURRENCIES) expect(currencyPolicy(c).code).toBe(c);
    expect(roundToCurrency("1234.5", "XOF").toFixed()).toBe("1234");
    expect(roundToCurrency("1234.565", "GHS").toFixed()).toBe("1234.56");
    for (const j of JURISDICTIONS) expect(RECORD_CURRENCIES as readonly string[]).toContain(j.currency);
  });
});
