/**
 * Notification wording. Factual descriptions of what happened, with the data date and a link to
 * look closer. Never a call to buy, sell or switch (tested in tests/unit/alert-messages.test.ts).
 */
export const FORBIDDEN_WORDS = /\b(buy|sell|switch|invest now|should|recommend|opportunity|act now|don't miss)\b/i;

export const messages = {
  priceAbove: (name: string, price: string, date: string, level: string) => ({ title: `${name} is above ${level}`, body: `Latest price ${price} on ${date}, above the level you set (${level}).` }),
  priceBelow: (name: string, price: string, date: string, level: string) => ({ title: `${name} is below ${level}`, body: `Latest price ${price} on ${date}, below the level you set (${level}).` }),
  fxAbove: (pair: string, rate: string, date: string, level: string) => ({ title: `${pair} is above ${level}`, body: `Latest rate ${rate} on ${date}, above the level you set (${level}).` }),
  fxBelow: (pair: string, rate: string, date: string, level: string) => ({ title: `${pair} is below ${level}`, body: `Latest rate ${rate} on ${date}, below the level you set (${level}).` }),
  maturity: (name: string, date: string, days: number, account: string) => ({ title: `${name} matures ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`, body: `${name} in ${account} matures on ${date}. Record the maturity proceeds when they arrive.` }),
  dataStale: (count: number, example: string) => ({ title: `${count} figure${count === 1 ? " is" : "s are"} out of date`, body: `Some of your values rely on old or missing data (for example: ${example}). Check the data quality panel on your dashboard.` }),
  concentration: (name: string, weight: string, threshold: string) => ({ title: `${name} is ${weight} of your investments`, body: `That is above the ${threshold} concentration level you set.` }),
  goalMilestone: (goal: string, pct: string) => ({ title: `${goal}: ${pct} of the way there`, body: `Your linked value has reached ${pct} of the goal. See how the scenarios look now.` }),
} as const;
