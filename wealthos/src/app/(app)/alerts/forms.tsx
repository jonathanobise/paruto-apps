"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import { checkNowAction, createAlertAction } from "./actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function NewAlertForm({ kinds, instruments, goals }: { kinds: Array<[string, string]>; instruments: Array<{ id: string; label: string }>; goals: Array<{ id: string; name: string }> }) {
  const [state, action, actionPending] = useActionState(createAlertAction, null);
  const [kind, setKind] = useState("price_above");
  const err = (k: string) => fieldError(state, k);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="Tell me when" htmlFor="kind"><Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
      {kind.startsWith("price_") ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instrument" htmlFor="instrumentId" error={err("instrumentId")}><Select id="instrumentId" name="instrumentId" required>{instruments.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</Select></Field>
          <Field label="Price level" htmlFor="level" error={err("level")}><Input id="level" name="level" inputMode="decimal" className="num" required /></Field>
        </div>
      ) : null}
      {kind.startsWith("fx_") ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" htmlFor="base"><Select id="base" name="base"><option value="USD">USD/NGN</option><option value="GBP">GBP/NGN</option><option value="EUR">EUR/NGN</option></Select></Field>
          <Field label="Naira per unit" htmlFor="level" error={err("level")}><Input id="level" name="level" inputMode="decimal" className="num" required /></Field>
        </div>
      ) : null}
      {kind === "maturity_reminder" ? <Field label="Days before maturity" htmlFor="daysBefore" error={err("daysBefore")}><Input id="daysBefore" name="daysBefore" defaultValue="7" inputMode="numeric" className="max-w-32" /></Field> : null}
      {kind === "concentration" ? <Field label="When one holding exceeds (% of investments)" htmlFor="maxWeightPct" error={err("maxWeightPct")}><Input id="maxWeightPct" name="maxWeightPct" defaultValue="25" inputMode="decimal" className="max-w-32" /></Field> : null}
      {kind === "goal_progress" ? (
        goals.length ? <Field label="Goal" htmlFor="goalId" error={err("goalId")}><Select id="goalId" name="goalId">{goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field> : <p className="text-sm text-text-3">Create a goal first.</p>
      ) : null}
      <label className="flex items-center gap-2 text-sm text-text-2"><input key={kind} type="checkbox" name="repeat" defaultChecked={!kind.startsWith("price_") && !kind.startsWith("fx_")} className="accent-[var(--accent)]" /> Keep watching after it triggers (at most once a day)</label>
      <div><SubmitButton pendingText="Saving…">Create alert</SubmitButton></div>
    </ActionForm>
  );
}

export function CheckNowForm() {
  const [state, action, actionPending] = useActionState(checkNowAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-wrap items-center gap-3">
      <SubmitButton variant="secondary" size="sm" pendingText="Checking…">Check now</SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}
