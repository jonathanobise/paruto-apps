import { z } from "zod";
import { RATE_METHODOLOGIES, type RateMethodology } from "@/engine";

/** Blank form fields mean "not provided". */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "") || v === null ? undefined : v;
const pct = z.preprocess(blankToUndefined, z.string().trim().regex(/^\d{1,3}(\.\d{1,6})?$/, "Percent as a number, e.g. 1.25").optional());
const text = (max: number) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

/**
 * Structured product facts, entered and verified by administrators from an official source
 * (factsheet, prospectus, key information document). Users see them only when the instrument's
 * facts are verified, together with the source and as-of date.
 */
export const factsSchema = z.object({
  summary: text(600),
  objective: text(400),
  ongoingChargePct: pct,
  entryFeePct: pct,
  exitFeePct: pct,
  otherFees: text(300),
  minimumInvestment: z.preprocess(blankToUndefined, z.string().trim().regex(/^\d{1,15}(\.\d{1,2})?$/, "Amount as a number").optional()),
  minimumInvestmentCurrency: z.preprocess(blankToUndefined, z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "3-letter currency code").optional()),
  liquidity: text(300),
  distributionPolicy: text(200),
  benchmark: text(200),
  domicile: text(80),
  listingVenue: text(120),
  riskFactors: z.array(z.string().trim().min(3).max(200)).max(8).default([]),
  taxNotes: text(400),
});
export type ProductFacts = z.infer<typeof factsSchema>;

export const FACT_LABELS: Record<keyof Omit<ProductFacts, "riskFactors" | "minimumInvestmentCurrency">, string> = {
  summary: "Summary",
  objective: "Objective",
  ongoingChargePct: "Ongoing charge (% a year)",
  entryFeePct: "Entry fee (%)",
  exitFeePct: "Exit fee (%)",
  otherFees: "Other fees",
  minimumInvestment: "Minimum investment",
  liquidity: "Liquidity",
  distributionPolicy: "Distributions",
  benchmark: "Benchmark",
  domicile: "Domicile",
  listingVenue: "Listing",
  taxNotes: "Tax notes",
};

/** Plain-language explanation of each rate methodology, shown wherever rates appear. */
export const METHODOLOGY_HELP: Record<RateMethodology, string> = {
  discount_rate: "Quoted on the bank-discount basis: the discount from face value, annualised. It understates the return on the money you actually pay.",
  true_yield: "Simple annualised return on the price paid (also called bond-equivalent or true yield) for the stated tenor.",
  effective_annual_yield: "Annual return assuming the proceeds are reinvested at the same rate (compounded).",
  yield_to_maturity: "Annualised return if a bond is bought at today's price and held to maturity with coupons reinvested at the same yield.",
  trailing_return: "What the investment returned over a past period. Past returns don't predict future ones.",
  distribution_yield: "Income distributed over the past period as a percentage of price. Excludes price changes.",
  advertised_deposit_rate: "The nominal annual rate a bank advertises for a deposit. Check compounding, minimums and withholding tax.",
  money_market_yield: "The yield a fund manager publishes for a money-market fund; its calculation period and basis vary by manager.",
  expected_return: "An assumption about the future, not a measured result.",
  coupon_rate: "The annual interest rate on a bond's face value. Not the same as the yield at today's price.",
};

export const METHODOLOGY_LABELS = RATE_METHODOLOGIES;
