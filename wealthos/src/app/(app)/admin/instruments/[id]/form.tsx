"use client";
import { useActionState } from "react";
import { saveInstrumentAction } from "../../actions";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

type V = Record<string, string | number | boolean | null | undefined>;

export function InstrumentForm({ id, v, facts, classes }: { id: string | null; v: V; facts: Record<string, unknown>; classes: Array<[string, string]> }) {
  const [state, action] = useActionState(saveInstrumentAction, null);
  const t = (k: string) => (v[k] === null || v[k] === undefined ? "" : String(v[k]));
  const f = (k: string) => (facts[k] === undefined ? "" : String(facts[k]));
  const err = (k: string) => fieldError(state, k);
  return (
    <form action={action} className="flex flex-col gap-6">
      <FormMessage state={state} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-[13px] font-semibold">Identity</legend>
        <Field label="Name" htmlFor="name" className="lg:col-span-2" error={err("name")}><Input id="name" name="name" defaultValue={t("name")} required /></Field>
        <Field label="Ticker" htmlFor="symbol"><Input id="symbol" name="symbol" defaultValue={t("symbol")} /></Field>
        <Field label="Issuer / manager" htmlFor="issuer"><Input id="issuer" name="issuer" defaultValue={t("issuer")} /></Field>
        <Field label="ISIN" htmlFor="isin" error={err("isin")}><Input id="isin" name="isin" defaultValue={t("isin")} /></Field>
        <Field label="Asset class" htmlFor="assetClass"><Select id="assetClass" name="assetClass" defaultValue={t("assetClass") || "equity"}>{classes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Currency" htmlFor="currency" error={err("currency")}><Input id="currency" name="currency" defaultValue={t("currency") || "NGN"} /></Field>
        <Field label="Country (ISO or GLOBAL)" htmlFor="country" error={err("country")}><Input id="country" name="country" defaultValue={t("country") || "NG"} /></Field>
        <Field label="Region" htmlFor="region"><Input id="region" name="region" defaultValue={t("region") || "Africa"} /></Field>
        <Field label="Valued by" htmlFor="pricingModel"><Select id="pricingModel" name="pricingModel" defaultValue={t("pricingModel") || "market"}><option value="market">Market price</option><option value="nav">NAV</option><option value="discount_accrual">Discount accretion</option><option value="manual">Manual</option></Select></Field>
        <Field label="Stale after (days)" htmlFor="staleAfterDays"><Input id="staleAfterDays" name="staleAfterDays" defaultValue={t("staleAfterDays") || "5"} inputMode="numeric" /></Field>
        <Field label="Maturity date" htmlFor="maturityDate" error={err("maturityDate")}><Input id="maturityDate" name="maturityDate" type="date" defaultValue={t("maturityDate")} /></Field>
        <Field label="Official page" htmlFor="officialUrl" className="lg:col-span-2" error={err("officialUrl")}><Input id="officialUrl" name="officialUrl" type="url" defaultValue={t("officialUrl")} /></Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-[13px] font-semibold">Facts (from the official factsheet / prospectus)</legend>
        <Field label="Summary" htmlFor="summary" className="sm:col-span-2 lg:col-span-3"><Textarea id="summary" name="summary" defaultValue={f("summary")} maxLength={600} /></Field>
        <Field label="Objective" htmlFor="objective" className="sm:col-span-2 lg:col-span-3"><Input id="objective" name="objective" defaultValue={f("objective")} /></Field>
        <Field label="Ongoing charge (% a year)" htmlFor="ongoingChargePct" error={err("facts")}><Input id="ongoingChargePct" name="ongoingChargePct" defaultValue={f("ongoingChargePct")} inputMode="decimal" /></Field>
        <Field label="Entry fee (%)" htmlFor="entryFeePct"><Input id="entryFeePct" name="entryFeePct" defaultValue={f("entryFeePct")} inputMode="decimal" /></Field>
        <Field label="Exit fee (%)" htmlFor="exitFeePct"><Input id="exitFeePct" name="exitFeePct" defaultValue={f("exitFeePct")} inputMode="decimal" /></Field>
        <Field label="Other fees" htmlFor="otherFees"><Input id="otherFees" name="otherFees" defaultValue={f("otherFees")} /></Field>
        <Field label="Minimum investment" htmlFor="minimumInvestment"><Input id="minimumInvestment" name="minimumInvestment" defaultValue={f("minimumInvestment")} inputMode="decimal" /></Field>
        <Field label="Minimum currency" htmlFor="minimumInvestmentCurrency"><Input id="minimumInvestmentCurrency" name="minimumInvestmentCurrency" defaultValue={f("minimumInvestmentCurrency")} /></Field>
        <Field label="Liquidity" htmlFor="liquidity" className="lg:col-span-2"><Input id="liquidity" name="liquidity" defaultValue={f("liquidity")} /></Field>
        <Field label="Distributions" htmlFor="distributionPolicy"><Input id="distributionPolicy" name="distributionPolicy" defaultValue={f("distributionPolicy")} /></Field>
        <Field label="Benchmark" htmlFor="benchmark"><Input id="benchmark" name="benchmark" defaultValue={f("benchmark")} /></Field>
        <Field label="Domicile" htmlFor="domicile"><Input id="domicile" name="domicile" defaultValue={f("domicile")} /></Field>
        <Field label="Listing" htmlFor="listingVenue"><Input id="listingVenue" name="listingVenue" defaultValue={f("listingVenue")} /></Field>
        <Field label="Key risks (one per line)" htmlFor="riskFactors" className="sm:col-span-2 lg:col-span-3"><Textarea id="riskFactors" name="riskFactors" defaultValue={((facts.riskFactors as string[] | undefined) ?? []).join("\n")} /></Field>
        <Field label="Tax notes" htmlFor="taxNotes" className="sm:col-span-2 lg:col-span-3"><Input id="taxNotes" name="taxNotes" defaultValue={f("taxNotes")} /></Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-semibold">Verification</legend>
        <Field label="Source of the facts (URL)" htmlFor="factsSourceUrl" error={err("factsSourceUrl")}><Input id="factsSourceUrl" name="factsSourceUrl" type="url" defaultValue={t("factsSourceUrl")} /></Field>
        <Field label="Source as-of date" htmlFor="factsAsOf" error={err("factsAsOf")}><Input id="factsAsOf" name="factsAsOf" type="date" defaultValue={t("factsAsOf")} /></Field>
        <label className="flex items-start gap-2 text-sm text-text-2 sm:col-span-2">
          <input type="checkbox" name="verify" defaultChecked={v.verificationState === "verified"} className="mt-1 accent-[var(--accent)]" />
          <span>I have checked the identity and every fact above against the cited official source. (Users see facts only for verified instruments.)</span>
        </label>
      </fieldset>
      <div><SubmitButton pendingText="Saving…">Save instrument</SubmitButton></div>
    </form>
  );
}
