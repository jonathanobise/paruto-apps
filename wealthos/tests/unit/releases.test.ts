import { describe, expect, it } from "vitest";
import { compareVersions, isNewBuild, isVersion, releaseAnchor, versionLabel } from "@/lib/updates/version";
import { knownReleases, releaseCounts, releaseTimeline } from "@/lib/updates/releases";
import { NOTES, type UpdateNote } from "@/lib/updates/notes";
// @ts-expect-error -- plain JS release script helpers
import { nextVersion, suggestBump } from "../../scripts/release-bump.mjs";

const note = (version: string | null, title = `Note ${version}`): UpdateNote => ({ id: `n-${version}`, date: "2026-11-10", at: "2026-11-10T09:00+01:00", version, title, summary: "s", points: [] });

describe("release numbers", () => {
  it("accepts semver only, never calendar names", () => {
    expect(isVersion("1.0.0")).toBe(true);
    expect(isVersion("2026.11.9")).toBe(false);
    expect(isVersion("v1.0.0")).toBe(false);
    expect(isVersion("01.0.0")).toBe(false);
    expect(versionLabel("1.4.2")).toBe("v1.4.2");
    expect(releaseAnchor("1.4.2")).toBe("release-1-4-2");
    expect(compareVersions("1.10.0", "1.9.3")).toBeGreaterThan(0);
  });

  it("offers a new build only when both are real builds that differ", () => {
    expect(isNewBuild("abc", "def")).toBe(true);
    expect(isNewBuild("abc", "abc")).toBe(false);
    expect(isNewBuild("dev", "def")).toBe(false);
    expect(isNewBuild("abc", null)).toBe(false);
  });

  it("keeps exactly one note waiting for the next release", () => {
    expect(NOTES.filter((n) => n.version === "next").length).toBeLessThanOrEqual(1);
    for (const n of NOTES) expect(n.points.length).toBeLessThanOrEqual(6);
  });
});

describe("release timeline", () => {
  const tags: [string, string][] = [
    ["1.0.0", "2026-11-10T09:00+01:00"],
    ["1.0.1", "2026-11-11T09:00+01:00"],
    ["1.0.2", "2026-11-12T09:00+01:00"],
    ["1.1.0", "2026-11-14T09:00+01:00"],
    ["1.1.1", "2026-11-15T09:00+01:00"],
  ];
  it("shows noted releases as points and gathers fix-only ones, never past the reader's version", () => {
    const items = releaseTimeline([note("1.1.0"), note("1.0.0")], knownReleases(tags, "1.1.1", null), "1.1.1");
    expect(items.map((i) => i.kind)).toEqual(["fixes", "release", "fixes", "release"]);
    expect(items[0]).toMatchObject({ kind: "fixes", versions: ["1.1.1"], current: true });
    expect(items[2]).toMatchObject({ kind: "fixes", versions: ["1.0.2", "1.0.1"] });
    expect(items[3]).toMatchObject({ kind: "release", version: "1.0.0", milestone: "First numbered release" });
    expect(releaseCounts(items)).toMatchObject({ releases: 5, features: 2, fixes: 3, since: "2026-11-10T09:00+01:00" });
    const older = releaseTimeline([note("1.1.0"), note("1.0.0")], knownReleases(tags, "1.0.1", null), "1.0.1");
    expect(older.map((i) => (i.kind === "release" ? i.version : i.kind))).toEqual(["fixes", "1.0.0"]);
  });
  it("adds this build's own release before it's tagged, and leaves the waiting note out", () => {
    expect(knownReleases([], "1.0.0", "2026-11-10T09:00+01:00")).toEqual([{ version: "1.0.0", at: "2026-11-10T09:00+01:00" }]);
    expect(releaseTimeline([note("next")], [], null)).toEqual([]);
  });
});

describe("release command", () => {
  it("numbers the first release v1.0.0, then by what changed", () => {
    expect(nextVersion(null, "minor")).toBe("1.0.0");
    expect(nextVersion([1, 2, 3], "patch")).toBe("1.2.4");
    expect(nextVersion([1, 2, 3], "minor")).toBe("1.3.0");
    expect(nextVersion([1, 2, 3], "major")).toBe("2.0.0");
  });
  it("suggests major, minor or patch with its reasons", () => {
    const none = { noteWaiting: false, changes: [], commits: [], migrations: [] };
    expect(suggestBump(none).bump).toBe("patch");
    expect(suggestBump({ ...none, noteWaiting: true }).bump).toBe("minor");
    expect(suggestBump({ ...none, changes: [{ status: "A", path: "src/app/(app)/goals/new/page.tsx" }] }).reasons[0]).toContain("/goals/new");
    expect(suggestBump({ ...none, changes: [{ status: "A", path: "src/app/(app)/admin/x/page.tsx" }] }).bump).toBe("patch");
    expect(suggestBump({ ...none, changes: [{ status: "D", path: "src/app/(app)/stress/page.tsx" }] }).bump).toBe("major");
    expect(suggestBump({ ...none, commits: ["Rework sign-in\n\nBREAKING: passwords are gone"] }).bump).toBe("major");
    expect(suggestBump({ ...none, migrations: [{ path: "drizzle/0040.sql", sql: "ALTER TABLE x DROP COLUMN y" }] }).bump).toBe("major");
  });
});
