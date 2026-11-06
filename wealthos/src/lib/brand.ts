/**
 * The product's public name, in one place. "Paruto Wealth" is the working name until the
 * permanent one is secured (ADR-028); "WealthOS" stays as the internal codename (folder,
 * package, database, cookies). To rename: change BRAND here, then `grep -rn "Paruto Wealth"`
 * for the prose that spells it out (legal drafts, help text, offline page).
 */
export const BRAND = "Paruto Wealth";

/** The brand split for the wordmark: the last word is set in Instrument Serif italic. */
export const BRAND_LEAD = BRAND.split(" ").slice(0, -1).join(" ");
export const BRAND_LAST = BRAND.split(" ").at(-1)!;
