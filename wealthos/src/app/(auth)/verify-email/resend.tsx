"use client";
import { useActionState } from "react";
import { resendVerificationAction } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function ResendForm() {
  const [state, action] = useActionState(resendVerificationAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Sending…">
        Send a new link
      </SubmitButton>
    </form>
  );
}
