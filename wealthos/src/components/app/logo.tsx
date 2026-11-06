import { useId } from "react";
import { BRAND_LAST, BRAND_LEAD } from "@/lib/brand";

/** Layered app-icon mark (violet gradient tile, inner gloss, faceted V) + editorial wordmark (ADR-030). Keep public/icons/*.svg in step. */
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
          <stop offset="0" stopColor="#9b6bff" />
          <stop offset="0.55" stopColor="#6a2fe0" />
          <stop offset="1" stopColor="#2e0f7a" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${tile})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill={`url(#${gloss})`} stroke="#fff" strokeOpacity="0.18" />
      {/* Faceted V: the left arm catches the light, the right rises higher like a growth line, with a glint at its tip. */}
      <path d="M7 10.5H12.2L16 19.2V25.5Z" fill="#fff" />
      <path d="M16 19.2L20.3 6.5H25.3L16 25.5Z" fill="#fff" fillOpacity="0.72" />
      <path d="M25.6 2.9l.5 1.35 1.35.5-1.35.5-.5 1.35-.5-1.35-1.35-.5 1.35-.5z" fill="#fff" />
    </svg>
  );
}

/** `compact`: just the mark on phone-sized screens (the wordmark returns from the sm breakpoint). */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className={`font-display text-[19px] whitespace-nowrap ${compact ? "hidden sm:inline" : ""}`}>
        {BRAND_LEAD}<em>{BRAND_LAST}</em>
      </span>
    </span>
  );
}
