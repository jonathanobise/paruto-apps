import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const fieldBase = "w-full rounded-lg border border-border-strong bg-surface px-3 text-[15px] text-text placeholder:text-text-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 aria-[invalid=true]:border-negative";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-10", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-10 pr-8", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-20 py-2", className)} {...props} />;
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
