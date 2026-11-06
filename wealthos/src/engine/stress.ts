/**
 * Documented, hypothetical stress scenarios applied to current holdings. The shocks are
 * illustrative assumptions written down in full — not model output, forecasts or history.
 *
 * Asset shocks: the first matching rule per exposure applies. A currency shock then revalues
 * every exposure (asset or liability) whose currency differs from the base: if currency C weakens
 * by p against all others, base-C values of foreign items are multiplied by 1/(1 − p); viewed from
 * another base, C-denominated items are multiplied by (1 − p).
 */
import { Decimal, ZERO, d, sum } from "./decimal";

export interface StressExposure {
  key: string;
  label: string;
  kind: "asset" | "liability";
  /** Value in the base currency (positive for liabilities too). */
  value: Decimal;
  assetClass: string;
  currency: string;
  country: string;
}

export interface ShockRule {
  assetClasses?: string[];
  countries?: string[];
  notCountries?: string[];
  change: Decimal;
  note: string;
}

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  rules: ShockRule[];
  currencyShock?: { currency: string; depreciation: Decimal };
}

const FOREIGN_EQUITY = ["equity", "equity_fund", "etf"];

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: "ngn-30",
    name: "Naira weakens 30%",
    description: "The naira loses 30% of its value against all other currencies at once. Nothing else changes.",
    rules: [],
    currencyShock: { currency: "NGN", depreciation: d("0.30") },
  },
  {
    id: "ng-equity-30",
    name: "Nigerian shares fall 30%",
    description: "Nigerian-listed shares and Nigerian equity funds fall 30%. Nothing else changes.",
    rules: [{ assetClasses: ["equity", "equity_fund"], countries: ["NG"], change: d("-0.30"), note: "Nigerian equities −30%" }],
  },
  {
    id: "global-equity-35",
    name: "Global shares fall 35%",
    description: "Shares and equity funds outside Nigeria fall 35% in their own currencies. Exchange rates unchanged.",
    rules: [{ assetClasses: FOREIGN_EQUITY, notCountries: ["NG"], change: d("-0.35"), note: "Non-Nigerian equities −35%" }],
  },
  {
    id: "rates-up",
    name: "Interest rates jump",
    description: "A large, sudden rise in interest rates. Illustrative price falls by maturity: bonds −12%, corporate bonds −10%, bond funds −5%, Treasury bills −1%; money-market funds and deposits unchanged.",
    rules: [
      { assetClasses: ["government_bond"], change: d("-0.12"), note: "Government bonds −12%" },
      { assetClasses: ["corporate_bond"], change: d("-0.10"), note: "Corporate bonds −10%" },
      { assetClasses: ["fixed_income_fund"], change: d("-0.05"), note: "Bond funds −5%" },
      { assetClasses: ["treasury_bill"], change: d("-0.01"), note: "Treasury bills −1%" },
    ],
  },
  {
    id: "property-20",
    name: "Property values fall 20%",
    description: "Real estate you own is worth 20% less. Nothing else changes.",
    rules: [{ assetClasses: ["real_estate"], change: d("-0.20"), note: "Real estate −20%" }],
  },
  {
    id: "combined",
    name: "Combined shock",
    description: "Several things at once: Nigerian shares −30%, global shares −20%, property −15%, and the naira weakens 30%.",
    rules: [
      { assetClasses: ["equity", "equity_fund"], countries: ["NG"], change: d("-0.30"), note: "Nigerian equities −30%" },
      { assetClasses: FOREIGN_EQUITY, notCountries: ["NG"], change: d("-0.20"), note: "Non-Nigerian equities −20%" },
      { assetClasses: ["real_estate"], change: d("-0.15"), note: "Real estate −15%" },
    ],
    currencyShock: { currency: "NGN", depreciation: d("0.30") },
  },
];

function matches(r: ShockRule, e: StressExposure): boolean {
  if (r.assetClasses && !r.assetClasses.includes(e.assetClass)) return false;
  if (r.countries && !r.countries.includes(e.country)) return false;
  if (r.notCountries && r.notCountries.includes(e.country)) return false;
  return true;
}

export interface StressRow {
  key: string;
  label: string;
  kind: "asset" | "liability";
  before: Decimal;
  after: Decimal;
  change: Decimal;
  notes: string[];
}

export interface StressResult {
  scenario: StressScenario;
  netWorthBefore: Decimal;
  netWorthAfter: Decimal;
  change: Decimal;
  changePct: Decimal | null;
  rows: StressRow[];
}

export function runStress(exposures: StressExposure[], scenario: StressScenario, baseCurrency: string): StressResult {
  const rows: StressRow[] = exposures.map((e) => {
    let v = e.value;
    const notes: string[] = [];
    if (e.kind === "asset") {
      const rule = scenario.rules.find((r) => matches(r, e));
      if (rule) {
        v = v.times(d(1).plus(rule.change));
        notes.push(rule.note);
      }
    }
    const cs = scenario.currencyShock;
    if (cs) {
      if (baseCurrency === cs.currency && e.currency !== cs.currency) {
        v = v.div(d(1).minus(cs.depreciation));
        notes.push(`${e.currency} worth more in ${baseCurrency}`);
      } else if (baseCurrency !== cs.currency && e.currency === cs.currency) {
        v = v.times(d(1).minus(cs.depreciation));
        notes.push(`${cs.currency} worth less in ${baseCurrency}`);
      }
    }
    return { key: e.key, label: e.label, kind: e.kind, before: e.value, after: v, change: v.minus(e.value), notes };
  });
  const nw = (pick: (r: StressRow) => Decimal) => sum(rows.filter((r) => r.kind === "asset").map(pick)).minus(sum(rows.filter((r) => r.kind === "liability").map(pick)));
  const before = nw((r) => r.before);
  const after = nw((r) => r.after);
  return { scenario, netWorthBefore: before, netWorthAfter: after, change: after.minus(before), changePct: before.isZero() ? null : after.minus(before).div(before.abs()), rows };
}

export { ZERO };
