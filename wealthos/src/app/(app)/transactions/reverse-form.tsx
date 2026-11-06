"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { reverseEventAction } from "./actions";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function ReverseForm({ eventId }: { eventId: string }) {
  const [state, action, actionPending] = useActionState(reverseEventAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <details className="text-[13px]">
      <summary className="cursor-pointer text-text-3 hover:text-negative">Reverse…</summary>
      <ActionForm action={action} pending={actionPending} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="eventId" value={eventId} />
        <label htmlFor={`reason-${eventId}`} className="sr-only">Reason</label>
        <Input id={`reason-${eventId}`} name="reason" placeholder="Why? e.g. entered twice" className="h-8 text-[13px]" required minLength={3} />
        <SubmitButton variant="danger" size="sm" pendingText="Reversing…">Reverse entry</SubmitButton>
      </ActionForm>
      <FormMessage state={state} />
    </details>
  );
}
