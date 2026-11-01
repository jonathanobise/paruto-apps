"use client";
import { useActionState } from "react";
import { mfaChallengeAction } from "../../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function MfaForm() {
  const [state, action] = useActionState(mfaChallengeAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label="Authentication code" htmlFor="code" hint="6 digits from your authenticator app, or a recovery code (ABCDE-12345).">
        <Input id="code" name="code" inputMode="text" autoComplete="one-time-code" autoFocus required className="num tracking-widest" />
      </Field>
      <SubmitButton size="lg" pendingText="Verifying…">
        Verify
      </SubmitButton>
    </form>
  );
}
