import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  // Capsules with spring motion (HIG); secondary actions sit on Liquid Glass.
  "spring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-ink shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--brand)_45%,transparent)] hover:opacity-95",
        accent: "bg-accent text-brand-ink shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--accent)_55%,transparent)] hover:opacity-95",
        secondary: "glass text-text",
        ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
        danger: "bg-danger-soft text-negative hover:bg-[color-mix(in_srgb,var(--negative)_22%,transparent)]",
        link: "text-accent underline-offset-4 hover:underline px-0 [scale:none]",
      },
      size: { sm: "h-8 px-3.5", md: "h-10 px-5", lg: "h-11 px-6 text-[15px]", icon: "size-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({ className, variant, size, asChild, ...props }: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
