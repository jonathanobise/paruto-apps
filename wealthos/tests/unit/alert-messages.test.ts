import { describe, expect, it } from "vitest";
import { FORBIDDEN_WORDS, messages } from "@/server/alerts/messages";
import { backoffSeconds } from "@/server/jobs/queue";

describe("alert wording", () => {
  it("never contains calls to action", () => {
    const samples = [
      messages.priceAbove("GTCO", "₦80.00", "2 Nov 2026", "₦75.00"),
      messages.priceBelow("GTCO", "₦70.00", "2 Nov 2026", "₦75.00"),
      messages.fxAbove("USD/NGN", "1600.00", "2 Nov 2026", "1550.00"),
      messages.fxBelow("USD/NGN", "1500.00", "2 Nov 2026", "1550.00"),
      messages.maturity("FGN T-bill", "31 Dec 2026", 5, "T-bill account"),
      messages.dataStale(2, "VT: last price is 9 days old"),
      messages.concentration("Coronation MMF", "34.0%", "25%"),
      messages.goalMilestone("School fees", "50%"),
    ];
    for (const m of samples) {
      expect(m.title).not.toMatch(FORBIDDEN_WORDS);
      expect(m.body).not.toMatch(FORBIDDEN_WORDS);
    }
  });

  it("backs off exponentially with a cap", () => {
    expect([1, 2, 3, 4].map(backoffSeconds)).toEqual([30, 60, 120, 240]);
    expect(backoffSeconds(20)).toBe(3600);
  });
});
