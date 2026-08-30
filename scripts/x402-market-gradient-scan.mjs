import fs from 'node:fs/promises';
import path from 'node:path';

const LEADERBOARD_URL = process.env.X402_LEADERBOARD_URL
  || 'https://agent402.tools/api/leaderboard?top=100&include=external';
const INDEX_URL = process.env.X402_INDEX_URL
  || 'https://agent402.tools/api/index';
const STATS_URL = process.env.X402_STATS_URL
  || 'https://agent402.tools/api/stats';
const OUTPUT_PATH = process.env.X402_GRADIENT_OUTPUT
  || 'reports/x402-market-gradient-latest.json';

function numberFrom(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstDefined(object, keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  }
  return null;
}

function firstArray(payload, preferredKeys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of preferredKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  for (const value of Object.values(payload ?? {})) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'flower-economic-kernel/x402-gradient-shadow-probe',
    },
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('json')) {
    const body = await response.text();
    try { return JSON.parse(body); } catch {
      throw new Error(`${url} did not return JSON (${contentType}): ${body.slice(0, 240)}`);
    }
  }
  return response.json();
}

function normalizeLeaderboard(payload) {
  const rows = firstArray(payload, ['leaderboard', 'rows', 'sellers', 'results', 'data']);
  return rows.map((row, rank) => {
    const seller = firstDefined(row, ['seller', 'name', 'domain', 'host', 'origin', 'payTo', 'address']) ?? `seller_${rank + 1}`;
    const settledUsd = numberFrom(firstDefined(row, [
      'totalUsd', 'settledUsd', 'usdcSettled', 'volumeUsd', 'usd', 'revenueUsd', 'volume',
    ]));
    const calls = numberFrom(firstDefined(row, [
      'callsSettled', 'calls', 'transactions', 'txns', 'transactionCount', 'settlements',
    ]));
    const buyers = numberFrom(firstDefined(row, [
      'uniqueBuyers', 'buyers', 'buyerCount', 'distinctBuyers',
    ]));
    return {
      rank: rank + 1,
      seller: String(seller),
      settledUsd,
      calls,
      buyers,
      usdPerCall: settledUsd !== null && calls > 0 ? settledUsd / calls : null,
      usdPerBuyer: settledUsd !== null && buyers > 0 ? settledUsd / buyers : null,
      callsPerBuyer: calls !== null && buyers > 0 ? calls / buyers : null,
      raw: row,
    };
  });
}

function summarizeLeaderboard(rows) {
  const withUsd = rows.filter((row) => row.settledUsd !== null);
  const totalUsd = withUsd.reduce((sum, row) => sum + row.settledUsd, 0);
  const totalCalls = rows.reduce((sum, row) => sum + (row.calls ?? 0), 0);
  const buyerSum = rows.reduce((sum, row) => sum + (row.buyers ?? 0), 0);
  const top = [...withUsd].sort((a, b) => b.settledUsd - a.settledUsd);
  const share = (count) => totalUsd > 0
    ? top.slice(0, count).reduce((sum, row) => sum + row.settledUsd, 0) / totalUsd
    : null;
  const broadest = [...rows]
    .filter((row) => row.buyers !== null)
    .sort((a, b) => b.buyers - a.buyers)
    .slice(0, 15);
  const highestRepeat = [...rows]
    .filter((row) => row.callsPerBuyer !== null && row.buyers >= 2)
    .sort((a, b) => b.callsPerBuyer - a.callsPerBuyer)
    .slice(0, 15);

  return {
    normalizedSellerRows: rows.length,
    summedSettledUsdAcrossReturnedRows: Number(totalUsd.toFixed(6)),
    summedCallsAcrossReturnedRows: totalCalls,
    summedBuyerRelationshipsAcrossReturnedRows: buyerSum,
    top1RevenueShare: share(1),
    top5RevenueShare: share(5),
    top10RevenueShare: share(10),
    broadestBuyerReach: broadest.map(({ raw, ...row }) => row),
    highestCallsPerBuyer: highestRepeat.map(({ raw, ...row }) => row),
  };
}

function summarizeIndex(payload) {
  const sellers = firstArray(payload, ['sellers', 'rows', 'results', 'data']);
  const direct = {
    sellerCount: numberFrom(firstDefined(payload, ['sellerCount', 'sellersCount', 'totalSellers'])),
    toolCount: numberFrom(firstDefined(payload, ['toolCount', 'toolsCount', 'totalTools', 'advertisedTools'])),
    endpointCount: numberFrom(firstDefined(payload, ['endpointCount', 'endpointsCount', 'totalEndpoints'])),
  };

  if (direct.sellerCount === null && sellers.length > 0) direct.sellerCount = sellers.length;
  if (direct.toolCount === null && sellers.length > 0) {
    const toolCounts = sellers.map((seller) => numberFrom(firstDefined(seller, ['tools', 'toolCount', 'toolsCount']))).filter((x) => x !== null);
    if (toolCounts.length > 0) direct.toolCount = toolCounts.reduce((sum, value) => sum + value, 0);
  }

  return {
    ...direct,
    indexedRowsObserved: sellers.length,
    topLevelKeys: Object.keys(payload ?? {}),
  };
}

function gradientInterpretation({ leaderboard, indexSummary, stats }) {
  const sellerSupply = indexSummary.sellerCount;
  const buyerSignals = numberFrom(firstDefined(stats, ['buyers', 'uniqueBuyers', 'buyerCount', 'totalBuyers']));
  const transactions = numberFrom(firstDefined(stats, ['transactions', 'txns', 'calls', 'settlements', 'totalTransactions']));
  const volumeUsd = numberFrom(firstDefined(stats, ['volumeUsd', 'volume', 'settledUsd', 'totalUsd']));

  return {
    supplyDemandRatio: sellerSupply !== null && buyerSignals !== null && buyerSignals > 0
      ? sellerSupply / buyerSignals
      : null,
    observedStats: { buyerSignals, transactions, volumeUsd },
    hypothesesForNextProbe: [
      'High advertised tool supply with concentrated settled value implies that adding generic supply is weak; identify transformations with real buyer breadth and repeat paid calls.',
      'Buyer breadth is a stronger first-Fruit signal than raw transaction count when automated/canary traffic may dominate volume.',
      'Calls-per-buyer can reveal recurring machine utility, but must be checked against self/canary traffic before promotion.',
      'A reusable market-gradient sensor has internal value even before external monetization because it reduces Flower search cost; external value remains unverified until independent users consume or act on it.',
      'Do not infer profitability from settled volume; provider costs, refunds, subsidies, wash/self activity, and ownership remain separate unknowns.',
    ],
    currentDecision: leaderboard.normalizedSellerRows > 0
      ? 'Use the market as an evidence field. Probe high-buyer-breadth and high-repeat transformations before building a paid tool.'
      : 'Measurement blocked: do not build from this sensor until a reliable machine-readable market source is available.',
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const [leaderboardResult, indexResult, statsResult] = await Promise.allSettled([
    fetchJson(LEADERBOARD_URL),
    fetchJson(INDEX_URL),
    fetchJson(STATS_URL),
  ]);

  const sourceStatus = {
    leaderboard: leaderboardResult.status === 'fulfilled' ? 'ok' : `error: ${leaderboardResult.reason?.message}`,
    index: indexResult.status === 'fulfilled' ? 'ok' : `error: ${indexResult.reason?.message}`,
    stats: statsResult.status === 'fulfilled' ? 'ok' : `error: ${statsResult.reason?.message}`,
  };

  if (leaderboardResult.status !== 'fulfilled') {
    throw new Error(`Decisive leaderboard measurement failed. ${sourceStatus.leaderboard}`);
  }

  const normalizedRows = normalizeLeaderboard(leaderboardResult.value);
  const leaderboardSummary = summarizeLeaderboard(normalizedRows);
  const indexSummary = indexResult.status === 'fulfilled'
    ? summarizeIndex(indexResult.value)
    : { sellerCount: null, toolCount: null, endpointCount: null, indexedRowsObserved: 0, topLevelKeys: [] };
  const stats = statsResult.status === 'fulfilled' ? statsResult.value : {};

  const report = {
    schemaVersion: 1,
    probe: 'x402_market_gradient_shadow_v1',
    startedAt,
    completedAt: new Date().toISOString(),
    epistemicStatus: 'observation_only',
    publicPromiseCreated: false,
    spendUsd: 0,
    sources: {
      leaderboard: LEADERBOARD_URL,
      index: INDEX_URL,
      stats: STATS_URL,
      status: sourceStatus,
    },
    indexSummary,
    leaderboardSummary,
    gradient: gradientInterpretation({ leaderboard: leaderboardSummary, indexSummary, stats }),
    topRows: normalizedRows.slice(0, 30),
    rawStats: stats,
    caveats: [
      'Third-party index semantics can change; normalized fields are best-effort and raw rows are retained for audit.',
      'On-chain settlement does not automatically prove independent buyer intent, provider profit, or useful external value.',
      'Summed unique-buyer counts across sellers double-count buyers who use multiple sellers.',
      'This shadow probe informs allocation only; it creates no commercial commitment and no ownership claim over external market data.',
    ],
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
