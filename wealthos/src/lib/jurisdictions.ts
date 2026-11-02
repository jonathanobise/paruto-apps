/**
 * Where WealthOS operates. Only jurisdictions with `offered: true` can be chosen for a space, and
 * every feature in the compliance registry lists the jurisdictions it's allowed in (NG only today).
 * Planned entries document what launching there would need; they are NOT offered. Regulator and
 * law names are starting points for counsel to verify, not legal conclusions.
 */
export interface Jurisdiction {
  code: string;
  name: string;
  offered: boolean;
  currency: string;
  locale: string;
  timezone: string;
  capitalMarketsRegulator: string;
  dataProtection: string;
  notes: string;
}

export const JURISDICTIONS: Jurisdiction[] = [
  { code: "NG", name: "Nigeria", offered: true, currency: "NGN", locale: "en-NG", timezone: "Africa/Lagos", capitalMarketsRegulator: "Securities and Exchange Commission (SEC) Nigeria", dataProtection: "Nigeria Data Protection Act 2023; Nigeria Data Protection Commission", notes: "Launch market. Feature approvals in docs/COMPLIANCE_MATRIX.md." },
  { code: "GH", name: "Ghana", offered: false, currency: "GHS", locale: "en-GH", timezone: "Africa/Accra", capitalMarketsRegulator: "Securities and Exchange Commission Ghana", dataProtection: "Data Protection Act 2012 (Act 843); Data Protection Commission", notes: "Planned. Needs local counsel review of every feature, data-protection registration and local market data sources." },
  { code: "KE", name: "Kenya", offered: false, currency: "KES", locale: "en-KE", timezone: "Africa/Nairobi", capitalMarketsRegulator: "Capital Markets Authority (CMA) Kenya", dataProtection: "Data Protection Act 2019; Office of the Data Protection Commissioner", notes: "Planned. Needs local counsel review, data-protection registration and local market data sources." },
  { code: "ZA", name: "South Africa", offered: false, currency: "ZAR", locale: "en-ZA", timezone: "Africa/Johannesburg", capitalMarketsRegulator: "Financial Sector Conduct Authority (FSCA)", dataProtection: "Protection of Personal Information Act 2013 (POPIA); Information Regulator", notes: "Planned. Needs local counsel review (including FAIS boundaries), data-protection compliance and local market data sources." },
];

export const OFFERED_JURISDICTIONS = JURISDICTIONS.filter((j) => j.offered).map((j) => j.code);

export function jurisdiction(code: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((j) => j.code === code);
}

/**
 * Currencies offered when recording accounts. Display currencies (dashboards, reports) stay the
 * ones with FX coverage in the catalogue; amounts in other currencies are converted only when a
 * dated rate exists, otherwise flagged.
 */
export const RECORD_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "XOF", "EGP"] as const;
