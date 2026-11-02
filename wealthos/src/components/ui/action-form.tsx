"use client";
import { createContext, startTransition, type ComponentProps } from "react";

export const PendingContext = createContext(false);

/**
 * A form bound to a useActionState action that keeps what the user typed when the server returns
 * validation errors. (React resets uncontrolled fields after a native form action; dispatching
 * the action inside a transition does not.) Without JavaScript the form still posts normally.
 */
export function ActionForm({ action, pending, children, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (fd: FormData) => void; pending: boolean }) {
  return (
    <PendingContext value={pending}>
      <form
        {...props}
        action={action}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => action(fd));
        }}
      >
        {children}
      </form>
    </PendingContext>
  );
}
