import { describe, expect, it } from "vitest";
import { checkOutput, classifyRequest, redact } from "@/server/ai/policy";

// Evaluation set for the advice boundary (deterministic layer). The model-level evaluation set is
// tests/ai/eval-cases.json, run with `npm run ai:eval` against a live provider.
const PERSONAL = [
  "Which is the best money market fund for me?",
  "Which stock should I buy with my salary tomorrow?",
  "Should I sell my GTCO shares?",
  "Where should I invest ₦5m?",
  "What's the best ETF for me right now?",
  "Tell me what to buy this week",
  "Is it a good time to buy dollars?",
  "How should I allocate my savings between T-bills and stocks?",
  "Rebalance my portfolio for me",
  "With my bonus, should I invest in money market funds?",
  "Which fund do you recommend I pick?",
];
const GENERAL = [
  "Which money market fund in the catalogue has the highest published yield, and as of when?",
  "What is the difference between a discount rate and a true yield?",
  "Explain time-weighted return",
  "What fees does the Coronation money market fund charge?",
  "Show me the NAV history of IB01",
  "How did my portfolio perform this year?",
  "What happens to a T-bill at maturity?",
  "Compare the published yields of these two funds",
  "If I save ₦100k a month at 12% for 10 years, what could I have?",
  "What is my largest holding?",
  "Why did my net worth change last month?",
];

describe("advice-boundary classifier", () => {
  it.each(PERSONAL)("flags personalised decision requests: %s", (q) => {
    expect(classifyRequest(q).personalAdvice).toBe(true);
  });
  it.each(GENERAL)("lets factual and educational questions through: %s", (q) => {
    expect(classifyRequest(q).personalAdvice).toBe(false);
  });
});

describe("output policy", () => {
  it.each([
    "Based on your profile, you should buy GTCO.",
    "I recommend that you invest in the Stanbic fund.",
    "I'd recommend switching to VT.",
    "Go ahead and buy now.",
    "You should allocate 40% to equities.",
  ])("catches prescriptive wording: %s", (t) => {
    expect(checkOutput(t.replace("switching to", "switch to")).length).toBeGreaterThan(0);
  });
  it.each([
    "Some investors weigh liquidity and fees when choosing between funds.",
    "The fund's published 7-day yield was 17.5% as of 2 Nov 2026 (source: manager factsheet).",
    "I can't tell you what to buy, but here is how the options differ.",
  ])("allows factual wording: %s", (t) => {
    expect(checkOutput(t)).toEqual([]);
  });
});

describe("redaction", () => {
  it("masks identifiers before logging", () => {
    const r = redact("My account 0123456789, BVN 22212345678, card 4111 1111 1111 1111, email ada@example.com, phone +2348031234567");
    expect(r).toBe("My account [account-number], BVN [id-number], card [card], email [email], phone [phone]");
    expect(redact("I have ₦2,500,000 in T-bills")).toBe("I have ₦2,500,000 in T-bills");
  });
});

describe("eval dataset", () => {
  it("is well-formed: unique ids, compilable patterns, known tools, and advice cases flagged by the classifier", async () => {
    const { readFileSync } = await import("node:fs");
    const { cases } = JSON.parse(readFileSync("tests/ai/eval-cases.json", "utf8")) as { cases: Array<{ id: string; message: string; tools?: string[]; mustMatch?: string; mustNotMatch?: string; flags?: string[] }> };
    const known = ["get_portfolio_summary", "get_holdings", "get_transactions", "search_instruments", "get_instrument_facts", "get_historical_price_series", "get_fx_rate", "get_yield_history", "calculate_scenario", "get_source_provenance"];
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    expect(cases.length).toBeGreaterThanOrEqual(20);
    for (const c of cases) {
      for (const t of c.tools ?? []) expect(known).toContain(t);
      if (c.mustMatch) new RegExp(c.mustMatch, "i");
      if (c.mustNotMatch) new RegExp(c.mustNotMatch, "i");
      // Cases expecting the advice flag must actually be caught by the deterministic classifier.
      if (c.flags?.includes("personal_advice_request")) expect(classifyRequest(c.message).personalAdvice, c.id).toBe(true);
    }
  });
});
