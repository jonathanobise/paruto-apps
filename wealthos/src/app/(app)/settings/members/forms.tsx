"use client";
import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";
import { createSpaceAction, inviteAction } from "./actions";

export function CreateSpaceForm() {
  const [state, action, pending] = useActionState(createSpaceAction, null);
  return (
    <ActionForm action={action} pending={pending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Name" htmlFor="space-name" error={fieldError(state, "name")}><Input id="space-name" name="name" placeholder="e.g. Adeyemi household" required maxLength={80} /></Field>
        <Field label="Kind" htmlFor="space-kind"><Select id="space-kind" name="kind"><option value="household">Household</option><option value="business">Business</option></Select></Field>
      </div>
      <div><SubmitButton pendingText="Creating…">Create shared space</SubmitButton></div>
    </ActionForm>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteAction, null);
  return (
    <ActionForm action={action} pending={pending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Email" htmlFor="invite-email" error={fieldError(state, "email")}><Input id="invite-email" name="email" type="email" required autoComplete="off" /></Field>
        <Field label="Role" htmlFor="invite-role"><Select id="invite-role" name="role" defaultValue="member"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></Select></Field>
      </div>
      <div><SubmitButton pendingText="Sending…">Send invitation</SubmitButton></div>
    </ActionForm>
  );
}
