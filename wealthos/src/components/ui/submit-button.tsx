"use client";
import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { PendingContext } from "./action-form";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import type { ComponentProps } from "react";

export function SubmitButton({ children, pendingText, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const status = useFormStatus();
  const contextPending = useContext(PendingContext);
  const pending = status.pending || contextPending;
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}
