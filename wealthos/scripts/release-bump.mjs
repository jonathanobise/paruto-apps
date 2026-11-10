/**
 * Which kind of release this is (docs/RELEASES.md), suggested from what changed since the last one,
 * with the reasons. Pure, so it's tested (tests/unit/releases.test.ts). Paths are relative to wealthos/.
 *
 * - major: people must adapt, or a milestone: a commit marked "[major]" or with a line starting
 *   "BREAKING:", a page taken away, or a migration that drops or renames something.
 * - minor: something people can feel: a What's New note waiting, a new page, a new table.
 * - patch: everything else (fixes, security, speed, wording, the team's own tools).
 *
 * @param {{ noteWaiting: boolean, changes: { status: string, path: string }[], commits: string[], migrations: { path: string, sql: string }[] }} input
 * @returns {{ bump: "major" | "minor" | "patch", reasons: string[] }}
 */
export function suggestBump({ noteWaiting, changes, commits, migrations }) {
  const page = (p) => /^src\/app\/.*\/page\.tsx$/.test(p) && !/\/(admin|dev)\//.test(p);
  const route = (p) => "/" + p.replace(/^src\/app\//, "").replace(/\/page\.tsx$/, "").split("/").filter((s) => !/^\(.*\)$/.test(s)).join("/");

  const major = [];
  for (const c of commits) {
    const subject = c.split("\n")[0];
    if (/\[major\]/i.test(subject) || /^BREAKING(?: CHANGE)?:/m.test(c)) major.push(`marked major: “${subject}”`);
  }
  for (const c of changes) if (c.status === "D" && page(c.path)) major.push(`a page taken away: ${route(c.path)}`);
  for (const m of migrations) if (/\bDROP\s+(TABLE|COLUMN)\b|\bRENAME\b/i.test(m.sql)) major.push(`a migration that drops or renames: ${m.path}`);
  if (major.length) return { bump: "major", reasons: major };

  const minor = [];
  if (noteWaiting) minor.push("a What’s New note is waiting (people will feel it)");
  for (const c of changes) if (c.status === "A" && page(c.path)) minor.push(`a new page: ${route(c.path)}`);
  for (const m of migrations) if (/\bCREATE\s+TABLE\b/i.test(m.sql)) minor.push(`a new table: ${m.path}`);
  if (minor.length) return { bump: "minor", reasons: minor };

  return { bump: "patch", reasons: ["fixes and changes people won’t notice (no note, no new pages or tables)"] };
}

/** The next number after `latest` ([major, minor, patch], or null before the first release). */
export function nextVersion(latest, bump) {
  if (!latest) return "1.0.0";
  const [major, minor, patch] = latest;
  return bump === "major" ? `${major + 1}.0.0` : bump === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
}
