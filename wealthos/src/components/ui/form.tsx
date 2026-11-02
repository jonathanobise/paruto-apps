import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Fields: inset wells with the inner radius (concentric with 24px panels and 12px padding steps).
const fieldBase = "w-full rounded-[var(--radius-inner)] border border-border bg-surface-2 px-3.5 text-[15px] text-text placeholder:text-text-3 transition-[border-color,box-shadow] duration-200 hover:border-border-strong focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-0 aria-[invalid=true]:border-negative";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-11 pr-9", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5", className)} {...props} />;
}
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-text-2", className)} {...props} />;
}

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor: string; hint?: ReactNode; error?: string[] | undefined; children: ReactNode; className?: string }) {
  const errId = `${htmlFor}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error?.length ? <p className="text-xs text-text-3">{hint}</p> : null}
      {error?.length ? (
        <p id={errId} className="text-xs font-medium text-negative" role="alert">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}
