"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { Undo2 } from "lucide-react";
import { reverseEventAction } from "./actions";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function ReverseForm({ eventId }: { eventId: string }) {
  const [state, action, actionPending] = useActionState(reverseEventAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <details className="group/rev relative text-[13px]">
      <summary title="Reverse this entry" className="ml-auto grid size-8 cursor-pointer list-none place-items-center rounded-full text-text-3 opacity-60 transition hover:bg-danger-soft hover:text-negative hover:opacity-100 group-open/rev:opacity-100 [&::-webkit-details-marker]:hidden">
        <Undo2 className="size-4" aria-hidden />
        <span className="sr-only">Reverse…</span>
      </summary>
      <ActionForm action={action} pending={actionPending} className="mt-2 flex w-72 flex-col gap-2 rounded-[16px] border border-border-strong bg-surface-2 p-3">
        <p className="text-[12px] text-text-3">Reversing adds a correcting entry; the original stays in your history.</p>
        <input type="hidden" name="eventId" value={eventId} />
        <label htmlFor={`reason-${eventId}`} className="sr-only">Reason</label>
        <Input id={`reason-${eventId}`} name="reason" placeholder="Why? e.g. entered twice" className="h-8 text-[13px]" required minLength={3} />
        <SubmitButton variant="danger" size="sm" pendingText="Reversing…">Reverse entry</SubmitButton>
      </ActionForm>
      <FormMessage state={state} />
    </details>
  );
}
