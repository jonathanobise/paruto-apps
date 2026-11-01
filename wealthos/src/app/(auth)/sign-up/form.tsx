"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Your name" htmlFor="displayName" error={fieldError(state, "displayName")}>
        <Input id="displayName" name="displayName" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 12 characters. A short sentence works well." error={fieldError(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <div className="flex flex-col gap-2 text-sm text-text-2">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acceptTerms" className="mt-1 accent-[var(--accent)]" required />
          <span>
            I agree to the <Link href="/legal/terms" className="text-accent hover:underline">Terms</Link> and have read the{" "}
            <Link href="/legal/privacy" className="text-accent hover:underline">Privacy Notice</Link>.
          </span>
        </label>
        {fieldError(state, "acceptTerms") ? <p className="text-xs font-medium text-negative">{fieldError(state, "acceptTerms")![0]}</p> : null}
        <label className="flex items-start gap-2">
          <input type="checkbox" name="marketingOptIn" className="mt-1 accent-[var(--accent)]" />
          <span>Send me occasional product news (optional).</span>
        </label>
      </div>
      <SubmitButton size="lg" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
