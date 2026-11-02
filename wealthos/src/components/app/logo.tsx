import { useId } from "react";

/** Layered app-icon mark (gradient tile, inner gloss, mark) + editorial wordmark. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  // Unique gradient ids per instance: a gradient defined inside a hidden copy (e.g. the desktop
  // sidebar on a phone) wouldn't paint for the visible one.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tile = `wos-tile-${uid}`;
  const gloss = `wos-gloss-${uid}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#3ddc68" />
          <stop offset="1" stopColor="#0d6b2e" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${tile})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill={`url(#${gloss})`} stroke="#fff" strokeOpacity="0.18" />
      <path d="M8 11l3.5 11L16 13l4.5 9L24 11" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** `compact`: just the mark on phone-sized screens (the wordmark returns from the sm breakpoint). */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className={`font-display text-[19px] ${compact ? "hidden sm:inline" : ""}`}>
        Wealth<em>OS</em>
      </span>
    </span>
  );
}
