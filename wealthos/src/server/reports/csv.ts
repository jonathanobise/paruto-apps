import "server-only";
import { csvCell } from "@/server/imports/export";
import type { WealthStatement } from "./statement";

const line = (cells: unknown[]) => cells.map(csvCell).join(",");

/** Statement as one long-format CSV: section, item, value, currency, as_of, note. Exact decimal strings. */
export function statementCsv(s: WealthStatement): string {
  const ccy = s.dash.baseCurrency;
  const asOf = s.dash.asOf;
  const rows: unknown[][] = [["section", "item", "value", "currency", "as_of", "note"]];
  const t = s.dash.totals;
  for (const [k, v] of Object.entries({ net_worth: t.netWorth, assets: t.assets, liabilities: t.liabilities, investments: t.invested, cash: t.cash, other_assets: t.manualAssets })) rows.push(["summary", k, v, ccy, asOf, t.complete ? "" : "incomplete: some items not valued"]);
  const p = s.dash.performance;
  if (p) {
    for (const [k, v] of Object.entries({ start_value: p.startValue, net_contributions: p.netContributions, investment_gain: p.investmentGain, end_value: p.endValue, income_gross: p.incomeGross, withholding_tax: p.withholdingTax, fees: p.fees, realised_gains: p.realizedGain, fx_effect: p.fxEffect })) rows.push(["performance", k, v, ccy, p.end, `period ${p.start} to ${p.end}`]);
    rows.push(["performance", "twr", p.twr, "ratio", p.end, "time-weighted, cumulative"]);
    rows.push(["performance", "twr_annualised", p.twrAnnualized, "ratio", p.end, p.twrAnnualized ? "" : "not annualised (< 1 year)"]);
    rows.push(["performance", "xirr", p.xirr === null ? null : String(p.xirr), "ratio", p.end, "money-weighted, annual"]);
  }
  for (const [section, slices] of [["allocation_asset_class", s.dash.allocation.assetClass], ["allocation_currency", s.dash.allocation.currency], ["allocation_geography", s.dash.allocation.geography]] as const)
    for (const x of slices) rows.push([section, x.label, x.value, ccy, asOf, `weight ${x.weight}`]);
  for (const h of s.dash.holdings) rows.push(["holding", `${h.name}${h.symbol ? ` (${h.symbol})` : ""} · ${h.accountName}`, h.marketValueBase, ccy, h.priceDate ?? asOf, `units ${h.quantity}; price ${h.price ?? "none"} ${h.currency}; cost ${h.costBase ?? ""}; method ${h.method}${h.synthetic ? "; SAMPLE" : ""}`]);
  for (const c of s.dash.cash) rows.push(["cash", c.accountName, c.amount, c.currency, asOf, c.amountBase ? `${c.amountBase} ${ccy}` : "not converted"]);
  for (const m of s.dash.manual) rows.push([m.kind === "liability" ? "liability" : "other_asset", m.name, m.amount, m.currency, m.valuedOn, `your valuation (${m.valuationType})`]);
  for (const x of s.income) rows.push(["income", `${x.label} · ${x.instrument ?? x.account}`, x.amount, x.currency, x.date, ""]);
  for (const x of s.costs) rows.push(["cost", `${x.label} · ${x.instrument ?? x.account}`, x.amount, x.currency, x.date, ""]);
  for (const g of s.goals) {
    rows.push(["goal", g.name, g.current, g.currency, asOf, `target ${g.target}${g.targetIsReal ? " in today's money" : ""} by ${g.targetDate}; progress ${g.progress ?? "n/a"}`]);
    for (const sc of g.scenarios) rows.push(["goal_projection", `${g.name} @ ${sc.annualReturn}`, sc.finalNominal, g.currency, g.targetDate, `hypothetical; meets target: ${sc.meetsTarget}`]);
  }
  for (const i of s.dash.issues) rows.push(["data_quality", i.label, null, null, asOf, i.message]);
  rows.push(["data_quality", "latest_price_date", s.dash.freshness.latestPriceDate, null, asOf, s.dash.freshness.syntheticData ? "includes SAMPLE data" : ""]);
  for (const m of [...s.methodology, ...s.disclosures]) rows.push(["notes", "", null, null, asOf, m]);
  return rows.map(line).join("\r\n");
}

export function holdingsCsv(s: WealthStatement): string {
  const header = ["account", "instrument", "symbol", "asset_class", "currency", "units", "price", "price_date", "valuation_method", "market_value", "market_value_base", "cost", "cost_base", "unrealised_base", "weight", "ownership_share", "sample_data", "base_currency", "as_of"];
  return [line(header), ...s.dash.holdings.map((h) => line([h.accountName, h.name, h.symbol, h.assetClass, h.currency, h.quantity, h.price, h.priceDate, h.method, h.marketValue, h.marketValueBase, h.cost, h.costBase, h.unrealizedBase, h.weight, h.ownershipShare, h.synthetic, s.dash.baseCurrency, s.dash.asOf]))].join("\r\n");
}
