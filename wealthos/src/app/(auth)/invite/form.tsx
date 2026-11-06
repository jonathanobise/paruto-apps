"use client";
import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { acceptInviteAction } from "@/app/(app)/settings/members/actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction, null);
  return (
    <ActionForm action={action} pending={pending} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton size="lg" pendingText="Joining…">Accept and open</SubmitButton>
    </ActionForm>
  );
}
