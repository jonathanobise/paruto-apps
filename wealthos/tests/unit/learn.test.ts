import { describe, expect, it } from "vitest";
import { ARTICLES, type Block } from "@/content/learn";
import { d, discountPrice, discountToTrueYield, feeDrag, purchasingPower, realReturn, simpleToEffectiveAnnual, timeWeightedReturn, xirr, type Decimal } from "@/engine";
import { checkOutput } from "@/server/ai/policy";

// Every figure shown in an education example is recomputed here with the engine.
const ngn = (x: Decimal) => `₦${Number(x.toFixed(2)).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (x: Decimal | number) => {
  const v = d(x).times(100).toFixed(2);
  return v.startsWith("-") ? `−${v.slice(1)}%` : `${v}%`;
};
const example = (id: string) => {
  const b = ARTICLES.flatMap((a) => a.body).find((x): x is Extract<Block, { kind: "example" }> => x.kind === "example" && x.id === id);
  if (!b) throw new Error(`no example ${id}`);
  return Object.fromEntries(b.rows);
};

describe("education examples match the engine", () => {
  it("treasury bills", () => {
    const e = example("tbill-364");
    expect(e["Price paid"]).toBe(ngn(discountPrice(d(1000000), d("0.18"), 364)));
    const ty = discountToTrueYield(d("0.18"), 364);
    expect(e["True yield"]).toBe(pct(ty));
    expect(e["Effective annual yield"]).toBe(pct(simpleToEffectiveAnnual(ty, 364)));
    const s = example("tbill-91");
    expect(s["Price paid"]).toBe(ngn(discountPrice(d(1000000), d("0.18"), 91)));
    const ty91 = discountToTrueYield(d("0.18"), 91);
    expect(s["True yield"]).toBe(pct(ty91));
    expect(s["Effective annual yield"]).toBe(pct(simpleToEffectiveAnnual(ty91, 91)));
  });

  it("money market fund annualisation", () => {
    const e = example("mmf-nav");
    const r = d("104.5").div(100).minus(1);
    expect(e["Return over the period"]).toBe(pct(r));
    expect(e["Annualised, simple"]).toBe(pct(r.times(365).div(92)));
    expect(e["Annualised, compounded"]).toBe(pct(r.plus(1).pow(d(365).div(92)).minus(1)));
  });

  it("time-weighted vs money-weighted", () => {
    const e = example("twr-xirr");
    const twr = timeWeightedReturn([
      { date: "2025-01-01", value: d(1000000), flow: d(0) },
      { date: "2025-07-01", value: d(2100000), flow: d(1000000) },
      { date: "2025-12-31", value: d(1995000), flow: d(0) },
    ]).twr;
    expect(e["Time-weighted return"]).toBe(pct(twr));
    const irr = xirr([{ date: "2025-01-01", amount: d(-1000000) }, { date: "2025-07-01", amount: d(-1000000) }, { date: "2025-12-31", amount: d(1995000) }])!;
    expect(e["Money-weighted return (XIRR, annual)"]).toBe(pct(irr));
    expect(e["Value on 31 December"]).toBe(ngn(d(2100000).times("0.95")));
  });

  it("currency", () => {
    const up = example("fx-up");
    const cost = d(1000).times(1500);
    expect(up["Cost in naira"]).toBe(ngn(cost));
    expect(up["Value in naira"]).toBe(ngn(d(1050).times(1650)));
    expect(up["Return in naira"]).toBe(pct(d(1050).times(1650).div(cost).minus(1)));
    expect(up["Return in naira"]).toBe(pct(d("1.05").times(d(1650).div(1500)).minus(1)));
    const down = example("fx-down");
    expect(down["Return in naira"]).toBe(pct(d(1050).times(1350).div(cost).minus(1)));
  });

  it("inflation, fees and concentration", () => {
    expect(example("real-return")["Real return"]).toBe(pct(realReturn(d("0.2"), d("0.25"))));
    expect(example("purchasing-power")["Purchasing power"]).toBe(ngn(purchasingPower(d(1000000), d("0.2"), 5)));
    const f = feeDrag({ startingBalance: d(1000000), contributionPerPeriod: d(0), contributionGrowthAnnual: d(0), annualReturn: d("0.12"), annualFee: d("0.01"), annualInflation: d(0), periodsPerYear: 12, years: 20, timing: "end", taxesModelled: false });
    const e = example("fee-drag");
    expect(e["With no fee"]).toBe(ngn(f.withoutFee));
    expect(e["With a 1% annual fee"]).toBe(ngn(f.withFee));
    expect(e["Cost of the 1% fee"]).toBe(ngn(f.drag));
    expect(e["Share of the no-fee result"]).toBe(pct(f.drag.div(f.withoutFee)));
    const c = example("concentration");
    expect(c["If it was 40% of the portfolio"]).toBe(pct(d("0.4").times("-0.5")));
    expect(c["If it was 10% of the portfolio"]).toBe(pct(d("0.1").times("-0.5")));
  });
});

describe("education content rules", () => {
  const text = (a: (typeof ARTICLES)[number]) => [a.title, a.summary, ...a.body.flatMap((b) => (b.kind === "list" ? b.items : b.kind === "example" ? [b.title, b.note ?? ""] : [b.text]))].join("\n");
  it("has unique slugs and valid related links", () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of ARTICLES) for (const r of a.related) expect(slugs).toContain(r);
  });
  it("contains no prescriptive language and labels every example", () => {
    for (const a of ARTICLES) {
      expect(checkOutput(text(a)), a.slug).toEqual([]);
      for (const b of a.body) if (b.kind === "example") expect(b.note, `${a.slug}/${b.id}`).toMatch(/Illustrative/);
    }
  });
});
