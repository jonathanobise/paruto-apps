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
    id: "2026-11-11-pro-price-charts",
    date: "2026-11-11",
    at: "2026-11-11T08:15+01:00",
    version: "1.3.0",
    title: "Price charts you can explore",
    summary: "Every instrument page now has a full, interactive price chart.",
    points: [
      "Daily prices for up to ten years: drag to move through time, pinch or scroll to zoom, and pick a range from a month to everything.",
      "Point anywhere to read that day's price and the change from the start of what's on screen.",
      "Switch to a logarithmic scale to see long histories in proportion.",
    ],
  },
  {
    id: "2026-11-11-markets-today",
    date: "2026-11-11",
    at: "2026-11-11T04:43+01:00",
    version: "1.2.0",
    title: "The markets, at a glance, every day",
    summary: "Your dashboard now opens with the official figures that move a Nigerian portfolio, and the research assistant can look them up for you.",
    points: [
      "Markets today: the CBN's official dollar, pound and euro rates, Nigeria's inflation, the policy rate, the real policy rate, the US fed funds rate and the one-year Treasury bill yield, each with its date, source and two-year trend.",
      "The dollar rate, inflation and the policy rate sit in the top bar on wide screens, one tap from the full economic backdrop.",
      "The research assistant can now read the economy and the markets: exchange-rate and inflation history, Treasury bill and bond yields, long-run returns, and screens, comparisons and backtests of mixes you choose.",
    ],
  },
  {
    id: "2026-11-11-charts-and-pages",
    date: "2026-11-11",
    at: "2026-11-11T04:10+01:00",
    version: "1.1.0",
    title: "Charts you can read with a fingertip",
    summary: "Every chart and page has been refined: your net worth reads month by month as you point, and lists scan at a glance.",
    points: [
      "Point at your net worth chart and the figure above it follows you, with the change since the start. Switch between 6 months, a year, three years or everything.",
      "Charts share one calm look: the value scale on the right, each line's latest value in its legend, and a marker on the most recent point.",
      "Projections show the range between the lowest and highest scenario as a soft fan, so no single line looks like the answer.",
      "Accounts, transactions and holdings scan by shape: a small icon for each kind of account and transaction, monograms for investments, and transactions grouped by month.",
      "Holdings opens with your positions, market value and unrealised gain, and each holding's weight has its own small bar.",
    ],
  },
  {
    id: "2026-11-11-first-numbered-release",
    date: "2026-11-11",
    at: "2026-11-11T03:39+01:00",
    version: "1.0.0",
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
