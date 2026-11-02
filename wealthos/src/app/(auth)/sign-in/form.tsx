"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function SignInForm({ next = "/dashboard" }: { next?: string }) {
  const [state, action, actionPending] = useActionState(signInAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={fieldError(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end text-sm">
        <Link href="/reset-password" className="text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton size="lg" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}
