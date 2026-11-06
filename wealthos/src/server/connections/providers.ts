import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/server/platform/env";

/**
 * Data-provider boundary for institution connections (open-banking style, read-only).
 *
 * NO AUTHORISED PROVIDER IS CONNECTED. The directive requires authorised providers and secure
 * consent; choosing one (and its contract, CBN open-banking status and data-protection terms) is
 * an owner decision. A real adapter implements this interface; the only one here is "sandbox",
 * a test double that produces clearly labelled synthetic data, available only outside production
 * when CONNECTIONS_SANDBOX=1.
 */
export interface ProviderAccount {
  ref: string;
  name: string;
  currency: string;
  maskedNumber: string | null;
}

export interface ProviderTransaction {
  /** Provider's stable id: becomes the import reference, so re-syncs never duplicate. */
  id: string;
  date: string;
  /** Signed decimal string: positive = money in. */
  amount: string;
  currency: string;
  description: string;
}

export interface ConnectionProvider {
  key: string;
  name: string;
  /** Test double: data is synthetic and labelled. */
  sandbox: boolean;
  /** Exchange the result of the provider's consent/link flow for credentials and accounts. */
  completeLink(linkCode: string): Promise<{ credentials: string; institutionName: string; accounts: ProviderAccount[] }>;
  fetchTransactions(credentials: string, accountRef: string, since: string, until: string): Promise<ProviderTransaction[]>;
  revoke(credentials: string): Promise<void>;
}

const pseudo = (seed: string) => createHash("sha256").update(seed).digest().readUInt32BE(0) / 2 ** 32;

/** Deterministic synthetic bank feed: monthly salary, rent, weekly spending. Every row says SANDBOX. */
const sandbox: ConnectionProvider = {
  key: "sandbox",
  name: "Sandbox Bank (TEST DATA)",
  sandbox: true,
  async completeLink(linkCode) {
    if (!/^[a-z0-9-]{4,40}$/.test(linkCode)) throw new Error("invalid sandbox link code");
    return { credentials: `sandbox-token:${linkCode}`, institutionName: "Sandbox Bank (TEST DATA)", accounts: [{ ref: `sbx-${linkCode}`, name: "Sandbox current account", currency: "NGN", maskedNumber: "0000" }] };
  },
  async fetchTransactions(credentials, accountRef, since, until) {
    if (!credentials.startsWith("sandbox-token:")) throw new Error("invalid sandbox credentials");
    const out: ProviderTransaction[] = [];
    for (let t = Date.parse(`${since}T00:00:00Z`); t <= Date.parse(`${until}T00:00:00Z`); t += 86_400_000) {
      const date = new Date(t).toISOString().slice(0, 10);
      const day = new Date(t).getUTCDate();
      const dow = new Date(t).getUTCDay();
      if (day === 25) out.push({ id: `${accountRef}-${date}-sal`, date, amount: "450000.00", currency: "NGN", description: "SANDBOX TEST DATA: salary" });
      if (day === 1) out.push({ id: `${accountRef}-${date}-rent`, date, amount: "-150000.00", currency: "NGN", description: "SANDBOX TEST DATA: rent" });
      if (dow === 6) out.push({ id: `${accountRef}-${date}-shop`, date, amount: `-${(15000 + Math.round(pseudo(`${accountRef}${date}`) * 20000)).toFixed(2)}`, currency: "NGN", description: "SANDBOX TEST DATA: groceries" });
    }
    return out;
  },
  async revoke() {},
};

export function availableProviders(): ConnectionProvider[] {
  const list: ConnectionProvider[] = [];
  if (process.env.CONNECTIONS_SANDBOX === "1" && env().APP_ENV !== "production") list.push(sandbox);
  return list;
}

export function getConnectionProvider(key: string): ConnectionProvider | null {
  return availableProviders().find((p) => p.key === key) ?? null;
}
