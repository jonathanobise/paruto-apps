import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-text-2",
      accent: "bg-accent-soft text-accent",
      warning: "bg-warning-soft text-warning",
      danger: "bg-danger-soft text-negative",
      demo: "bg-demo-soft text-demo",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
