/**
 * General financial education (feature EDUCATION). Rules for this content:
 * - General explanations only: no recommendation of any product, allocation or timing.
 * - No current market rates. Worked examples use round, clearly illustrative numbers, and every
 *   figure in an example is recomputed by the engine in tests/unit/learn.test.ts.
 * - British English; naira as ₦.
 */
export type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "formula"; text: string; caption?: string }
  | { kind: "example"; id: string; title: string; rows: Array<[string, string]>; note?: string };

export interface Article {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  reviewedOn: string;
  topics: string[];
  body: Block[];
  related: string[];
}

const ILLUSTRATIVE = "Illustrative numbers, not current market rates.";

export const ARTICLES: Article[] = [
  {
    slug: "treasury-bill-yields",
    title: "Treasury bill yields: discount rate, true yield and effective yield",
    summary: "Why the rate announced for a T-bill is not the return you earn, and how to put bills of different tenors on the same footing.",
    minutes: 5,
    reviewedOn: "2026-11-02",
    topics: ["Fixed income", "Yields"],
    body: [
      { kind: "p", text: "Nigerian treasury bills are short-term government securities issued at a discount: you pay less than the face value today and receive the full face value at maturity. They are commonly issued for about 91, 182 or 364 days. Auction results are usually announced as a discount rate (the \"stop rate\"), but that number is not the return on the money you actually pay." },
      { kind: "h", text: "Three different numbers" },
      { kind: "list", items: [
        "Discount rate: the discount expressed as a share of the face value, annualised. It sets the price you pay.",
        "True yield (simple yield): your gain as a share of the price you paid, annualised without compounding. It is always higher than the discount rate.",
        "Effective annual yield: the true yield restated as if you could reinvest at the same rate for a full year. It lets you compare bills of different tenors with each other and with products that quote compounded rates.",
      ] },
      { kind: "formula", text: "Price = Face × (1 − d × t / 365)", caption: "d = discount rate, t = days to maturity (actual/365)" },
      { kind: "formula", text: "True yield = d ÷ (1 − d × t / 365)" },
      { kind: "formula", text: "Effective annual yield = (1 + true yield × t / 365)^(365 / t) − 1" },
      { kind: "example", id: "tbill-364", title: "A 364-day bill at an 18% discount rate, ₦1,000,000 face value", rows: [["Price paid", "₦820,493.15"], ["Received at maturity", "₦1,000,000.00"], ["True yield", "21.94%"], ["Effective annual yield", "21.94%"]], note: `${ILLUSTRATIVE} At almost a full year there is nothing to reinvest, so the true and effective yields are nearly equal; both are well above the 18% discount rate.` },
      { kind: "example", id: "tbill-91", title: "A 91-day bill at the same 18% discount rate", rows: [["Price paid", "₦955,123.29"], ["True yield", "18.85%"], ["Effective annual yield", "20.22%"]], note: `${ILLUSTRATIVE} The same discount rate means very different yields at different tenors.` },
      { kind: "h", text: "What this means when comparing" },
      { kind: "p", text: "A discount rate, a true yield, a money market fund's quoted yield and a fixed deposit rate are different measures. Comparing them directly can mislead by several percentage points. WealthOS labels every published rate with its methodology and only places rates side by side after converting them to the same basis, showing the conversion." },
      { kind: "p", text: "Short bills also carry reinvestment risk: the effective yield assumes you can roll over at the same rate, which may not be possible. Tax treatment and fees (for example, when buying through a bank or broker) can change the return you keep; check the current rules and charges for your route." },
    ],
    related: ["money-market-fund-yields", "inflation-and-real-returns"],
  },
  {
    slug: "money-market-fund-yields",
    title: "How money market fund yields are quoted",
    summary: "What a fund's headline yield measures, why it moves, and how to compare it with treasury bills or deposits.",
    minutes: 4,
    reviewedOn: "2026-11-02",
    topics: ["Funds", "Yields"],
    body: [
      { kind: "p", text: "A money market fund pools investors' money into short-term instruments such as treasury bills, commercial paper and bank placements. In Nigeria these are collective investment schemes regulated by the SEC. Your return comes from the income those instruments earn, after the fund's fees and expenses." },
      { kind: "h", text: "Reading the headline yield" },
      { kind: "list", items: [
        "Most funds publish an annualised yield, usually net of fees. It is a recent rate restated per year, not a promise: it changes as the fund's holdings mature and are replaced.",
        "Some funds keep a fixed unit price and pay or reinvest income as distributions; others let the unit price (NAV) rise. The same economics can look different on a statement.",
        "Funds differ in how they annualise (simple or compounded) and over what window (daily, 7-day, 30-day). The factsheet should say which; WealthOS records the methodology with every published rate.",
      ] },
      { kind: "h", text: "Working out your own return from prices" },
      { kind: "p", text: "For an accumulating fund you can measure the return yourself from two unit prices, then annualise it to compare with other products." },
      { kind: "example", id: "mmf-nav", title: "Unit price rises from ₦100.00 to ₦104.50 over 92 days", rows: [["Return over the period", "4.50%"], ["Annualised, simple", "17.85%"], ["Annualised, compounded", "19.08%"]], note: `${ILLUSTRATIVE} Annualising a short period assumes the same pace continues, which is not guaranteed.` },
      { kind: "h", text: "Comparing with other products" },
      { kind: "p", text: "Before comparing a fund's yield with a treasury bill or a deposit, put both on the same basis (for example effective annual yield) and note what each excludes: fund yields are typically after fees, while a T-bill discount rate is before any bank or broker charges. Liquidity, the issuer and the fund's holdings matter as much as the headline number." },
    ],
    related: ["treasury-bill-yields", "fees-and-compounding"],
  },
  {
    slug: "twr-vs-xirr",
    title: "Time-weighted vs money-weighted returns",
    summary: "Two honest ways to measure performance that can disagree, and why WealthOS shows both.",
    minutes: 5,
    reviewedOn: "2026-11-02",
    topics: ["Performance"],
    body: [
      { kind: "p", text: "When you add or withdraw money, \"how much did my portfolio grow?\" stops having one answer. Deposits are not profit, so WealthOS always separates contributions from investment gain, and reports two kinds of return." },
      { kind: "list", items: [
        "Time-weighted return (TWR) measures how the investments themselves performed, removing the effect of when you added or took out money. It is the right measure for judging a fund or a strategy.",
        "Money-weighted return (XIRR, the internal rate of return of your cash flows) measures what your money actually earned, so the timing of your deposits counts. It is the right measure for \"how did I do?\"",
      ] },
      { kind: "example", id: "twr-xirr", title: "₦1,000,000 invested on 1 January; it rises 10% by 1 July, when you add another ₦1,000,000; the whole portfolio then falls 5% by 31 December", rows: [["Value on 1 July after the deposit", "₦2,100,000.00"], ["Value on 31 December", "₦1,995,000.00"], ["Time-weighted return", "4.50%"], ["Money-weighted return (XIRR, annual)", "−0.33%"]], note: `${ILLUSTRATIVE} The investments gained over the year, but more money was exposed to the fall than to the rise, so the investor lost slightly.` },
      { kind: "h", text: "Conventions WealthOS uses" },
      { kind: "list", items: [
        "Cash flows are treated as happening at the end of their day.",
        "Returns for periods shorter than a year are not annualised, because doing so extrapolates short-term results.",
        "If any value in the period cannot be priced or converted, the return is shown as unavailable rather than estimated.",
      ] },
    ],
    related: ["currency-risk", "fees-and-compounding"],
  },
  {
    slug: "currency-risk",
    title: "Currency risk when you measure in naira",
    summary: "How exchange-rate moves add to, or wipe out, the return on a foreign-currency investment.",
    minutes: 4,
    reviewedOn: "2026-11-02",
    topics: ["FX", "Risk"],
    body: [
      { kind: "p", text: "If you hold an asset priced in dollars, pounds or euros and measure your wealth in naira, your return has two parts: what the asset did in its own currency, and what the exchange rate did. They multiply rather than add." },
      { kind: "formula", text: "Naira return = (1 + return in USD) × (1 + change in the ₦ per $ rate) − 1" },
      { kind: "example", id: "fx-up", title: "$1,000 bought at ₦1,500/$; a year later the asset is worth $1,050 and the rate is ₦1,650/$", rows: [["Cost in naira", "₦1,500,000.00"], ["Value in naira", "₦1,732,500.00"], ["Return in dollars", "5.00%"], ["Return in naira", "15.50%"]], note: ILLUSTRATIVE },
      { kind: "example", id: "fx-down", title: "Same asset, but the rate moves to ₦1,350/$", rows: [["Value in naira", "₦1,417,500.00"], ["Return in naira", "−5.50%"]], note: `${ILLUSTRATIVE} The asset still gained 5% in dollars.` },
      { kind: "h", text: "How WealthOS handles currencies" },
      { kind: "list", items: [
        "Every conversion uses a dated rate from a named source, never a rate from a different day. If no recent rate exists, the value is flagged as unavailable instead of guessed.",
        "Performance shows how much of your gain came from currency moves, by comparing with a constant-rate calculation.",
        "Holdings show returns in their own currency and in your display currency side by side.",
        "Stress tests include currency scenarios so you can see how sensitive your net worth is to the exchange rate.",
      ] },
    ],
    related: ["twr-vs-xirr", "diversification-and-concentration"],
  },
  {
    slug: "inflation-and-real-returns",
    title: "Inflation and real returns",
    summary: "Why a high interest rate can still lose purchasing power, and how to read figures \"in today's money\".",
    minutes: 3,
    reviewedOn: "2026-11-02",
    topics: ["Inflation", "Planning"],
    body: [
      { kind: "p", text: "A nominal return is the percentage change in naira. A real return is the change in what that money can buy. When inflation is high, the gap between them is large." },
      { kind: "formula", text: "Real return = (1 + nominal return) ÷ (1 + inflation) − 1" },
      { kind: "example", id: "real-return", title: "A 20% nominal return in a year with 25% inflation", rows: [["Real return", "−4.00%"]], note: ILLUSTRATIVE },
      { kind: "example", id: "purchasing-power", title: "What ₦1,000,000 buys after five years of 20% annual inflation, in today's money", rows: [["Purchasing power", "₦401,877.57"]], note: ILLUSTRATIVE },
      { kind: "p", text: "Goals and projections in WealthOS can show targets and results in today's money, using an inflation assumption you set. These are hypothetical illustrations, not forecasts." },
    ],
    related: ["fees-and-compounding", "treasury-bill-yields"],
  },
  {
    slug: "fees-and-compounding",
    title: "How fees compound",
    summary: "A fee that looks small each year takes a growing share of the final amount.",
    minutes: 3,
    reviewedOn: "2026-11-02",
    topics: ["Fees", "Planning"],
    body: [
      { kind: "p", text: "Annual management fees are charged on the whole balance, every year, including on growth that earlier fees would otherwise have left invested. Over long periods the effect is much larger than the headline percentage suggests." },
      { kind: "example", id: "fee-drag", title: "₦1,000,000 growing at 12% a year for 20 years, no further contributions", rows: [["With no fee", "₦9,646,293.09"], ["With a 1% annual fee", "₦7,904,260.65"], ["Cost of the 1% fee", "₦1,742,032.44"], ["Share of the no-fee result", "18.06%"]], note: `${ILLUSTRATIVE} Monthly compounding, fee deducted monthly, taxes not modelled.` },
      { kind: "p", text: "When comparing products, look for the total ongoing cost (management fee plus other expenses), entry or exit charges, and whether a quoted yield is before or after fees. The simulator lets you see fee drag under your own assumptions." },
    ],
    related: ["money-market-fund-yields", "inflation-and-real-returns"],
  },
  {
    slug: "diversification-and-concentration",
    title: "Diversification and concentration",
    summary: "How the size of a single holding sets how much one bad outcome can hurt.",
    minutes: 3,
    reviewedOn: "2026-11-02",
    topics: ["Risk"],
    body: [
      { kind: "p", text: "Diversification means not depending on one issuer, sector, currency or country. It does not remove risk, and assets that usually move differently can fall together in a crisis, but it limits how much any single outcome can cost you." },
      { kind: "example", id: "concentration", title: "One holding falls by half", rows: [["If it was 40% of the portfolio", "−20.00%"], ["If it was 10% of the portfolio", "−5.00%"]], note: "Illustrative arithmetic." },
      { kind: "list", items: [
        "The dashboard shows your largest holding and its share of your investments.",
        "Allocation by asset class, currency and geography shows exposures that a list of holdings can hide (for example, several funds that all hold Nigerian bank shares).",
        "You can set a concentration alert at a level you choose. What level suits you depends on your circumstances; WealthOS does not set one for you.",
      ] },
    ],
    related: ["currency-risk", "twr-vs-xirr"],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
