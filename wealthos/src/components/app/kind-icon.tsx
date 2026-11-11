import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, Briefcase, Building2, CalendarCheck, Coins, CreditCard, HandCoins, Landmark, LineChart, PiggyBank, Receipt, Repeat, ShoppingBag, Tag, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small tinted tile with an icon for what a row is (an account type or a transaction type), so
 * long lists scan by shape. The tile's tint is decorative; the row's text always names the kind.
 */
type Tone = "violet" | "teal" | "amber" | "neutral" | "rose";
const TONES: Record<Tone, string> = {
  violet: "bg-[color-mix(in_srgb,var(--series-1)_16%,transparent)] text-accent",
  teal: "bg-[color-mix(in_srgb,var(--series-2)_16%,transparent)] text-[color-mix(in_srgb,var(--series-2)_70%,var(--text))]",
  amber: "bg-[color-mix(in_srgb,var(--series-3)_16%,transparent)] text-[color-mix(in_srgb,var(--series-3)_70%,var(--text))]",
  rose: "bg-danger-soft text-negative",
  neutral: "bg-text/[0.06] text-text-2",
};

const ACCOUNT: Record<string, [LucideIcon, Tone]> = {
  bank: [Landmark, "neutral"],
  brokerage: [LineChart, "violet"],
  mutual_fund: [PiggyBank, "violet"],
  treasury_bills: [Receipt, "teal"],
  bonds: [Receipt, "teal"],
  cash_wallet: [Wallet, "neutral"],
  pension: [PiggyBank, "teal"],
  real_estate: [Building2, "amber"],
  business: [Briefcase, "amber"],
  other_asset: [Coins, "amber"],
  loan: [HandCoins, "rose"],
  credit_card: [CreditCard, "rose"],
  other_liability: [HandCoins, "rose"],
};

const EVENT: Array<[RegExp, LucideIcon, Tone]> = [
  [/dividend|interest|coupon|income/i, Coins, "teal"],
  [/buy|purchase|reinvest|opening/i, ShoppingBag, "violet"],
  [/sell|sale|redemption/i, Tag, "violet"],
  [/matur/i, CalendarCheck, "teal"],
  [/fx|conversion|exchange/i, Repeat, "amber"],
  [/transfer/i, ArrowLeftRight, "neutral"],
  [/deposit|contribution/i, ArrowDownLeft, "neutral"],
  [/withdraw/i, ArrowUpRight, "neutral"],
  [/fee|tax/i, Receipt, "rose"],
];

export function KindIcon({ account, event, className }: { account?: string; event?: string; className?: string }) {
  const [Icon, tone] = account ? (ACCOUNT[account] ?? [Banknote, "neutral" as Tone]) : (EVENT.find(([re]) => re.test(event ?? ""))?.slice(1) as [LucideIcon, Tone] | undefined) ?? [Banknote, "neutral" as Tone];
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-[11px] shadow-[inset_0_1px_0_var(--hi)]", TONES[tone], className)}>
      <Icon className="size-[17px]" strokeWidth={1.9} />
    </span>
  );
}

/** An instrument's monogram (its ticker's first letters) on a tile tinted by asset class. */
export function Monogram({ text, assetClass, className }: { text: string; assetClass?: string | null; className?: string }) {
  const tone: Tone = /bill|bond|fixed|money/i.test(assetClass ?? "") ? "teal" : /real|commod|gold|alt/i.test(assetClass ?? "") ? "amber" : /cash/i.test(assetClass ?? "") ? "neutral" : "violet";
  const letters = text.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "·";
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-[11px] text-[12px] font-bold tracking-[0.02em] shadow-[inset_0_1px_0_var(--hi)]", TONES[tone], className)}>
      {letters}
    </span>
  );
}
