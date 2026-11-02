import type { ReactNode } from "react";

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-border-strong px-6 py-12 text-center">
      {icon ? <div className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent [&_svg]:size-5">{icon}</div> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {children ? <div className="max-w-md text-sm text-text-2">{children}</div> : null}
      {action}
    </div>
  );
}
