"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { mfaChallengeAction } from "../../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function MfaForm() {
  const [state, action, actionPending] = useActionState(mfaChallengeAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="Authentication code" htmlFor="code" hint="6 digits from your authenticator app, or a recovery code (ABCDE-12345).">
        <Input id="code" name="code" inputMode="text" autoComplete="one-time-code" autoFocus required className="num tracking-widest" />
      </Field>
      <SubmitButton size="lg" pendingText="Verifying…">
        Verify
      </SubmitButton>
    </ActionForm>
  );
}
