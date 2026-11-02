"use client";
import { useActionState } from "react";
import { saveComparisonAction } from "../actions";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function SaveComparisonForm({ ids }: { ids: string[] }) {
  const [state, action] = useActionState(saveComparisonAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="ids" value={ids.join(",")} />
      <label htmlFor="cmp-name" className="sr-only">Name</label>
      <Input id="cmp-name" name="name" placeholder="Name this comparison" className="h-9 w-60" required minLength={2} />
      <SubmitButton variant="secondary" size="sm" pendingText="Saving…">Save</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
