"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import { createAccountAction } from "../actions";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

type TypeOption = { value: string; label: string; class: string };

export function NewAccountForm({ types, today }: { types: TypeOption[]; today: string }) {
  const [state, action, actionPending] = useActionState(createAccountAction, null);
  const [type, setType] = useState("bank");
  const cls = types.find((t) => t.value === type)?.class ?? "ledger";
  return (
    <ActionForm action={action} pending={actionPending} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <Field label="Account type" htmlFor="type" error={fieldError(state, "type")}>
        <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
          <optgroup label="Tracked by transactions">
            {types.filter((t) => t.class === "ledger").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </optgroup>
          <optgroup label="Assets valued by estimate">
            {types.filter((t) => t.class === "manual_asset").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </optgroup>
          <optgroup label="Liabilities">
            {types.filter((t) => t.class === "liability").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </optgroup>
        </Select>
      </Field>
      <Field label="Name" htmlFor="name" hint="Something you'll recognise, e.g. “GTBank salary”." error={fieldError(state, "name")}>
        <Input id="name" name="name" required maxLength={80} />
      </Field>
      <Field label="Institution" htmlFor="institutionName" hint="Optional." error={fieldError(state, "institutionName")}>
        <Input id="institutionName" name="institutionName" maxLength={120} />
      </Field>
      <Field label="Main currency" htmlFor="currency" error={fieldError(state, "currency")}>
        <Select id="currency" name="currency" defaultValue="NGN">
          {["NGN", "USD", "GBP", "EUR"].map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      {cls !== "ledger" ? (
        <>
          <Field label={cls === "liability" ? "Amount outstanding" : "Current value (your estimate)"} htmlFor="openingValue" error={fieldError(state, "openingValue")}>
            <Input id="openingValue" name="openingValue" inputMode="decimal" className="num" required />
          </Field>
          <Field label="Valued on" htmlFor="openingValueDate" error={fieldError(state, "openingValueDate")}>
            <Input id="openingValueDate" name="openingValueDate" type="date" defaultValue={today} max={today} />
          </Field>
        </>
      ) : null}
      <Field label="Your ownership share (%)" htmlFor="ownershipPercent" hint="For joint accounts or co-owned property. Net worth counts your share." error={fieldError(state, "ownershipPercent")}>
        <Input id="ownershipPercent" name="ownershipPercent" defaultValue="100" inputMode="decimal" className="num" />
      </Field>
      <Field label="Last 4 characters of account number" htmlFor="maskedNumber" hint="Optional, for recognition only. Never enter passwords or PINs." error={fieldError(state, "maskedNumber")}>
        <Input id="maskedNumber" name="maskedNumber" maxLength={4} autoComplete="off" />
      </Field>
      <Field label="Notes" htmlFor="notes" className="sm:col-span-2" error={fieldError(state, "notes")}>
        <Textarea id="notes" name="notes" maxLength={500} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Saving…">Add account</SubmitButton>
      </div>
    </ActionForm>
  );
}
