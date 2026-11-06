"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import { saveGoalAction } from "./actions";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export interface GoalDefaults {
  id?: string;
  name?: string;
  kind?: string;
  targetAmount?: string;
  currency?: string;
  targetDate?: string;
  targetIsReal?: boolean;
  scope?: string;
  accountIds?: string[];
  monthlyContribution?: string;
  contributionTiming?: string;
  contributionGrowthPct?: string;
  inflationPct?: string;
  annualFeePct?: string;
  scenarios?: Array<{ label: string; annualReturnPct: string }>;
  notes?: string;
}

export function GoalForm({ g, kinds, accounts }: { g: GoalDefaults; kinds: Array<[string, string]>; accounts: Array<{ id: string; name: string }> }) {
  const [state, action, actionPending] = useActionState(saveGoalAction, null);
  const [scope, setScope] = useState(g.scope ?? "net_worth");
  const scenarios = g.scenarios ?? [{ label: "Cautious", annualReturnPct: "" }, { label: "Middle", annualReturnPct: "" }, { label: "Hopeful", annualReturnPct: "" }];
  const err = (k: string) => fieldError(state, k);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-6">
      <FormMessage state={state} />
      {g.id ? <input type="hidden" name="id" value={g.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Goal name" htmlFor="name" className="lg:col-span-2" error={err("name")}><Input id="name" name="name" defaultValue={g.name} required /></Field>
        <Field label="Type" htmlFor="kind"><Select id="kind" name="kind" defaultValue={g.kind ?? "other"}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Target amount" htmlFor="targetAmount" error={err("targetAmount")}><Input id="targetAmount" name="targetAmount" defaultValue={g.targetAmount} inputMode="decimal" className="num" required /></Field>
        <Field label="Currency" htmlFor="currency"><Select id="currency" name="currency" defaultValue={g.currency ?? "NGN"}>{["NGN", "USD", "GBP", "EUR"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Target date" htmlFor="targetDate" error={err("targetDate")}><Input id="targetDate" name="targetDate" type="date" defaultValue={g.targetDate} required /></Field>
        <Field label="The target is in" htmlFor="targetIsReal" hint="With inflation, ₦10m in 5 years buys less than ₦10m today.">
          <Select id="targetIsReal" name="targetIsReal" defaultValue={g.targetIsReal === false ? "nominal" : "real"}><option value="real">Today&apos;s money (inflation-adjusted)</option><option value="nominal">Future money (as written)</option></Select>
        </Field>
        <Field label="Count towards it" htmlFor="scope">
          <Select id="scope" name="scope" value={scope} onChange={(e) => setScope(e.target.value)}><option value="net_worth">My whole net worth</option><option value="accounts">Specific accounts</option></Select>
        </Field>
      </div>
      {scope === "accounts" ? (
        <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-[13px] font-medium text-text-2">Accounts</legend>
          {accounts.map((a) => <label key={a.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="accountIds" value={a.id} defaultChecked={g.accountIds?.includes(a.id)} className="accent-[var(--accent)]" /> {a.name}</label>)}
          {err("accountIds") ? <p className="text-xs font-medium text-negative">{err("accountIds")![0]}</p> : null}
        </fieldset>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Monthly contribution" htmlFor="monthlyContribution" error={err("monthlyContribution")}><Input id="monthlyContribution" name="monthlyContribution" defaultValue={g.monthlyContribution ?? "0"} inputMode="decimal" className="num" /></Field>
        <Field label="Paid at the" htmlFor="contributionTiming"><Select id="contributionTiming" name="contributionTiming" defaultValue={g.contributionTiming ?? "end"}><option value="end">End of each month</option><option value="beginning">Start of each month</option></Select></Field>
        <Field label="Contribution rises (% a year)" htmlFor="contributionGrowthPct" error={err("contributionGrowthPct")}><Input id="contributionGrowthPct" name="contributionGrowthPct" defaultValue={g.contributionGrowthPct ?? "0"} inputMode="decimal" /></Field>
        <Field label="Fees (% a year)" htmlFor="annualFeePct" error={err("annualFeePct")}><Input id="annualFeePct" name="annualFeePct" defaultValue={g.annualFeePct ?? "0"} inputMode="decimal" /></Field>
        <Field label="Inflation assumption (% a year)" htmlFor="inflationPct" hint="Your own assumption." error={err("inflationPct")}><Input id="inflationPct" name="inflationPct" defaultValue={g.inflationPct} inputMode="decimal" required /></Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-[13px] font-medium text-text-2">Return scenarios (at least two)</legend>
        <p className="mb-3 text-xs text-text-3">Annual returns before fees that you want to test. These are your assumptions, not expectations or promises; a single figure is never shown on its own.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <Input name="scenarioLabel" aria-label={`Scenario ${i + 1} name`} defaultValue={scenarios[i]?.label ?? ""} placeholder={`Scenario ${i + 1}`} />
              <Input name="scenarioReturn" aria-label={`Scenario ${i + 1} return %`} defaultValue={scenarios[i]?.annualReturnPct ?? ""} placeholder="% a yr" inputMode="decimal" className="w-24 num" />
            </div>
          ))}
        </div>
        {err("scenarios") ? <p className="mt-2 text-xs font-medium text-negative">{err("scenarios")![0]}</p> : null}
      </fieldset>
      <Field label="Notes" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={g.notes} maxLength={500} /></Field>
      <div><SubmitButton pendingText="Saving…">Save goal</SubmitButton></div>
    </ActionForm>
  );
}
