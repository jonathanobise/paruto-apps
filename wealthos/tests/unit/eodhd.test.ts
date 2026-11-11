import { describe, expect, it } from "vitest";
import { GBOND_SERIES, parseBondYields, parseEod } from "@/server/ingest/eodhd";

describe("EODHD end-of-day parsing", () => {
  it("keeps each day's open, high, low and volume with the close", () => {
    const r = parseEod([{ date: "2026-11-02", open: 10, high: 12, low: 9.5, close: 11, adjusted_close: 11, volume: 120000 }], "USD");
    expect(r.rows).toEqual([{ date: "2026-11-02", close: "11", open: "10", high: "12", low: "9.5", volume: "120000" }]);
  });

  it("converts pence to pounds for every price, not the volume", () => {
    const r = parseEod([{ date: "2026-11-02", open: 250, high: 260, low: 245, close: 255, volume: 1000 }], "GBX");
    expect(r.currency).toBe("GBP");
    expect(r.rows[0]).toMatchObject({ close: "2.55", open: "2.5", high: "2.6", low: "2.45", volume: "1000" });
  });

  it("leaves out an incoherent or missing bar but keeps the close and volume", () => {
    const r = parseEod(
      [
        { date: "2026-11-02", open: 10, high: 9, low: 8, close: 11, volume: 5 }, // high below the close
        { date: "2026-11-03", close: 11, volume: null },
        { date: "2026-11-04", open: 0, high: 12, low: 0, close: 11, volume: -3 },
      ],
      "USD",
    );
    expect(r.rows.map((x) => [x.close, x.open, x.high, x.low, x.volume])).toEqual([
      ["11", null, null, null, "5"],
      ["11", null, null, null, null],
      ["11", null, null, null, null],
    ]);
  });
});

describe("EODHD government bond yields", () => {
  it("stores the yield in percent as a decimal fraction and skips bad prints", () => {
    const r = parseBondYields(
      [
        { date: "2026-11-06", close: 16.42 },
        { date: "2026-11-07", close: "4.1" },
        { date: "2026-11-08", close: 160 }, // a bad print, not a yield
        { date: "2026-11-09", close: null },
        { date: "11/10/2026", close: 16 },
      ],
      "NG.GB10Y",
    );
    expect(r.rows).toEqual([
      { seriesKey: "NG.GB10Y", date: "2026-11-06", value: "0.1642" },
      { seriesKey: "NG.GB10Y", date: "2026-11-07", value: "0.041" },
    ]);
    expect(r.skipped).toBe(3);
  });

  it("covers the Nigerian 10-year with US and UK context", () => {
    expect(GBOND_SERIES.map((g) => g.code)).toEqual(["NG10Y.GBOND", "US10Y.GBOND", "UK10Y.GBOND"]);
  });
});
