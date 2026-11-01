"use client";
import { useActionState } from "react";
import { preferencesAction } from "./actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function PreferencesForm(p: { displayName: string; baseCurrency: string; timezone: string; locale: string; theme: string; notifyInApp: boolean; notifyEmail: boolean }) {
  const [state, action] = useActionState(preferencesAction, null);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Display name" htmlFor="displayName" error={fieldError(state, "displayName")}><Input id="displayName" name="displayName" defaultValue={p.displayName} /></Field>
      <Field label="Default display currency" htmlFor="baseCurrency"><Select id="baseCurrency" name="baseCurrency" defaultValue={p.baseCurrency}>{["NGN", "USD", "GBP", "EUR"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Time zone" htmlFor="timezone" error={fieldError(state, "timezone")}><Input id="timezone" name="timezone" defaultValue={p.timezone} /></Field>
      <Field label="Number & date format" htmlFor="locale"><Select id="locale" name="locale" defaultValue={p.locale}><option value="en-NG">English (Nigeria)</option><option value="en-GB">English (UK)</option><option value="en-US">English (US)</option></Select></Field>
      <Field label="Theme" htmlFor="theme"><Select id="theme" name="theme" defaultValue={p.theme}><option value="system">Match my device</option><option value="light">Light</option><option value="dark">Dark</option></Select></Field>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 text-[13px] font-medium text-text-2">Notifications</legend>
        <label className="flex items-center gap-2"><input type="checkbox" name="notifyInApp" defaultChecked={p.notifyInApp} className="accent-[var(--accent)]" /> In-app alerts</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="notifyEmail" defaultChecked={p.notifyEmail} className="accent-[var(--accent)]" /> Email alerts (when available)</label>
      </fieldset>
      <div className="sm:col-span-2"><SubmitButton pendingText="Saving…">Save preferences</SubmitButton></div>
    </form>
  );
}
