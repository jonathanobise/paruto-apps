import { Flag, Wrench } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { versionLabel, releaseAnchor } from "@/lib/updates/version";
import type { TimelineItem } from "@/lib/updates/releases";
import { ShippedAt } from "./shipped-at";

/**
 * The release history as a timeline down one line (paruto-standards STANDARDS.md, Version display):
 * each release people can feel as a point with its note in full, the fix-only releases between them
 * in one quiet line, milestones flagged, the reader's own version marked with the app's light, and
 * an anchor on every release so the version capsule opens it at the reader's version.
 */
export function ReleaseTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative ml-3 border-l border-border-strong">
      {items.map((it) => {
        if (it.kind === "fixes") {
          const first = it.versions.at(-1)!;
          const last = it.versions[0]!;
          return (
            <li key={`fixes-${last}`} id={releaseAnchor(last)} className="relative scroll-mt-28 pb-8 pl-8">
              {it.versions.slice(1).map((v) => (
                <span key={v} id={releaseAnchor(v)} className="absolute scroll-mt-28" />
              ))}
              <span aria-hidden className="absolute -left-[7px] top-1 grid size-3.5 place-items-center rounded-full border border-border-strong bg-bg">
                <span className="size-1.5 rounded-full bg-text-3" />
              </span>
              <p className="flex items-center gap-2 text-[13px] text-text-3">
                <Wrench className="size-3.5" aria-hidden />
                Fixes and polish · <span className="num">{it.versions.length === 1 ? versionLabel(first) : `${versionLabel(first)} to ${versionLabel(last)}`}</span>
                {it.current ? <YouAreHere /> : null}
              </p>
            </li>
          );
        }
        if (it.kind === "earlier") {
          return (
            <li key={it.note.id} className="relative pb-8 pl-8">
              <span aria-hidden className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-border-strong" />
              <p className="text-[12px] text-text-3">
                Before numbered releases · <ShippedAt at={it.note.at} />
              </p>
              <h3 className="mt-1 text-[17px] font-semibold">{it.note.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-text-2">{it.note.summary}</p>
            </li>
          );
        }
        return (
          <li key={it.version} id={releaseAnchor(it.version)} className="relative scroll-mt-28 pb-12 pl-8">
            <span aria-hidden className={cn("absolute -left-[9px] top-1 grid size-[18px] place-items-center rounded-full border-2 border-bg", it.current ? "bg-[image:var(--vio-cta)] shadow-[0_0_0_4px_rgb(124_77_255/0.22),0_0_18px_rgb(124_77_255/0.6)]" : "bg-accent")}>
              <span className="size-1.5 rounded-full bg-white" />
            </span>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-3">
              <span className="num font-semibold text-text-2">
                {BRAND} {versionLabel(it.version)}
              </span>
              {it.at ? (
                <>
                  · <ShippedAt at={it.at} />
                </>
              ) : null}
              {it.milestone ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  <Flag className="size-3" aria-hidden /> {it.milestone}
                </span>
              ) : null}
              {it.current ? <YouAreHere /> : null}
            </p>
            {it.note ? (
              <>
                <h2 className="font-display mt-2 text-[24px] leading-tight">{it.note.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-text-2">{it.note.summary}</p>
                <ul className="mt-4 space-y-2.5">
                  {it.note.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[14.5px] leading-relaxed text-text-2">
                      <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-text-2">A release without a note.</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function YouAreHere() {
  return <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-accent">Your version</span>;
}
