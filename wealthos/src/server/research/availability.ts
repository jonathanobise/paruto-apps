import "server-only";
import { featureDecision } from "@/server/compliance/gate";

/**
 * Which research areas this deployment may show (each is its own compliance-gated feature).
 * Links to an unavailable area are hidden rather than leading to a "not available" page; they
 * reappear by themselves once a compliance decision makes the feature available.
 */
export async function researchAvailability(jurisdiction: string): Promise<{ research: boolean; backtest: boolean; href: string | null }> {
  const [research, backtest] = await Promise.all([featureDecision("MARKET_RESEARCH", jurisdiction), featureDecision("PORTFOLIO_BACKTEST", jurisdiction)]);
  return {
    research: research.available,
    backtest: backtest.available,
    href: research.available ? "/research" : backtest.available ? "/research/backtest" : null,
  };
}
