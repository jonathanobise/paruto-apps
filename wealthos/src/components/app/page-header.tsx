import type { ReactNode } from "react";

/** Editorial title: SF Pro Display with the last word in Instrument Serif italic (Paruto standard). */
export function DisplayTitle({ text }: { text: string }) {
  const i = text.trimEnd().lastIndexOf(" ");
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i + 1)}
      <em>{text.slice(i + 1)}</em>
    </>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-text-3">{eyebrow}</div> : null}
        <h1 className="font-display text-[30px] leading-[1.08] sm:text-[38px]">
          <DisplayTitle text={title} />
        </h1>
        {description ? <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-text-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
