/**
 * The product's public name, in one place: **VioWealth** (ADR-030). "WealthOS" stays the internal
 * codename (folder, package, database, cookies). To rename: change the two parts here, then
 * `grep -rn "VioWealth" src public tests` for the prose that spells it out (offline page, tests,
 * AI eval set).
 */
/** The wordmark is one word set in two parts: the second in Instrument Serif italic. */
export const BRAND_LEAD = "Vio";
export const BRAND_LAST = "Wealth";
export const BRAND = `${BRAND_LEAD}${BRAND_LAST}`;
/** Where the product lives for now (the public demo); viowealth.com once it's secured for production. */
export const BRAND_DOMAIN = "vio.paruto.com";
