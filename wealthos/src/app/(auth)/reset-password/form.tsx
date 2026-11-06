"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { requestResetAction, resetPasswordAction } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function RequestResetForm() {
  const [state, action, actionPending] = useActionState(requestResetAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton size="lg" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </ActionForm>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, actionPending] = useActionState(resetPasswordAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" hint="At least 12 characters." error={fieldError(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <SubmitButton size="lg" pendingText="Saving…">
        Set new password
      </SubmitButton>
    </ActionForm>
  );
}
