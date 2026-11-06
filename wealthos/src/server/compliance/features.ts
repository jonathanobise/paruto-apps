import { BRAND } from "@/lib/brand";
/**
 * Regulatory feature registry — the single source of truth for what WealthOS may do.
 *
 * Every user-facing capability is listed with its regulatory classification, the permission
 * it needs, the disclosures it must show, its default approval status, audit requirements and
 * jurisdictions. A feature is available only if (a) it is not hard-disabled, (b) its latest
 * compliance decision for the jurisdiction allows it, and (c) its operational flag is on.
 * See docs/COMPLIANCE_MATRIX.md for the counsel-review version of this table.
 */
export type RegulatoryClassification =
  /** Record keeping and deterministic calculations on the user's own data. */
  | "tooling"
  /** Factual, non-personalised market and product information. */
  | "information"
  /** General education not tailored to the user. */
  | "education"
  /** User-defined hypotheticals and projections, with disclosures. */
  | "hypothetical"
  /** Would be (or may be) regulated investment advice or management. */
  | "regulated_advice"
  /** Execution, brokerage, custody or fund handling. */
  | "regulated_execution"
  /** Selling WealthOS itself (subscriptions, invoices): consumer, tax and terms-of-sale rules. */
  | "commercial";

export type ApprovalStatus = "not_required" | "pending_review" | "approved" | "rejected" | "suspended";

export type Permission = "portfolio:read" | "portfolio:write" | "research:read" | "ai:use" | "admin:catalogue" | "admin:users" | "compliance:review" | "adviser:clients";

export interface FeatureDefinition {
  key: string;
  name: string;
  module: string;
  classification: RegulatoryClassification;
  requiredPermissions: Permission[];
  disclosures: DisclosureKey[];
  /** Status assumed until a compliance reviewer records a decision. */
  defaultApproval: ApprovalStatus;
  /** Cannot be enabled by configuration in Version 1 (needs code change + authorisation). */
  hardDisabled: boolean;
  auditLogging: "none" | "writes" | "all_access";
  jurisdictions: string[];
  milestone: 1 | 2 | 3 | 4 | 5;
  counselQuestions?: string[];
}

export const DISCLOSURES = {
  not_advice: `${BRAND} provides information and tools for your own decisions. It is not investment advice and does not recommend any security for your circumstances.`,
  hypothetical: "This is a hypothetical illustration based on assumptions you control. It is not a forecast, and outcomes are not guaranteed.",
  past_performance: "Past performance is not a reliable indicator of future results. Investments can lose value.",
  data_freshness: "Prices, rates and FX can be delayed, stale or incomplete. Check the as-of date and source before relying on any figure.",
  demo_data: "DEMO: this portfolio uses synthetic SAMPLE prices and FX rates. It is not market data and not a recommendation.",
  estimates: "Manual valuations are your own estimates, not verified market prices.",
  ai_limits: `AI answers can be wrong. Figures come from ${BRAND} calculations and cited sources; the assistant does not give personal investment advice.`,
  non_custodial: `${BRAND} never holds your money or investments and cannot place trades.`,
} as const;
export type DisclosureKey = keyof typeof DISCLOSURES;

const NG = ["NG"];

export const FEATURES: FeatureDefinition[] = [
  { key: "PORTFOLIO_TRACKING", name: "Accounts, holdings and transaction records", module: "accounts/ledger", classification: "tooling", requiredPermissions: ["portfolio:read", "portfolio:write"], disclosures: ["non_custodial", "data_freshness"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "writes", jurisdictions: NG, milestone: 2 },
  { key: "PERFORMANCE_ANALYTICS", name: "Deterministic performance (TWR, XIRR, gains, income)", module: "analytics", classification: "tooling", requiredPermissions: ["portfolio:read"], disclosures: ["past_performance", "data_freshness"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 2 },
  { key: "NET_WORTH", name: "Net worth, assets and liabilities", module: "analytics", classification: "tooling", requiredPermissions: ["portfolio:read"], disclosures: ["estimates", "data_freshness"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 2 },
  { key: "MODEL_PORTFOLIO_USER_DEFINED", name: "User-defined hypothetical target mix and drift analysis", module: "analytics", classification: "hypothetical", requiredPermissions: ["portfolio:read", "portfolio:write"], disclosures: ["hypothetical", "not_advice"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "writes", jurisdictions: NG, milestone: 2, counselQuestions: ["Does displaying drift from a target the user set themselves, without trade instructions, constitute advice under ISA 2025 / SEC rules?"] },
  { key: "INSTRUMENT_EXPLORER", name: "Factual product catalogue and comparisons", module: "instruments", classification: "information", requiredPermissions: ["research:read"], disclosures: ["not_advice", "data_freshness", "past_performance"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 3, counselQuestions: ["Do factual comparisons of CIS/money-market funds require any SEC registration (e.g. as an investment adviser or research provider)?", "Are there advertising rules for presenting fund yields?"] },
  { key: "MARKET_RESEARCH", name: "Market research: macro data, Nigerian fixed income, long-run performance, a factual screener and cross-market comparisons", module: "research", classification: "information", requiredPermissions: ["research:read"], disclosures: ["not_advice", "data_freshness", "past_performance"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 5, counselQuestions: ["Does publishing historical returns of asset classes and listed securities (non-personalised, with sources) amount to investment research requiring SEC registration?", "Presentation rules for past performance and inflation-adjusted returns.", "Display licences for third-party market data (exchange and index-provider terms).", "Does letting users filter and sort securities by past returns, risk or valuation (no default ranking, no recommendation) raise any research or advertising concern?"] },
  { key: "PORTFOLIO_BACKTEST", name: "Hypothetical backtests of a user-chosen mix of real instruments", module: "research", classification: "hypothetical", requiredPermissions: ["research:read"], disclosures: ["hypothetical", "past_performance", "not_advice"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 5, counselQuestions: ["Are there rules on presenting hypothetical or back-tested performance to retail users (format, warnings, period shown)?", "Is showing the effect of rebalancing a mix the user chose (no suggested weights) free of any advice characterisation?"] },
  { key: "GOAL_PROJECTIONS", name: "Goals and scenario projections", module: "goals", classification: "hypothetical", requiredPermissions: ["portfolio:read"], disclosures: ["hypothetical", "not_advice"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 3 },
  { key: "STRESS_TESTS", name: "Documented hypothetical stress scenarios on your own holdings", module: "goals", classification: "hypothetical", requiredPermissions: ["portfolio:read"], disclosures: ["hypothetical", "not_advice"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 3, counselQuestions: ["Do stress illustrations on a user's own portfolio require any risk-warning format?"] },
  { key: "EDUCATION", name: "General financial education", module: "content", classification: "education", requiredPermissions: [], disclosures: ["not_advice"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "none", jurisdictions: NG, milestone: 3 },
  { key: "AI_RESEARCH_ASSISTANT", name: "AI research assistant (non-advisory, tool-grounded)", module: "ai-research", classification: "information", requiredPermissions: ["ai:use", "research:read"], disclosures: ["ai_limits", "not_advice"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "all_access", jurisdictions: NG, milestone: 3, counselQuestions: ["Lawful basis and cross-border transfer requirements (NDPA 2023, GAID 2025) for sending user portfolio data to an AI vendor.", "Refusal boundaries for personalised questions."] },
  { key: "ALERTS_USER_DEFINED", name: "User-defined alerts (prices, maturities, thresholds)", module: "notifications", classification: "tooling", requiredPermissions: ["portfolio:read"], disclosures: ["data_freshness"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "writes", jurisdictions: NG, milestone: 3 },
  { key: "HOUSEHOLD_PLANNING", name: "Household view: who owns what and net worth by person", module: "household", classification: "tooling", requiredPermissions: ["portfolio:read"], disclosures: ["estimates"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "writes", jurisdictions: NG, milestone: 5 },
  { key: "INSTITUTION_CONNECTIONS", name: "Read-only bank connections through an authorised data provider (user-consented, reviewed before import)", module: "connections", classification: "tooling", requiredPermissions: ["portfolio:read", "portfolio:write"], disclosures: ["data_freshness", "non_custodial"], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "all_access", jurisdictions: NG, milestone: 5, counselQuestions: [`CBN Open Banking Regulatory Framework / Operational Guidelines: does ${BRAND} need to register as a participant (e.g. as a third-party provider) to receive account data through a licensed provider?`, "Consent wording, duration and renewal requirements; NDPA lawful basis for account data.", "Provider due diligence and data-processing agreement."] },
  { key: "SHARED_SPACES", name: "Household and business spaces with invited members and roles", module: "tenancy", classification: "tooling", requiredPermissions: ["portfolio:read"], disclosures: ["non_custodial"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "writes", jurisdictions: NG, milestone: 4 },
  { key: "REPORTS", name: "Wealth statement and transaction reports (PDF/CSV)", module: "reports", classification: "tooling", requiredPermissions: ["portfolio:read"], disclosures: ["past_performance", "data_freshness", "not_advice"], defaultApproval: "not_required", hardDisabled: false, auditLogging: "all_access", jurisdictions: NG, milestone: 4 },
  { key: "SUBSCRIPTION_BILLING", name: "Paid plans, trials, invoices and receipts", module: "billing", classification: "commercial", requiredPermissions: ["portfolio:read"], disclosures: [], defaultApproval: "pending_review", hardDisabled: false, auditLogging: "writes", jurisdictions: NG, milestone: 4, counselQuestions: ["Terms of sale, refunds and cancellation rights under the FCCPA 2018.", "VAT registration and whether plan prices are quoted inclusive or exclusive of VAT; invoice requirements.", "Retention period for invoices after account erasure (tax law vs NDPA)."] },
  // ---- Prohibited in Version 1 (hard-disabled) ----
  { key: "PERSONALISED_RECOMMENDATIONS", name: "Personalised buy/sell recommendations", module: "advice", classification: "regulated_advice", requiredPermissions: ["adviser:clients"], disclosures: ["not_advice"], defaultApproval: "rejected", hardDisabled: true, auditLogging: "all_access", jurisdictions: [], milestone: 5 },
  { key: "AUTO_REBALANCING", name: "Automatic portfolio rebalancing", module: "advice", classification: "regulated_advice", requiredPermissions: ["adviser:clients"], disclosures: [], defaultApproval: "rejected", hardDisabled: true, auditLogging: "all_access", jurisdictions: [], milestone: 5 },
  { key: "DISCRETIONARY_MANAGEMENT", name: "Discretionary investment management", module: "advice", classification: "regulated_advice", requiredPermissions: ["adviser:clients"], disclosures: [], defaultApproval: "rejected", hardDisabled: true, auditLogging: "all_access", jurisdictions: [], milestone: 5 },
  { key: "ORDER_EXECUTION", name: "Order execution / brokerage", module: "execution", classification: "regulated_execution", requiredPermissions: [], disclosures: [], defaultApproval: "rejected", hardDisabled: true, auditLogging: "all_access", jurisdictions: [], milestone: 5 },
  { key: "CUSTODY_OF_FUNDS", name: "Accepting or holding customer funds or assets", module: "execution", classification: "regulated_execution", requiredPermissions: [], disclosures: [], defaultApproval: "rejected", hardDisabled: true, auditLogging: "all_access", jurisdictions: [], milestone: 5 },
  { key: "AUTOMATED_TRADING", name: "Automated trading / copy-trading", module: "execution", classification: "regulated_execution", requiredPermissions: [], disclosures: [], defaultApproval: "rejected", hardDisabled: true, auditLogging: "all_access", jurisdictions: [], milestone: 5 },
  { key: "ADVISER_WORKSPACE", name: "Licensed adviser multi-client workspace", module: "adviser", classification: "regulated_advice", requiredPermissions: ["adviser:clients"], disclosures: [], defaultApproval: "rejected", hardDisabled: true, auditLogging: "all_access", jurisdictions: [], milestone: 5 },
];

export function featureDefinition(key: string): FeatureDefinition {
  const f = FEATURES.find((x) => x.key === key);
  if (!f) throw new Error(`Unknown feature ${key}`);
  return f;
}

export interface FeatureDecision {
  available: boolean;
  status: ApprovalStatus;
  reason: string;
}

/**
 * Pure decision function (tested). `approval` is the latest recorded compliance decision for the
 * jurisdiction, if any; `flagEnabled` is the operational rollout switch (undefined = on).
 *
 * Policy while counsel review is outstanding: features classified tooling/education with
 * `not_required` are available; information/hypothetical features in `pending_review` are
 * available ONLY in non-production environments (so they can be built and reviewed) unless
 * explicitly approved; regulated features are never available in Version 1.
 */
export function decideFeature(def: FeatureDefinition, jurisdiction: string, opts: { approval?: ApprovalStatus; flagEnabled?: boolean; environment: "development" | "test" | "staging" | "production" }): FeatureDecision {
  if (def.hardDisabled || def.classification === "regulated_advice" || def.classification === "regulated_execution") {
    return { available: false, status: "rejected", reason: `Not permitted in ${BRAND} Version 1 (regulated activity).` };
  }
  if (!def.jurisdictions.includes(jurisdiction)) return { available: false, status: "rejected", reason: `Not offered in ${jurisdiction}.` };
  if (opts.flagEnabled === false) return { available: false, status: opts.approval ?? def.defaultApproval, reason: "Temporarily switched off." };
  const status = opts.approval ?? def.defaultApproval;
  switch (status) {
    case "approved":
    case "not_required":
      return { available: true, status, reason: "Available." };
    case "pending_review":
      return opts.environment === "production"
        ? { available: false, status, reason: "Awaiting compliance review." }
        : { available: true, status, reason: "Pre-release: awaiting compliance review (non-production only)." };
    case "rejected":
    case "suspended":
      return { available: false, status, reason: status === "rejected" ? "Not approved." : "Suspended by compliance." };
  }
}
