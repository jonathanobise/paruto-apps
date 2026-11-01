import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-[13px] text-text-3">{eyebrow}</div> : null}
        <h1 className="font-display text-[28px] leading-tight font-semibold sm:text-[32px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-text-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
