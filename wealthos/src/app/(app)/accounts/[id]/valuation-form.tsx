"use client";
import { useActionState } from "react";
import { addValuationAction } from "../actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function ValuationForm({ accountId, today, liability }: { accountId: string; today: string; liability: boolean }) {
  const [state, action] = useActionState(addValuationAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <input type="hidden" name="accountId" value={accountId} />
      <Field label={liability ? "Outstanding balance" : "Value"} htmlFor="amount" error={fieldError(state, "amount")}>
        <Input id="amount" name="amount" inputMode="decimal" className="num" required />
      </Field>
      <Field label="As of" htmlFor="valuedOn" error={fieldError(state, "valuedOn")}>
        <Input id="valuedOn" name="valuedOn" type="date" defaultValue={today} max={today} required />
      </Field>
      <Field label="Basis" htmlFor="valuationType">
        <Select id="valuationType" name="valuationType" defaultValue={liability ? "statement" : "estimate"}>
          <option value="estimate">My estimate</option>
          <option value="statement">Statement</option>
          <option value="appraisal">Professional appraisal</option>
        </Select>
      </Field>
      <Field label="Note" htmlFor="note">
        <Input id="note" name="note" maxLength={300} />
      </Field>
      <div className="sm:col-span-2"><SubmitButton pendingText="Saving…">Save valuation</SubmitButton></div>
    </form>
  );
}
