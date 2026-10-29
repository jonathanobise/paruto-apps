import type { StrategyConfig } from '@alpha-desk/config';
import { USDC_MINT, WSOL_MINT } from '@alpha-desk/config';
import {
  EvidenceCollector,
  isNoRouteError,
  quotePriceUsd,
  sellQuote,
  type DexScreener,
  type Helius,
  type ParsedTx,
  type QuoteProvider,
  type RugCheck,
  type SolanaRpc,
  type SolPrice,
} from '@alpha-desk/providers';
import { Decimal, fromBaseUnits, toBaseUnits, type Clock } from '@alpha-desk/shared';
import { analyseBundle, launchBuysFrom } from './bundle.ts';
import { analyseDeveloper } from './developer.ts';
import { analyseHolders, type OwnerInfo } from './holders.ts';
import { assessLpSafety, decodePool, onChainLiquidityUsd, orientPool, type LpHolder } from './pools.ts';
import { evaluateRules } from './rules.ts';
import type { Fact, MarketFacts, MintFacts, PoolFacts, RouteFacts, SecurityEvidence } from './rules.ts';

export interface GatherDeps {
  rpc: SolanaRpc;
  dex: DexScreener;
  jupiter: QuoteProvider;
  rugcheck: RugCheck | null;
  helius: Helius | null;
  solPrice: SolPrice;
  clock: Clock;
}

export interface GatherInput {
  mint: string;
  pairAddress: string;
  pairCreatedAt: number | null;
  otherPoolAddresses: string[];
  /** Notional (USD) of the largest position Risk could allow; the sell route is tested at this size. */
  maxPositionUsd: Decimal;
  cfg: StrategyConfig;
}

const ok = <T>(value: T, evidenceIds: string[], observedAt: number): Fact<T> => ({
  status: 'OK',
  value,
  evidenceIds,
  observedAt,
});
const missing = <T>(
  error: string,
  evidenceIds: string[] = [],
  status: 'UNAVAILABLE' | 'ERROR' = 'UNAVAILABLE',
): Fact<T> => ({
  status,
  value: null,
  evidenceIds,
  observedAt: null,
  error,
});

/**
 * Collects every fact the Filter rules need, citing an evidence record for each. Failures are recorded
 * as UNAVAILABLE / ERROR facts — never replaced with defaults.
 */
export async function gatherSecurityEvidence(
  deps: GatherDeps,
  input: GatherInput,
): Promise<{ evidence: SecurityEvidence; records: EvidenceCollector['records'] }> {
  const ev = new EvidenceCollector();
  const { rpc, cfg } = { rpc: deps.rpc, cfg: input.cfg };
  const mint = input.mint;

  // ── mint account (on-chain)
  let mintFacts: Fact<MintFacts>;
  try {
    const acct = await rpc.getAccount(mint, 'jsonParsed');
    const id = ev.add(acct, 'RPC_MINT_ACCOUNT', 'ON_CHAIN');
    const info = acct.data?.parsed?.type === 'mint' ? acct.data.parsed.info : null;
    if (!acct.data || !info) mintFacts = missing('mint account not found or not a mint', [id]);
    else {
      const exts =
        (info.extensions as Array<{ extension: string; state?: Record<string, unknown> }> | undefined) ?? [];
      mintFacts = ok(
        {
          tokenProgram: acct.data.owner,
          mintAuthority: (info.mintAuthority as string | null) ?? null,
          freezeAuthority: (info.freezeAuthority as string | null) ?? null,
          supply: BigInt(info.supply as string),
          decimals: info.decimals as number,
          extensions: exts.map((x) => ({ name: x.extension, state: x.state ?? {} })),
        },
        [id],
        acct.provenance.observedAt,
      );
    }
  } catch (e) {
    mintFacts = missing((e as Error).message, [], 'ERROR');
  }

  // ── pool state, LP safety, on-chain liquidity
  let pool: Fact<PoolFacts>;
  let tokenVault: string | null = null;
  let coinCreator: string | null = null;
  try {
    const acct = await rpc.getAccount(input.pairAddress, 'base64');
    const ids = [ev.add(acct, 'RPC_POOL_ACCOUNT', 'ON_CHAIN')];
    if (!acct.data?.data) pool = missing('pool account not found', ids);
    else {
      let decoded = decodePool(acct.data.owner, acct.data.data);
      const oriented = decoded ? orientPool(decoded, mint) : null;
      if (decoded && !oriented) decoded = null; // pool does not contain this mint
      let lp: PoolFacts['lp'] = null;
      let liq: string | null = null;
      let quotePrice: string | null = null;
      if (decoded && oriented) {
        tokenVault = oriented.tokenVault;
        coinCreator = decoded.coinCreator;
        const supply = await rpc.getTokenSupply(decoded.lpMint);
        ids.push(ev.add(supply, 'RPC_LP_SUPPLY', 'ON_CHAIN'));
        let holders: LpHolder[] = [];
        if (supply.data.amount > 0n) {
          const largest = await rpc.getTokenLargestAccounts(decoded.lpMint);
          ids.push(ev.add(largest, 'RPC_LP_HOLDERS', 'ON_CHAIN'));
          const accts = await rpc.getAccounts(
            largest.data.map((a) => a.address),
            'jsonParsed',
          );
          ids.push(ev.add(accts, 'RPC_LP_HOLDER_ACCOUNTS', 'ON_CHAIN'));
          holders = largest.data.map((a, i) => ({
            tokenAccount: a.address,
            amount: a.amount,
            owner: (accts.data[i]?.parsed?.info?.owner as string | undefined) ?? null,
          }));
        }
        lp = assessLpSafety(decoded, supply.data.amount, holders, cfg.filter.minLpNonWithdrawablePct);

        const vaults = await rpc.getAccounts([oriented.quoteVault], 'jsonParsed');
        ids.push(ev.add(vaults, 'RPC_POOL_VAULTS', 'ON_CHAIN'));
        const qa = vaults.data[0]?.parsed?.info?.tokenAmount as
          { amount: string; decimals: number } | undefined;
        if (qa) {
          let price: Decimal | null = null;
          if (oriented.quoteMint === USDC_MINT) price = new Decimal(1);
          else if (oriented.quoteMint === WSOL_MINT) {
            const sp = await deps.solPrice.get(deps.clock.now());
            ids.push(ev.add(sp.obs, 'JUP_SOL_PRICE', 'DERIVED'));
            price = sp.price;
          }
          if (price) {
            quotePrice = price.toString();
            liq = onChainLiquidityUsd(fromBaseUnits(BigInt(qa.amount), qa.decimals), price).toFixed(2);
          }
        }
      }
      pool = ok(
        {
          pairAddress: input.pairAddress,
          programOwner: acct.data.owner,
          decoded,
          lp,
          onChainLiquidityUsd: liq,
          quotePriceUsd: quotePrice,
        },
        ids,
        acct.provenance.observedAt,
      );
    }
  } catch (e) {
    pool = missing((e as Error).message, [], 'ERROR');
  }

  // ── fresh market data (provider claim)
  let market: Fact<MarketFacts>;
  try {
    const pair = await deps.dex.pair(input.pairAddress);
    const id = ev.add(pair, 'DEX_PAIR', 'PROVIDER_CLAIM');
    const p = pair.data;
    market = p
      ? ok(
          {
            liquidityUsd: p.liquidity?.usd ?? null,
            volume1hUsd: p.volume?.h1 ?? null,
            priceChange1hPct: p.priceChange?.h1 ?? null,
            marketCapUsd: p.marketCap ?? null,
            fdvUsd: p.fdv ?? null,
            priceUsd: p.priceUsd ?? null,
          },
          [id],
          pair.provenance.observedAt,
        )
      : missing('pair not found on DexScreener', [id]);
  } catch (e) {
    market = missing((e as Error).message, [], 'ERROR');
  }

  // ── sell route at full position size, impact measured against a small reference sell
  let route: Fact<RouteFacts>;
  if (mintFacts.value && market.value?.priceUsd && Number(market.value.priceUsd) > 0) {
    const decimals = mintFacts.value.decimals;
    const px = new Decimal(market.value.priceUsd);
    const sizedTokens = toBaseUnits(input.maxPositionUsd.div(px), decimals);
    const smallTokens = toBaseUnits(new Decimal(20).div(px), decimals);
    const ids: string[] = [];
    try {
      const small = await sellQuote(
        deps.jupiter,
        mint,
        smallTokens > 0n ? smallTokens : 1n,
        cfg.execution.slippageBps,
      );
      ids.push(ev.add(small, 'JUP_SELL_QUOTE_REFERENCE', 'DERIVED'));
      const sized = await sellQuote(
        deps.jupiter,
        mint,
        sizedTokens > 0n ? sizedTokens : 1n,
        cfg.execution.slippageBps,
      );
      ids.push(ev.add(sized, 'JUP_SELL_QUOTE_SIZED', 'DERIVED'));
      const smallPx = quotePriceUsd(small.data, decimals, 'SELL');
      const sizedPx = quotePriceUsd(sized.data, decimals, 'SELL');
      const impact = smallPx.gt(0) ? Decimal.max(0, new Decimal(1).sub(sizedPx.div(smallPx)).mul(100)) : null;
      route = ok(
        {
          ok: sized.data.outAmount > 0n,
          noRouteReason: sized.data.outAmount > 0n ? null : 'zero output',
          sellAmountTokens: sizedTokens.toString(),
          outUsd: fromBaseUnits(sized.data.outAmount, 6).toFixed(6),
          smallPriceUsd: smallPx.toString(),
          sizedPriceUsd: sizedPx.toString(),
          priceImpactPct: impact?.toFixed(4) ?? null,
          routeLabels: sized.data.routeLabels,
        },
        ids,
        sized.provenance.observedAt,
      );
    } catch (e) {
      route = isNoRouteError(e)
        ? ok(
            {
              ok: false,
              noRouteReason: (e as Error).message.slice(0, 200),
              sellAmountTokens: sizedTokens.toString(),
              outUsd: null,
              smallPriceUsd: null,
              sizedPriceUsd: null,
              priceImpactPct: null,
              routeLabels: [],
            },
            ids,
            deps.clock.now(),
          )
        : missing((e as Error).message, ids, 'ERROR');
    }
  } else route = missing('price or mint facts unavailable; cannot size the sell test');

  // ── holders (RPC; beneficial-owner clustering is added after the cheap checks below)
  let holders: Fact<ReturnType<typeof analyseHolders>>;
  let holderBasis:
    (Omit<Parameters<typeof analyseHolders>[0], 'clusters'> & { ids: string[]; at: number }) | null = null;
  let circulating: bigint | null = null;
  let deployerHoldings: bigint | null = null;
  const developerWallets = new Set<string>(coinCreator ? [coinCreator] : []);
  try {
    if (!mintFacts.value) throw new Error('mint facts unavailable');
    const largest = await rpc.getTokenLargestAccounts(mint);
    const ids = [ev.add(largest, 'RPC_LARGEST_HOLDERS', 'ON_CHAIN')];
    const tokenAccts = await rpc.getAccounts(
      largest.data.map((a) => a.address),
      'jsonParsed',
    );
    ids.push(ev.add(tokenAccts, 'RPC_HOLDER_TOKEN_ACCOUNTS', 'ON_CHAIN'));
    const holdings = largest.data.map((a, i) => ({
      tokenAccount: a.address,
      amount: a.amount,
      owner: (tokenAccts.data[i]?.parsed?.info?.owner as string | undefined) ?? null,
    }));
    const ownerAddrs = [...new Set(holdings.map((h) => h.owner).filter((o): o is string => !!o))];
    const owners = new Map<string, OwnerInfo>();
    if (ownerAddrs.length) {
      const infos = await rpc.getAccounts(ownerAddrs, 'base64', true);
      ids.push(ev.add(infos, 'RPC_HOLDER_OWNERS', 'ON_CHAIN'));
      ownerAddrs.forEach((a, i) => {
        const inf = infos.data[i];
        owners.set(a, {
          address: a,
          exists: !!inf,
          programOwner: inf?.owner ?? null,
          executable: inf?.executable ?? false,
        });
      });
    }
    holderBasis = {
      totalSupply: mintFacts.value.supply,
      holdings,
      owners,
      poolVaults: new Set(tokenVault ? [tokenVault] : []),
      poolAddresses: new Set([input.pairAddress, ...input.otherPoolAddresses]),
      developerWallets,
      maxTop10Pct: cfg.filter.maxTop10HolderPct,
      requireClustering: cfg.filter.requireHolderClustering,
      ids,
      at: largest.provenance.observedAt,
    };
    const analysis = analyseHolders({ ...holderBasis, clusters: null });
    circulating = BigInt(analysis.circulatingSupply);
    holders = ok(analysis, ids, holderBasis.at);
  } catch (e) {
    holders = missing((e as Error).message, [], 'ERROR');
  }

  // ── deployer holdings (RPC)
  const deployer = coinCreator;
  const devIds: string[] = [];
  let devError: string | null = null;
  try {
    if (deployer) {
      const h = await rpc.getTokenAccountsByOwner(deployer, mint);
      devIds.push(ev.add(h, 'RPC_DEPLOYER_HOLDINGS', 'ON_CHAIN'));
      deployerHoldings = h.data.reduce((s, a) => s + a.amount, 0n);
    }
  } catch (e) {
    devError = (e as Error).message;
  }
  const developerFrom = (
    history: { txs: ParsedTx[]; complete: boolean } | null,
    linkedHoldings: Map<string, bigint> | null,
  ) =>
    analyseDeveloper({
      mint,
      deployer,
      deployerSource: deployer ? 'PumpSwap pool coin_creator (on-chain)' : null,
      circulatingSupply: circulating,
      deployerHoldings,
      linkedHoldings,
      deployerHistory: history,
      maxOwnershipPct: cfg.filter.maxDeveloperOwnershipPct,
    });

  // Cheap checks first. Indexer reads cost credits (Helius bills Enhanced Transactions at 100 credits a
  // call), so they are only spent on a candidate that no rule has already rejected on RPC and market data.
  let indexer = deps.helius?.configured ? deps.helius : null;
  let skipped: string | null = null;
  if (indexer) {
    const pending = missing<never>('pending');
    const rejectedBy = evaluateRules(
      {
        mint,
        pairAddress: input.pairAddress,
        mintFacts,
        pool,
        market,
        route,
        holders,
        developer: devError ? pending : ok(developerFrom(null, null), devIds, deps.clock.now()),
        bundle: pending,
        corroboration: pending,
      },
      cfg.filter,
      deps.clock.now(),
    )
      .filter((r) => r.outcome === 'FAIL')
      .map((r) => r.ruleId);
    if (rejectedBy.length) {
      skipped = `not checked: already rejected by ${rejectedBy.join(', ')}`;
      indexer = null;
    }
  }
  // Funding sources are traced over RPC (a few 1-credit calls) and shared between holder and buyer checks.
  const funders = new Map<string, Promise<string | null>>();
  const funderOf = (w: string) => {
    if (!funders.has(w)) funders.set(w, firstFunder(rpc, w, ev));
    return funders.get(w)!;
  };

  if (indexer && holderBasis) {
    try {
      const clusters = new Map<string, string>();
      for (const w of [...holderBasis.owners.values()]
        .filter((o) => o.programOwner === '11111111111111111111111111111111')
        .map((o) => o.address)
        .slice(0, 20)) {
        const funder = await funderOf(w);
        if (funder) clusters.set(w, `funder:${funder}`);
      }
      const analysis = analyseHolders({ ...holderBasis, clusters });
      holders = ok(
        analysis,
        [...holderBasis.ids, ...ev.records.filter((r) => r.kind.startsWith('RPC_WALLET_')).map((r) => r.id)],
        holderBasis.at,
      );
    } catch (e) {
      holders = missing((e as Error).message, holderBasis.ids, 'ERROR');
    }
  }

  // ── developer
  let developer: Fact<ReturnType<typeof analyseDeveloper>>;
  if (devError) developer = missing(devError, devIds, 'ERROR');
  else
    try {
      const ids = [...devIds];
      if (deployer && indexer) {
        const history = await pagedHistory(indexer, deployer, 10, ev, 'IDX_DEPLOYER_HISTORY');
        const analysis = developerFrom(history, null);
        const linked = new Map<string, bigint>();
        for (const l of analysis.links
          .filter((x) => x.strength !== 'WEAK' && x.relation !== 'DEPLOYER')
          .slice(0, 15)) {
          const h = await rpc.getTokenAccountsByOwner(l.wallet, mint);
          ids.push(ev.add(h, 'RPC_LINKED_HOLDINGS', 'ON_CHAIN'));
          linked.set(
            l.wallet,
            h.data.reduce((s, a) => s + a.amount, 0n),
          );
        }
        developer = ok(developerFrom(history, linked), ids, deps.clock.now());
      } else developer = ok(developerFrom(null, null), ids, deps.clock.now());
    } catch (e) {
      developer = missing((e as Error).message, devIds, 'ERROR');
    }

  // ── launch bundling (indexer required)
  let bundle: Fact<ReturnType<typeof analyseBundle>>;
  try {
    if (skipped) bundle = missing(skipped);
    else if (!indexer || !input.pairCreatedAt || !mintFacts.value) {
      bundle = ok(
        analyseBundle({
          buys: null,
          totalSupplyUi: new Decimal(0),
          funders: null,
          fundersComplete: false,
          windowSeconds: cfg.filter.launchWindowSeconds,
          maxBundledPct: cfg.filter.maxBundledLaunchPct,
        }),
        [],
        deps.clock.now(),
      );
    } else {
      // Launch window read oldest-first with a time filter, so busy pools are covered however old they are.
      const hist = await windowHistory(
        indexer,
        input.pairAddress,
        input.pairCreatedAt,
        input.pairCreatedAt + cfg.filter.launchWindowSeconds * 1000,
        10,
        ev,
        'IDX_LAUNCH_WINDOW',
      );
      const reached = hist.complete;
      const buys = reached
        ? launchBuysFrom(hist.txs, mint, input.pairCreatedAt, cfg.filter.launchWindowSeconds)
        : null;
      const buyerFunders = new Map<string, string>();
      const buyers = [...new Set((buys ?? []).map((b) => b.buyer))];
      for (const w of buyers.slice(0, 25)) {
        const f = await funderOf(w);
        if (f) buyerFunders.set(w, f);
      }
      const supplyUi = fromBaseUnits(mintFacts.value.supply, mintFacts.value.decimals);
      bundle = ok(
        analyseBundle({
          buys,
          totalSupplyUi: supplyUi,
          funders: buyerFunders,
          fundersComplete: buyers.length <= 25,
          windowSeconds: cfg.filter.launchWindowSeconds,
          maxBundledPct: cfg.filter.maxBundledLaunchPct,
        }),
        ev.records
          .filter((r) => r.kind.startsWith('IDX_') || r.kind.startsWith('RPC_WALLET_'))
          .map((r) => r.id),
        deps.clock.now(),
      );
    }
  } catch (e) {
    bundle = missing((e as Error).message, [], 'ERROR');
  }

  // ── corroborating provider claims (never decisive)
  let corroboration: SecurityEvidence['corroboration'];
  if (deps.rugcheck) {
    try {
      const s = await deps.rugcheck.summary(mint);
      const id = ev.add(s, 'RUGCHECK_SUMMARY', 'PROVIDER_CLAIM');
      const risks = (s.data.risks ?? []).map((x) => x.name);
      corroboration = ok(
        {
          provider: 'rugcheck',
          claims: {
            scoreNormalised: s.data.score_normalised ?? null,
            lpLockedPct: s.data.lpLockedPct ?? null,
            risks,
            mintAuthorityRisk: risks.some((x) => /mint authority/i.test(x)),
            freezeAuthorityRisk: risks.some((x) => /freeze authority/i.test(x)),
          },
        },
        [id],
        s.provenance.observedAt,
      );
    } catch (e) {
      corroboration = missing((e as Error).message);
    }
  } else corroboration = missing('not configured');

  return {
    evidence: {
      mint,
      pairAddress: input.pairAddress,
      mintFacts,
      pool,
      market,
      route,
      holders,
      developer,
      bundle,
      corroboration,
    },
    records: ev.records,
  };
}

async function pagedHistory(
  helius: Helius,
  address: string,
  maxPages: number,
  ev: EvidenceCollector,
  kind: string,
  stopBefore?: number,
): Promise<{ txs: ParsedTx[]; complete: boolean }> {
  const txs: ParsedTx[] = [];
  let beforeSignature: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await helius.transactions(address, { beforeSignature, limit: 100, sortOrder: 'desc' });
    ev.add(page, kind, 'PROVIDER_CLAIM');
    txs.push(...page.data);
    if (page.data.length < 100) return { txs, complete: true };
    beforeSignature = page.data[page.data.length - 1]!.signature;
    if (stopBefore && page.data[page.data.length - 1]!.timestamp < stopBefore)
      return { txs, complete: false };
  }
  return { txs, complete: false };
}

/** Every transaction in [from, to] (epoch ms), oldest first, and whether the window was read completely. */
async function windowHistory(
  helius: Helius,
  address: string,
  from: number,
  to: number,
  maxPages: number,
  ev: EvidenceCollector,
  kind: string,
): Promise<{ txs: ParsedTx[]; complete: boolean }> {
  const txs: ParsedTx[] = [];
  let afterSignature: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await helius.transactions(address, {
      afterSignature,
      sortOrder: 'asc',
      gteTime: from,
      lteTime: to,
      limit: 100,
    });
    ev.add(page, kind, 'PROVIDER_CLAIM');
    txs.push(...page.data);
    if (page.data.length < 100) return { txs, complete: true };
    afterSignature = page.data[page.data.length - 1]!.signature;
  }
  return { txs, complete: false };
}

/**
 * The wallet that first sent at least 0.01 SOL to `wallet`. Read over RPC: page back through the wallet's
 * signatures (1,000 per call) to its origin, then open its oldest transactions. A wallet whose history is
 * longer than `maxPages` pages gives no answer rather than a guess.
 */
export async function firstFunder(
  rpc: SolanaRpc,
  wallet: string,
  ev: EvidenceCollector,
  maxPages = 3,
): Promise<string | null> {
  let before: string | undefined;
  let oldest: Array<{ signature: string; err: unknown }>;
  for (let i = 0; ; i++) {
    if (i === maxPages) return null;
    const page = await rpc.getSignatures(wallet, { before, limit: 1000 });
    ev.add(page, 'RPC_WALLET_SIGNATURES', 'ON_CHAIN');
    if (page.data.length < 1000) {
      oldest = page.data.slice(-5).reverse();
      break;
    }
    before = page.data[page.data.length - 1]!.signature;
  }
  for (const s of oldest) {
    if (s.err) continue;
    const tx = await rpc.getTransaction(s.signature);
    if (!tx.data) continue;
    ev.add(tx, 'RPC_WALLET_FUNDING_TX', 'ON_CHAIN');
    const from = solFundingInto(tx.data, wallet);
    if (from) return from;
  }
  return null;
}

interface ParsedIx {
  program?: string;
  parsed?: { type?: string; info?: Record<string, unknown> };
}

/** The first System Program transfer (or account creation) of ≥ 0.01 SOL into `wallet` in a jsonParsed transaction. */
export function solFundingInto(tx: Record<string, unknown>, wallet: string): string | null {
  const t = tx as {
    meta?: { err?: unknown; innerInstructions?: Array<{ index: number; instructions: ParsedIx[] }> } | null;
    transaction?: { message?: { instructions?: ParsedIx[] } };
  };
  if (t.meta?.err) return null;
  const outer = t.transaction?.message?.instructions ?? [];
  const inner = t.meta?.innerInstructions ?? [];
  const ordered = outer.flatMap((ix, i) => [ix, ...(inner.find((x) => x.index === i)?.instructions ?? [])]);
  for (const ix of ordered) {
    if (ix.program !== 'system' || !ix.parsed?.info) continue;
    const info = ix.parsed.info;
    const to = (info.destination ?? info.newAccount) as string | undefined;
    const from = info.source as string | undefined;
    const lamports = BigInt(String(info.lamports ?? 0));
    if (to === wallet && from && from !== wallet && lamports >= 10_000_000n) return from;
  }
  return null;
}
