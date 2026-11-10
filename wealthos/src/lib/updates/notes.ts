/**
 * What's New: one note for each release people can feel (a minor or major version). Write the next
 * one at the top with `version: "next"` and placeholder id/date/at; `npm run release` stamps the
 * number and time (id, date, at and version, in that order, one per line). Fix-only releases
 * (patches) have no note. Lead with what it means for the person, not how it was built.
 */
export type UpdateNote = {
  id: string;
  date: string;
  at: string;
  /** The release ("1.0.0"), "next" until it ships, or null for a note from before numbering. */
  version: string | null;
  title: string;
  summary: string;
  points: string[];
};

export const NOTES: UpdateNote[] = [
  {
    id: "2026-11-09-first-numbered-release",
    date: "2026-11-09",
    at: "2026-11-09T00:00+00:00",
    version: "next",
    title: "Research, your way in, and a calmer app",
    summary: "The first numbered release of VioWealth: real market research beside your portfolio, one secure way in, and an app that tells you what it's doing.",
    points: [
      "Research real markets: a scoreboard by currency lens, Nigeria's macro picture, Treasury bill and bond yields, and long-run performance for each instrument.",
      "Screen and compare instruments across markets, and test a portfolio idea against history with contributions and rebalancing, all in one currency.",
      "Sign in with Paruto ID, using a passkey or a one-time email code. No password to remember, and signing out ends both.",
      "Always know where you stand: a light beside the logo shows when you're offline and when you're back, and a gentle pill offers the newest version when one is ready.",
      "Make it yours: Light, Dark or System, four depths of dark, and a sidebar that folds to an icon rail (⌃⌘S) and peeks out when you need it.",
      "One bell for your alerts and What's New. The installed app opens on its own launch screen with the new icon, and every page shows the version you're on.",
    ],
  },
];

/** Notes with a release number, newest first, as shown on the timeline. */
export const noteFor = (version: string) => NOTES.find((n) => n.version === version) ?? null;
