export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--brand)" />
        <path d="M8 11l3.5 11L16 13l4.5 9L24 11" fill="none" stroke="var(--brand-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-[19px] font-semibold tracking-tight">WealthOS</span>
    </span>
  );
}
