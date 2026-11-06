"use client";
import { useMemo, useState } from "react";
import { d, feeDrag, project, projectScenarios } from "@/engine";
import { Field, Input, Select } from "@/components/ui/form";
import { ScenarioChart } from "@/components/app/scenario-chart";
import { formatMoney } from "@/lib/format";

/**
 * Runs entirely in the browser on the same deterministic engine as the server — nothing is saved
 * or sent anywhere. Invalid inputs simply pause the results.
 */
export function Simulator({ currency }: { currency: string }) {
  const [v, setV] = useState({ start: "1000000", monthly: "100000", years: "10", growth: "5", low: "8", mid: "14", high: "20", inflation: "18", fee: "1", timing: "end" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const result = useMemo(() => {
    const num = (s: string) => /^-?\d+(\.\d+)?$/.test(s.trim()) ? d(s.trim()) : null;
    const vals = { start: num(v.start.replace(/,/g, "")), monthly: num(v.monthly.replace(/,/g, "")), years: Number(v.years), growth: num(v.growth), low: num(v.low), mid: num(v.mid), high: num(v.high), inflation: num(v.inflation), fee: num(v.fee) };
    if (Object.values(vals).some((x) => x === null) || !Number.isInteger(vals.years) || vals.years < 1 || vals.years > 60) return null;
    const base = { startingBalance: vals.start!, contributionPerPeriod: vals.monthly!, contributionGrowthAnnual: vals.growth!.div(100), annualFee: vals.fee!.div(100), annualInflation: vals.inflation!.div(100), periodsPerYear: 12 as const, years: vals.years, timing: v.timing as "end" | "beginning", taxesModelled: false as const };
    const scen = projectScenarios(base, [{ label: "Lower", annualReturn: vals.low!.div(100) }, { label: "Middle", annualReturn: vals.mid!.div(100) }, { label: "Higher", annualReturn: vals.high!.div(100) }]);
    const drag = feeDrag({ ...base, annualReturn: vals.mid!.div(100) });
    return { scen, drag, disclosures: project({ ...base, annualReturn: vals.mid!.div(100) }).disclosures };
  }, [v]);
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
      <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1" onSubmit={(e) => e.preventDefault()}>
        <Field label={`Starting amount (${currency})`} htmlFor="s-start"><Input id="s-start" value={v.start} onChange={set("start")} inputMode="decimal" className="num" /></Field>
        <Field label="Monthly contribution" htmlFor="s-monthly"><Input id="s-monthly" value={v.monthly} onChange={set("monthly")} inputMode="decimal" className="num" /></Field>
        <Field label="Years" htmlFor="s-years"><Input id="s-years" value={v.years} onChange={set("years")} inputMode="numeric" /></Field>
        <Field label="Contribution rises (% a year)" htmlFor="s-growth"><Input id="s-growth" value={v.growth} onChange={set("growth")} inputMode="decimal" /></Field>
        <fieldset className="grid grid-cols-3 gap-2 sm:col-span-2 xl:col-span-1">
          <legend className="mb-1 text-[13px] font-medium text-text-2">Annual returns to test (%)</legend>
          <Input aria-label="Lower return" value={v.low} onChange={set("low")} inputMode="decimal" />
          <Input aria-label="Middle return" value={v.mid} onChange={set("mid")} inputMode="decimal" />
          <Input aria-label="Higher return" value={v.high} onChange={set("high")} inputMode="decimal" />
        </fieldset>
        <Field label="Inflation (% a year)" htmlFor="s-inf"><Input id="s-inf" value={v.inflation} onChange={set("inflation")} inputMode="decimal" /></Field>
        <Field label="Fees (% a year)" htmlFor="s-fee"><Input id="s-fee" value={v.fee} onChange={set("fee")} inputMode="decimal" /></Field>
        <Field label="Contributions at the" htmlFor="s-timing"><Select id="s-timing" value={v.timing} onChange={set("timing")}><option value="end">End of each month</option><option value="beginning">Start of each month</option></Select></Field>
      </form>
      <div>
        {result ? (
          <>
            <ScenarioChart series={result.scen.map((s) => ({ label: s.label, path: s.result.path.map((p) => ({ year: p.year, nominal: p.nominal.toNumber(), real: p.real.toNumber() })) }))} currency={currency} />
            <table className="mt-4 w-full text-[13px]">
              <thead className="text-left text-text-3"><tr><th className="py-2 font-medium">Scenario</th><th className="py-2 text-right font-medium">Paid in</th><th className="py-2 text-right font-medium">End value</th><th className="py-2 text-right font-medium">In today&apos;s money</th></tr></thead>
              <tbody>
                {result.scen.map((s) => (
                  <tr key={s.label} className="border-t border-border">
                    <td className="py-2">{s.label}</td>
                    <td className="num py-2 text-right">{formatMoney(s.result.totalContributed.toFixed(2), currency, { decimals: 0 })}</td>
                    <td className="num py-2 text-right font-medium">{formatMoney(s.result.finalNominal.toFixed(2), currency, { decimals: 0 })}</td>
                    <td className="num py-2 text-right">{formatMoney(s.result.finalReal.toFixed(2), currency, { decimals: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[13px] text-text-2">In the middle scenario, fees reduce the end value by <span className="num font-medium text-text">{formatMoney(result.drag.drag.toFixed(2), currency, { decimals: 0 })}</span>.</p>
            <ul className="mt-4 list-disc space-y-1 pl-4 text-[12px] text-text-3">{result.disclosures.map((x) => <li key={x}>{x.replace(/Hypothetical constant return of [\d.]+% a year/, "Each scenario assumes a constant return")}</li>)}</ul>
          </>
        ) : (
          <p className="text-sm text-text-3">Enter numbers in every field (1–60 years) to see the scenarios.</p>
        )}
      </div>
    </div>
  );
}
