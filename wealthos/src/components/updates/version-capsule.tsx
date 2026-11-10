"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, RefreshCw, X } from "lucide-react";
import { LogoMark } from "@/components/app/logo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { CURRENT_RELEASE, CURRENT_RELEASE_AT, isVersion, releaseAnchor, versionLabel } from "@/lib/updates/version";
import { NOTES, noteFor } from "@/lib/updates/notes";
import { baseRelease } from "@/lib/updates/releases";
import { readWaiting, refreshToLatest, subscribeWaiting } from "@/lib/updates/waiting";
import { ShippedAt } from "./shipped-at";

/**
 * The version capsule (paruto-standards STANDARDS.md, Version display): "VioWealth v1.0.0" sealed
 * with the brand mark, at the foot of every page and of the sidebar. Tapping it opens This Version:
 * the number, when it went live in the reader's time zone, what it brought, Refresh when a newer
 * version is waiting (the capsule then carries a dot), and Every Release. Development builds show
 * no number.
 */
export function VersionCapsule({ className, compact = false }: { className?: string; compact?: boolean }) {
  const waiting = useSyncExternalStore(subscribeWaiting, readWaiting, () => null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const label = CURRENT_RELEASE ? versionLabel(CURRENT_RELEASE) : "Development build";

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${BRAND} ${label}${waiting !== null ? ", a newer version is ready" : ""}. About this version`}
        title={compact ? `${BRAND} ${label}` : undefined}
        className={cn(
          "vio-capsule spring relative inline-flex items-center gap-1.5 rounded-full border border-border bg-text/[0.03] text-[12px] font-medium text-text-3 hover:border-border-strong hover:text-text-2",
          compact ? "size-9 justify-center" : "h-8 pl-1 pr-3",
          className,
        )}
      >
        <LogoMark className={compact ? "size-6" : "size-[22px]"} />
        {compact ? null : (
          <>
            <span>{BRAND}</span>
            <span className="num text-text-2">{label}</span>
          </>
        )}
        {waiting !== null ? <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-bg bg-accent" /> : null}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        aria-labelledby="this-version-title"
        className="vio-sheet"
      >
        {open ? <ThisVersion waiting={waiting} onClose={() => setOpen(false)} /> : null}
      </dialog>
    </>
  );
}

function ThisVersion({ waiting, onClose }: { waiting: string | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const note = CURRENT_RELEASE ? noteFor(CURRENT_RELEASE) : null;
  const base = CURRENT_RELEASE && !note ? baseRelease(CURRENT_RELEASE, NOTES) : null;
  return (
    <div className="relative p-6 sm:p-7">
      <button type="button" onClick={onClose} aria-label="Close" className="spring absolute right-4 top-4 grid size-9 place-items-center rounded-full text-text-3 hover:bg-text/10 hover:text-text">
        <X className="size-4" aria-hidden />
      </button>
      <div className="flex flex-col items-center pt-2 text-center">
        <span className="vio-seal relative grid place-items-center">
          <img src="/icons/icon-192.png" alt="" width={80} height={80} className="relative size-20 drop-shadow-[0_14px_28px_rgb(76_29_200/0.5)]" />
        </span>
        <p className="kicker mt-5">This version</p>
        <h2 id="this-version-title" className="font-display mt-1.5 text-[28px] leading-tight">
          {BRAND} <span className="num">{CURRENT_RELEASE ? versionLabel(CURRENT_RELEASE) : <em>in development</em>}</span>
        </h2>
        <p className="mt-1.5 text-[13px] text-text-3">
          {CURRENT_RELEASE_AT ? <ShippedAt at={CURRENT_RELEASE_AT} withTime prefix="Live since " /> : CURRENT_RELEASE ? "Live" : "Development builds carry no number."}
        </p>
      </div>

      {waiting !== null ? (
        <div className="mt-6 flex items-center gap-3 rounded-[18px] bg-accent-soft p-3 pl-4">
          <p className="min-w-0 flex-1 text-[14px] font-medium text-text">{isVersion(waiting) ? `${BRAND} ${versionLabel(waiting)} is ready` : `A new version of ${BRAND} is ready`}</p>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => {
              setBusy(true);
              void refreshToLatest();
            }}
            className="spring inline-flex h-9 items-center gap-1.5 rounded-full bg-[image:var(--vio-cta)] px-4 text-[13px] font-semibold text-white"
          >
            <RefreshCw className={cn("size-3.5", busy && "animate-spin motion-reduce:animate-none")} aria-hidden />
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      ) : null}

      {note ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[15px] font-semibold tracking-[-0.015em] text-text">{note.title}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-text-2">{note.summary}</p>
          <ul className="mt-3 space-y-2">
            {note.points.slice(0, 3).map((p) => (
              <li key={p} className="flex gap-2.5 text-[13px] leading-relaxed text-text-2">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      ) : base ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[15px] font-semibold text-text">Fixes and polish, on top of {versionLabel(base.version!)}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-text-2">
            {versionLabel(base.version!)} brought: {base.title.charAt(0).toLowerCase() + base.title.slice(1)}.
          </p>
        </div>
      ) : null}

      <Link
        href={CURRENT_RELEASE ? `/whats-new#${releaseAnchor(CURRENT_RELEASE)}` : "/whats-new"}
        onClick={onClose}
        className="spring mt-6 flex h-11 items-center justify-center gap-2 rounded-full border border-border text-[14px] font-medium text-text hover:bg-text/5"
      >
        Every release <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
