"use client";
import { useActionState } from "react";
import { createInstrumentAction } from "../actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

const CLASSES: Array<[string, string]> = [
  ["treasury_bill", "Treasury bill"],
  ["fixed_deposit", "Fixed deposit"],
  ["government_bond", "Government bond"],
  ["corporate_bond", "Corporate bond"],
  ["money_market", "Money-market fund"],
  ["equity", "Listed share"],
  ["equity_fund", "Equity fund"],
  ["etf", "ETF"],
  ["fixed_income_fund", "Fixed-income fund"],
  ["other", "Other"],
];

export function InstrumentForm() {
  const [state, action] = useActionState(createInstrumentAction, null);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <Field label="Name" htmlFor="i-name" error={fieldError(state, "name")}>
        <Input id="i-name" name="name" placeholder="e.g. FGN T-bill 364d, 12 Mar 2027" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type" htmlFor="i-class">
          <Select id="i-class" name="assetClass" defaultValue="treasury_bill">{CLASSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        </Field>
        <Field label="Currency" htmlFor="i-ccy">
          <Select id="i-ccy" name="currency" defaultValue="NGN">{["NGN", "USD", "GBP", "EUR"].map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Valued by" htmlFor="i-pricing">
          <Select id="i-pricing" name="pricingModel" defaultValue="discount_accrual">
            <option value="discount_accrual">Accretion to face at maturity</option>
            <option value="nav">Fund NAV</option>
            <option value="market">Market price</option>
            <option value="manual">My own estimates</option>
          </Select>
        </Field>
        <Field label="Maturity date" htmlFor="i-mat" error={fieldError(state, "maturityDate")}>
          <Input id="i-mat" name="maturityDate" type="date" />
        </Field>
        <Field label="Ticker (optional)" htmlFor="i-sym">
          <Input id="i-sym" name="symbol" maxLength={20} />
        </Field>
        <Field label="Country" htmlFor="i-country" hint="NG, US… or GLOBAL">
          <Input id="i-country" name="country" defaultValue="NG" maxLength={6} />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingText="Adding…">Add instrument</SubmitButton>
    </form>
  );
}
