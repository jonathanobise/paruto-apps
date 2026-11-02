"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { createSourceAction } from "../actions";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function SourceForm() {
  const [state, action, actionPending] = useActionState(createSourceAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Key" htmlFor="key" hint="e.g. cbn-auctions" error={fieldError(state, "key")}><Input id="key" name="key" required /></Field>
      <Field label="Name" htmlFor="name" error={fieldError(state, "name")}><Input id="name" name="name" required /></Field>
      <Field label="Kind" htmlFor="kind"><Select id="kind" name="kind" defaultValue="official"><option value="official">Official publisher</option><option value="licensed">Licensed vendor</option><option value="admin_verified_import">Admin-verified import</option></Select></Field>
      <Field label="Freshness threshold (days)" htmlFor="defaultFreshnessDays"><Input id="defaultFreshnessDays" name="defaultFreshnessDays" defaultValue="5" inputMode="numeric" /></Field>
      <Field label="URL" htmlFor="url" className="sm:col-span-2" error={fieldError(state, "url")}><Input id="url" name="url" type="url" placeholder="https://" /></Field>
      <Field label="Licence / terms of use" htmlFor="licenseNote" className="sm:col-span-2" hint="What permits WealthOS to store and display this data, and any attribution required." error={fieldError(state, "licenseNote")}><Textarea id="licenseNote" name="licenseNote" required /></Field>
      <div className="sm:col-span-2"><SubmitButton pendingText="Saving…">Add source</SubmitButton></div>
    </ActionForm>
  );
}
