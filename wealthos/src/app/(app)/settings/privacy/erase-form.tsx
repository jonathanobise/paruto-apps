"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { eraseAccountAction } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function EraseForm() {
  const [state, action, actionPending] = useActionState(eraseAccountAction, null);
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-negative">Delete my account…</summary>
      <ActionForm action={action} pending={actionPending} className="mt-4 flex flex-col gap-4">
        <FormMessage state={state} />
        <p className="text-sm text-text-2">This permanently deletes your profile and every portfolio you solely own, including all accounts, transactions and valuations. Download your data first. Security and consent logs keep only an anonymous identifier.</p>
        <Field label="Password" htmlFor="erase-pw"><Input id="erase-pw" name="password" type="password" autoComplete="current-password" required /></Field>
        <Field label='Type "DELETE MY ACCOUNT"' htmlFor="confirmation" error={fieldError(state, "confirmation")}><Input id="confirmation" name="confirmation" autoComplete="off" required /></Field>
        <SubmitButton variant="danger" pendingText="Deleting…">Permanently delete account</SubmitButton>
      </ActionForm>
    </details>
  );
}
