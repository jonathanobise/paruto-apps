"use client";
import { useActionState } from "react";
import { closeAccountAction, updateAccountAction } from "../actions";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export interface AccountDetails {
  id: string;
  name: string;
  institutionName: string | null;
  isInvestment: boolean;
  ownershipPercent: string;
  maskedNumber: string | null;
  notes: string | null;
  isLedger: boolean;
  typeLabel: string;
  currency: string;
}

export function EditAccountForm({ a }: { a: AccountDetails }) {
  const [state, action] = useActionState(updateAccountAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <input type="hidden" name="accountId" value={a.id} />
      <Field label="Name" htmlFor="name" error={fieldError(state, "name")}><Input id="name" name="name" defaultValue={a.name} required maxLength={80} /></Field>
      <Field label="Institution" htmlFor="institutionName"><Input id="institutionName" name="institutionName" defaultValue={a.institutionName ?? ""} maxLength={120} /></Field>
      <Field label="Your ownership share (%)" htmlFor="ownershipPercent" error={fieldError(state, "ownershipPercent")}><Input id="ownershipPercent" name="ownershipPercent" defaultValue={Number(a.ownershipPercent).toString()} inputMode="decimal" className="num" /></Field>
      <Field label="Last 4 characters of account number" htmlFor="maskedNumber" error={fieldError(state, "maskedNumber")}><Input id="maskedNumber" name="maskedNumber" defaultValue={a.maskedNumber ?? ""} maxLength={4} autoComplete="off" /></Field>
      <Field label="Notes" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" defaultValue={a.notes ?? ""} maxLength={500} /></Field>
      {a.isLedger ? (
        <label className="flex items-start gap-2 text-sm text-text-2 sm:col-span-2">
          <input type="checkbox" name="isInvestment" defaultChecked={a.isInvestment} className="mt-1 accent-[var(--accent)]" />
          <span>Include in investment performance (time-weighted and money-weighted returns on the dashboard). Leave off for everyday bank and cash accounts.</span>
        </label>
      ) : null}
      <p className="text-xs text-text-3 sm:col-span-2">Type ({a.typeLabel}) and currency ({a.currency}) can&apos;t change once created, because your history depends on them.</p>
      <div className="sm:col-span-2"><SubmitButton variant="secondary" pendingText="Saving…">Save details</SubmitButton></div>
    </form>
  );
}

export function CloseAccountForm({ id, today, isLedger }: { id: string; today: string; isLedger: boolean }) {
  const [state, action] = useActionState(closeAccountAction, null);
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-text-2 hover:text-negative">Close this account…</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <FormMessage state={state} />
        <input type="hidden" name="accountId" value={id} />
        <p className="text-sm text-text-2">{isLedger ? "The account must be empty (move or withdraw any cash and holdings first). Its transactions stay in your history and reports." : "From the closing date it no longer counts towards your net worth (record any sale proceeds as a deposit). Its valuation history is kept."}</p>
        <Field label="Closed on" htmlFor="closedOn" error={fieldError(state, "closedOn")}><Input id="closedOn" name="closedOn" type="date" defaultValue={today} max={today} required className="max-w-48" /></Field>
        <SubmitButton variant="danger" pendingText="Closing…">Close account</SubmitButton>
      </form>
    </details>
  );
}
