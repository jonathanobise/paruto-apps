import { AlertTriangle, CircleCheck, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: { cls: "bg-info-soft border-border text-text", Icon: Info },
  warning: { cls: "bg-warning-soft border-transparent text-text", Icon: AlertTriangle },
  danger: { cls: "bg-danger-soft border-transparent text-text", Icon: OctagonAlert },
  success: { cls: "bg-accent-soft border-transparent text-text", Icon: CircleCheck },
};

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", cls, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone === "danger" ? "text-negative" : tone === "warning" ? "text-warning" : "text-accent")} />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn("text-text-2", title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}
