/**
 * Advice-boundary and privacy policy for the research assistant (pure, unit-tested).
 *
 * Defence in depth: (1) the system prompt sets the boundary; (2) requests that ask for a
 * personalised buy/sell/allocate decision are detected here and the model gets an operator note
 * to answer educationally; (3) the final answer is checked for prescriptive wording and replaced
 * with a safe answer if it slips through; flagged conversations go to human review.
 */

const PERSONAL_ADVICE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(should|shall|must|do) i (buy|sell|invest|purchase|put|move|switch|hold|dump|exit|cash out)\b/i, "asks whether to buy/sell"],
  [/\bwhich (stocks?|shares?|funds?|etfs?|bonds?|investments?|assets?|coins?)\b.{0,40}\b(should|must|do|to|would you)\b.{0,20}\b(buy|pick|choose|invest|get)\b/i, "asks which security to choose"],
  [/\b(what|where|how) (should|do you recommend|would you advise) (i|me to) (invest|buy|put|allocate|do with) /i, "asks where to invest"],
  [/\bbest\b.{0,25}\b(stocks?|shares?|investments?|funds?|etfs?|bonds?|t-?bills?|options?)\b.{0,30}\b(for me|for my|to buy|right now|now)\b/i, "asks for the best investment"],
  [/\b(tell|recommend|advise|suggest)\b.{0,10}\b(me|us)\b.{0,15}\b(what|which|where)\b.{0,15}\b(buy|sell|invest)\b/i, "asks for a recommendation"],
  [/\bis (it|now|this) (a )?(good|right|bad) time to (buy|sell|invest)\b/i, "asks about market timing"],
  [/\b(rebalance|allocate|split|divide)\b.{0,20}\bmy (portfolio|money|savings|salary|funds|investments)\b/i, "asks to allocate their money"],
  [/\b(with|of) my (salary|savings|money|bonus)\b.{0,40}\b(buy|invest|put)\b/i, "asks what to do with their money"],
];

export function classifyRequest(text: string): { personalAdvice: boolean; reasons: string[] } {
  const reasons = PERSONAL_ADVICE_PATTERNS.filter(([re]) => re.test(text)).map(([, why]) => why);
  return { personalAdvice: reasons.length > 0, reasons };
}

const PRESCRIPTIVE_OUTPUT: RegExp[] = [
  /\b(you should|you ought to|i(?:'d| would)? recommend(?: that you)?|i suggest(?: that you)?|my recommendation is to|i advise you to|you need to)\s+(buy|sell|invest in|purchase|switch to|move (?:your )?(?:money|savings) (?:in)?to|put (?:your )?(?:money|savings) (?:in|into))\b/i,
  /\b(buy|sell) (it|them|now|today|immediately)\b/i,
  /\b(go ahead and|definitely) (buy|sell|invest)\b/i,
  /\byou (should|must) (allocate|put) \d+\s?%/i,
];

export function checkOutput(text: string): string[] {
  return PRESCRIPTIVE_OUTPUT.filter((re) => re.test(text)).map((re) => `prescriptive:${re.source.slice(0, 40)}`);
}

export const ADVICE_BOUNDARY_NOTE =
  "The user's latest message asks for a personalised investment decision (what to buy, sell or how to allocate their own money). WealthOS is not authorised to give personalised investment advice. Do not name a security, fund or allocation for them to choose, and do not say what they should do. Instead: briefly say you can't make that choice for them, explain the factors a person would weigh for this decision, offer objective facts from the tools (with sources and dates) if relevant, and suggest speaking to an SEC-registered adviser for a personal recommendation.";

export const SAFE_ANSWER =
  "I can't tell you what to buy, sell or how to allocate your money — that would be personal investment advice, which WealthOS doesn't provide. I can explain how to compare options (risk, liquidity, fees, currency, time horizon), show factual data on specific products with sources, or run hypothetical scenarios with assumptions you choose. For a personal recommendation, please speak to an SEC-registered investment adviser.";

/** Mask personal identifiers before text is stored in logs. */
export function redact(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    // Phone numbers before card numbers: +234… numbers are 13 digits long.
    .replace(/(?:\+?234|\b0)[789][01]\d{8}\b/g, "[phone]")
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[card]")
    .replace(/\b\d{11}\b/g, "[id-number]")
    .replace(/\b\d{10}\b/g, "[account-number]");
}
