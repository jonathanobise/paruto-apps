import { ArrowRight } from "lucide-react";
import { demoSignInAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

/** "Explore the demo" (public demo deployments only; the action refuses elsewhere). */
export function DemoEntry({ size = "lg", label = "Explore the demo" }: { size?: "md" | "lg"; label?: string }) {
  return (
    <form action={demoSignInAction}>
      <Button type="submit" size={size}>
        {label} {size === "lg" ? <ArrowRight aria-hidden /> : null}
      </Button>
    </form>
  );
}

/** Shown instead of sign-in and sign-up forms on the public demo. */
export function DemoGate() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-text-2">
        This is the public demo. Accounts are closed here: everyone explores the same SAMPLE portfolio, which uses synthetic prices and resets automatically. Please don&apos;t enter real information.
      </p>
      <DemoEntry />
    </div>
  );
}
