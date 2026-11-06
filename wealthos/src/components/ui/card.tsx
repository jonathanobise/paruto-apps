import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  // Content panel: hairline border, top-edge highlight, no glass (glass is for floating controls).
  return <section className={cn("rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow)]", className)} {...props} />;
}
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)} {...props} />;
}
export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-[15px] font-semibold tracking-[-0.015em] text-text", className)} {...props} />;
}
export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1 text-[13px] text-text-3", className)} {...props} />;
}
export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5 pt-4", className)} {...props} />;
}
