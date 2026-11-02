"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { changePasswordAction } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function PasswordForm() {
  const [state, action, actionPending] = useActionState(changePasswordAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="Current password" htmlFor="current"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
      <Field label="New password" htmlFor="password" hint="At least 12 characters." error={fieldError(state, "password")}><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
      <SubmitButton variant="secondary" pendingText="Saving…">Change password</SubmitButton>
    </ActionForm>
  );
}
