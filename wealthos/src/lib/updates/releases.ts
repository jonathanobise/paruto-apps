/**
 * Every numbered release, as the timeline shows them: each release with a What's New note (minor or
 * major) as a point with its note, the fix-only releases between them gathered into one quiet line,
 * milestones marked. The releases come from the git version tags at build time (deploy.sh passes
 * NEXT_PUBLIC_VIO_RELEASES), with this build's own release added; without them, the notes' versions.
 */
import type { UpdateNote } from "./notes";
import { compareVersions, CURRENT_RELEASE, CURRENT_RELEASE_AT, isVersion } from "./version";

export type Release = { version: string; at: string | null };

/** Releases worth marking on the timeline. */
export const MILESTONES: Record<string, string> = {
  "1.0.0": "First numbered release",
};

export type TimelineItem =
  | { kind: "release"; version: string; at: string | null; note: UpdateNote | null; milestone: string | null; current: boolean }
  /** Fix-only releases in a row, newest first. */
  | { kind: "fixes"; versions: string[]; current: boolean }
  /** A note from before releases were numbered. */
  | { kind: "earlier"; note: UpdateNote };

function tagsFromBuild(): [string, string][] {
  try {
    const parsed: unknown = JSON.parse(process.env.NEXT_PUBLIC_VIO_RELEASES || "[]");
    return Array.isArray(parsed) ? parsed.filter((t): t is [string, string] => Array.isArray(t) && typeof t[0] === "string" && typeof t[1] === "string") : [];
  } catch {
    return [];
  }
}

/** The releases this build knows: the version tags, and this build's release. */
export function knownReleases(tags: [string, string][] = tagsFromBuild(), current: string | null = CURRENT_RELEASE, currentAt: string | null = CURRENT_RELEASE_AT): Release[] {
  const byVersion = new Map<string, Release>();
  for (const [version, at] of tags) if (isVersion(version)) byVersion.set(version, { version, at: at || null });
  if (current && !byVersion.has(current)) byVersion.set(current, { version: current, at: currentAt });
  return [...byVersion.values()].sort((a, b) => compareVersions(b.version, a.version));
}

const isPatch = (v: string) => !v.endsWith(".0");

/** The timeline, newest first, never past `current` (a page never shows a release it isn't). */
export function releaseTimeline(notes: UpdateNote[], releases: Release[], current: string | null = CURRENT_RELEASE): TimelineItem[] {
  const noted = new Map(notes.filter((n) => isVersion(n.version)).map((n) => [n.version!, n]));
  const all = new Map(releases.map((r) => [r.version, r]));
  for (const [version, n] of noted) if (!all.has(version)) all.set(version, { version, at: n.at });
  const versions = [...all.keys()].filter((v) => !current || compareVersions(v, current) <= 0).sort((a, b) => compareVersions(b, a));

  const items: TimelineItem[] = [];
  for (const version of versions) {
    const here = version === current;
    if (isPatch(version)) {
      const last = items.at(-1);
      if (last?.kind === "fixes") {
        last.versions.push(version);
        last.current ||= here;
      } else items.push({ kind: "fixes", versions: [version], current: here });
      continue;
    }
    const note = noted.get(version) ?? null;
    items.push({ kind: "release", version, at: all.get(version)?.at ?? note?.at ?? null, note, milestone: MILESTONES[version] ?? null, current: here });
  }
  for (const n of notes) if (n.version === null) items.push({ kind: "earlier", note: n });
  return items;
}

/** Totals for the timeline's heading. */
export function releaseCounts(items: TimelineItem[]) {
  const features = items.filter((i) => i.kind === "release").length;
  const fixes = items.reduce((n, i) => n + (i.kind === "fixes" ? i.versions.length : 0), 0);
  const first = items.findLast((i) => i.kind === "release");
  return { releases: features + fixes, features, fixes, since: first?.kind === "release" ? first.at : null };
}

/** The nearest release with a note at or below `version` (for a fix-only release: "on top of v1.4.0"). */
export function baseRelease(version: string, notes: UpdateNote[]): UpdateNote | null {
  return notes.filter((n) => isVersion(n.version) && compareVersions(n.version, version) <= 0).sort((a, b) => compareVersions(b.version!, a.version!))[0] ?? null;
}
