/**
 * Release numbers (paruto-standards STANDARDS.md, Versioning; docs/RELEASES.md): Major.Minor.Patch,
 * written "v1.4.2". A release with a What's New note (something people can feel) adds a minor
 * version; one with only fixes adds a patch; a major version only on purpose (`--major`).
 * Stored without the "v". The build learns its own number from the release tag on the commit it was
 * built from (deploy/demo/deploy.sh passes it in as NEXT_PUBLIC_VIO_*); development builds have none.
 */
// A major version has at most three digits, so a calendar name (2026.11.9) never passes for one.
const SEMVER = /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,4})$/;

export const isVersion = (v: unknown): v is string => typeof v === "string" && SEMVER.test(v);

/** "v1.4.2", as it's shown everywhere. */
export const versionLabel = (v: string) => `v${v}`;

/** A release's anchor on the release timeline ("release-1-4-2"). */
export const releaseAnchor = (v: string) => `release-${v.replaceAll(".", "-")}`;

/** Compares Major, then Minor, then Patch, as numbers. */
export function compareVersions(a: string, b: string): number {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number)) as [number[], number[]];
  return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!;
}

const raw = process.env.NEXT_PUBLIC_VIO_RELEASE;
/** The release this build is ("1.0.0"), or null in development and unnumbered builds. */
export const CURRENT_RELEASE: string | null = isVersion(raw) ? raw : null;
/** When this release went live (ISO, with offset), or null. */
export const CURRENT_RELEASE_AT: string | null = CURRENT_RELEASE && process.env.NEXT_PUBLIC_VIO_RELEASE_AT ? process.env.NEXT_PUBLIC_VIO_RELEASE_AT : null;
/** The commit this build was made from ("dev" in development). The update pill compares it with what's live. */
export const BUILD: string = process.env.NEXT_PUBLIC_VIO_BUILD || "dev";

/** A newer build is live when it's a real build and differs from this page's. */
export const isNewBuild = (mine: string, live: string | null) => mine !== "dev" && !!live && live !== "dev" && live !== mine;
