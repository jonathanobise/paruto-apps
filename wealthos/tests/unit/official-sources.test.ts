import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoeCsv, parseCbnAuctions, parseCbnDate, parseCbnExchangeRates, parseCbnInflation, parseCbnMoneyMarket, parseFedH15Csv, parseOnsMonthlyCsv, pctToFraction } from "@/server/ingest/official";

const fx = (name: string) => readFileSync(`tests/fixtures/official/${name}`, "utf8");
const json = (name: string) => JSON.parse(fx(name)) as unknown;

describe("official source parsers (excerpts of real responses)", () => {
  it("percentages become exact fractions", () => {
    expect(pctToFraction("27.50")).toBe("0.275");
    expect(pctToFraction("")).toBeNull();
    expect(pctToFraction("ND")).toBeNull();
  });

  it("CBN exchange rates: maps the CBN's currency labels to ISO codes and keeps the central rate", () => {
    const r = parseCbnExchangeRates(json("cbn-fx.json"));
    const usd = r.rows.find((x) => x.base === "USD" && x.date === "2026-11-05");
    expect(usd).toBeDefined();
    expect(Number(usd!.rate)).toBeGreaterThan(0);
    expect(new Set(r.rows.map((x) => x.base))).toEqual(new Set(["USD", "GBP", "EUR", "JPY", "CHF", "CNY", "ZAR", "DKK", "SAR", "AED", "XOF", "XDR"]));
    expect(r.skipped).toBeGreaterThan(0); // WAUA has no ISO code: skipped, not guessed
  });

  it("CBN inflation and money-market indicators: monthly, dated to month end", () => {
    const inf = parseCbnInflation(json("cbn-inflation.json"));
    expect(inf.rows.find((r) => r.seriesKey === "NG.CPI_YOY" && r.date === "2026-09-30")?.value).toBe("0.1463");
    const mm = parseCbnMoneyMarket(json("cbn-money-market.json"));
    expect(mm.rows.find((r) => r.seriesKey === "NG.MPR" && r.date === "2026-09-30")?.value).toBe("0.23");
    expect(mm.rows.some((r) => r.seriesKey === "NG.MPR" && r.date === "2006-01-31")).toBe(false); // 0.00 before the MPR existed
  });

  it("CBN auctions: primary market only, with tenor, stop rate and amounts", () => {
    expect(parseCbnDate("November-04-2026")).toBe("2026-11-04");
    const r = parseCbnAuctions(json("cbn-ntb.json"), "NTB");
    const first = r.rows.find((x) => x.auctionDate === "2026-11-04" && x.tenorDays === 91);
    expect(first).toMatchObject({ maturityDate: "2027-02-04", rate: "0.154" });
  });

  it("Fed H.15, Bank of England and ONS files", () => {
    const fed = parseFedH15Csv(fx("fed-h15.csv"), "US.FEDFUNDS");
    expect(fed.rows.at(-1)).toEqual({ seriesKey: "US.FEDFUNDS", date: "2026-11-04", value: "0.0388" });
    const boe = parseBoeCsv(fx("boe-bank-rate.csv"), "UK.BANKRATE");
    expect(boe.rows.map((r) => [r.date, r.value])).toEqual([["2016-07-01", "0.005"], ["2016-08-04", "0.0025"]]); // only changes
    const ons = parseOnsMonthlyCsv(fx("ons-d7bt.csv"), "UK.CPI");
    expect(ons.rows.find((r) => r.date === "2015-01-31")?.value).toBe("99.3");
    expect(ons.rows.every((r) => /-\d{2}-(28|29|30|31)$/.test(r.date))).toBe(true);
  });
});

describe("data quality", () => {
  it("excludes isolated one-day spikes but keeps lasting moves", async () => {
    const { findIsolatedSpikes } = await import("@/server/ingest/official");
    const rows = [
      { date: "2003-12-08", rate: "136.8" }, { date: "2003-12-09", rate: "1376.8" }, { date: "2003-12-10", rate: "136.63" },
      { date: "2016-06-17", rate: "199" }, { date: "2016-06-20", rate: "280" }, { date: "2016-06-21", rate: "282" },
    ];
    expect(findIsolatedSpikes(rows).map((r) => r.date)).toEqual(["2003-12-09"]);
  });
});

describe("BLS", () => {
  it("monthly CPI values, skipping the annual average and reporting refusals", async () => {
    const { parseBlsSeries } = await import("@/server/ingest/official");
    const ok = parseBlsSeries({ status: "REQUEST_SUCCEEDED", Results: { series: [{ seriesID: "CUUR0000SA0", data: [{ year: "2024", period: "M13", value: "313.689" }, { year: "2024", period: "M12", value: "315.605" }] }] } }, "US.CPI");
    expect(ok.rows).toEqual([{ seriesKey: "US.CPI", date: "2024-12-31", value: "315.605" }]);
    expect(ok.skipped).toBe(1);
    const refused = parseBlsSeries({ status: "REQUEST_NOT_PROCESSED", message: ["daily threshold reached"] }, "US.CPI");
    expect(refused.rows).toEqual([]);
    expect(refused.notes[0]).toContain("daily threshold");
  });
});
