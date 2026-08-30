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
  for (const key of preferredKeys) if (Array.isArray(payload?.[key])) return payload[key];
  for (const value of Object.values(payload ?? {})) if (Array.isArray(value)) return value;
  return [];
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'flower-economic-kernel/x402-gradient-shadow-probe' },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const body = await response.text();
  try { return JSON.parse(body); } catch {
    throw new Error(`${url} did not return JSON: ${body.slice(0, 240)}`);
  }
}

function classifyFlow({ buyers, callsPerBuyer }) {
  if (buyers === null || callsPerBuyer === null) return 'insufficient_measurement';
  if (buyers >= 50 && callsPerBuyer >= 10) return 'broad_buyer_repeat';
  if (buyers >= 50 && callsPerBuyer < 2) return 'broad_buyer_single_use';
  if (buyers < 10 && callsPerBuyer >= 100) return 'narrow_buyer_high_repeat';
  if (buyers >= 20 && callsPerBuyer >= 3) return 'moderate_breadth_repeat';
  return 'emerging_or_sparse';
}

function evidencePriority({ buyers, callsPerBuyer, settledUsd }) {
  if (buyers === null || callsPerBuyer === null || settledUsd === null) return null;
  // Ordering heuristic only. Log transforms prevent one vanity metric from dominating.
  // Buyer breadth receives the strongest exponent because repeated calls from one payer
  // can be automation/self traffic and should not masquerade as broad demand.
  const breadth = Math.log1p(buyers);
  const repeat = Math.log1p(Math.min(callsPerBuyer, 500));
  const returnSignal = Math.log1p(settledUsd);
  return breadth ** 1.6 * repeat * returnSignal;
}

function normalizeLeaderboard(payload) {
  const rows = firstArray(payload, ['leaderboard', 'rows', 'sellers', 'results', 'data']);
  return rows.map((row, rank) => {
    const seller = firstDefined(row, ['seller', 'name', 'domain', 'host', 'origin', 'payTo', 'address']) ?? `seller_${rank + 1}`;
    const settledUsd = numberFrom(firstDefined(row, ['totalUsd', 'settledUsd', 'usdcSettled', 'volumeUsd', 'usd', 'revenueUsd', 'volume']));
    const calls = numberFrom(firstDefined(row, ['callsSettled', 'calls', 'transactions', 'txns', 'transactionCount', 'settlements']));
    const buyers = numberFrom(firstDefined(row, ['uniqueBuyers', 'buyers', 'buyerCount', 'distinctBuyers']));
    const callsPerBuyer = calls !== null && buyers > 0 ? calls / buyers : null;
    const rowBase = {
      rank: rank + 1,
      seller: String(seller),
      settledUsd,
      calls,
      buyers,
      usdPerCall: settledUsd !== null && calls > 0 ? settledUsd / calls : null,
      usdPerBuyer: settledUsd !== null && buyers > 0 ? settledUsd / buyers : null,
      callsPerBuyer,
    };
    return {
      ...rowBase,
      flowClass: classifyFlow(rowBase),
      evidencePriorityScore: evidencePriority(rowBase),
      raw: row,
    };
  });
}

function stripRaw(row) {
  const { raw, ...rest } = row;
  return rest;
}

function summarizeLeaderboard(rows) {
  const withUsd = rows.filter((row) => row.settledUsd !== null);
  const totalUsd = withUsd.reduce((sum, row) => sum + row.settledUsd, 0);
  const totalCalls = rows.reduce((sum, row) => sum + (row.calls ?? 0), 0);
  const buyerSum = rows.reduce((sum, row) => sum + (row.buyers ?? 0), 0);
  const top = [...withUsd].sort((a, b) => b.settledUsd - a.settledUsd);
  const share = (count) => totalUsd > 0 ? top.slice(0, count).reduce((sum, row) => sum + row.settledUsd, 0) / totalUsd : null;
  const broadest = [...rows].filter((row) => row.buyers !== null).sort((a, b) => b.buyers - a.buyers).slice(0, 15);
  const highestRepeat = [...rows].filter((row) => row.callsPerBuyer !== null && row.buyers >= 2).sort((a, b) => b.callsPerBuyer - a.callsPerBuyer).slice(0, 15);
  const broadRepeat = [...rows]
    .filter((row) => row.flowClass === 'broad_buyer_repeat')
    .sort((a, b) => (b.evidencePriorityScore ?? 0) - (a.evidencePriorityScore ?? 0));
  const priority = [...rows]
    .filter((row) => row.evidencePriorityScore !== null)
    .sort((a, b) => b.evidencePriorityScore - a.evidencePriorityScore)
    .slice(0, 20);
  const flowClassCounts = rows.reduce((acc, row) => {
    acc[row.flowClass] = (acc[row.flowClass] ?? 0) + 1;
    return acc;
  }, {});

  return {
    normalizedSellerRows: rows.length,
    summedSettledUsdAcrossReturnedRows: Number(totalUsd.toFixed(6)),
    summedCallsAcrossReturnedRows: totalCalls,
    summedBuyerRelationshipsAcrossReturnedRows: buyerSum,
    top1RevenueShare: share(1),
    top5RevenueShare: share(5),
    top10RevenueShare: share(10),
    flowClassCounts,
    broadBuyerRepeatLeaders: broadRepeat.slice(0, 15).map(stripRaw),
    evidencePriorityLeaders: priority.map(stripRaw),
    broadestBuyerReach: broadest.map(stripRaw),
    highestCallsPerBuyer: highestRepeat.map(stripRaw),
  };
}

function summarizeIndex(payload) {
  const sellers = firstArray(payload, ['sellers', 'rows', 'results', 'data']);
  const totals = payload?.totals ?? {};
  const direct = {
    sellerCount: numberFrom(firstDefined(payload, ['sellerCount', 'sellersCount', 'totalSellers'])),
    toolCount: numberFrom(firstDefined(payload, ['toolCount', 'toolsCount', 'totalTools', 'advertisedTools']))
      ?? numberFrom(firstDefined(totals, ['tools', 'toolCount', 'totalTools'])),
    endpointCount: numberFrom(firstDefined(payload, ['endpointCount', 'endpointsCount', 'totalEndpoints']))
      ?? numberFrom(firstDefined(totals, ['endpoints', 'endpointCount', 'totalEndpoints'])),
  };
  if (direct.sellerCount === null && sellers.length > 0) direct.sellerCount = sellers.length;
  return { ...direct, indexedRowsObserved: sellers.length, topLevelKeys: Object.keys(payload ?? {}) };
}

function gradientInterpretation({ leaderboard, indexSummary, stats }) {
  const rawServiceCalls = numberFrom(stats?.toolCallsServed?.total);
  const rawUsdcCalls = numberFrom(stats?.toolCallsServed?.viaUSDC);
  const rawInternalUsdcCalls = numberFrom(stats?.toolCallsServed?.viaUSDCInternal);
  const estimatedServiceRevenueUsd = numberFrom(stats?.estimatedRevenueUsd);
  const internalUsdcFraction = rawUsdcCalls > 0 && rawInternalUsdcCalls !== null ? rawInternalUsdcCalls / rawUsdcCalls : null;

  return {
    observedServiceStats: {
      toolCallsServed: rawServiceCalls,
      usdcCalls: rawUsdcCalls,
      internalUsdcCalls: rawInternalUsdcCalls,
      internalUsdcFraction,
      estimatedServiceRevenueUsd,
    },
    strongestMeasuredFlowClass: leaderboard.broadBuyerRepeatLeaders.length > 0 ? 'broad_buyer_repeat' : 'none_observed',
    hypothesesForNextProbe: [
      'Broad buyer reach plus repeat paid calls is a stronger demand signal than raw calls alone.',
      'Narrow-buyer high-repeat activity must be treated as automation/concentration risk until buyer independence is established.',
      'Broad one-shot usage can signal acquisition or event-driven utility but is weaker evidence of recurring machine value than broad repeat use.',
      'Provider settled value is not provider profit; full lifecycle costs and subsidies remain separate unknowns.',
      'The sensor itself has internal regenerative value only if it changes Flower allocation and reduces future search cost; external value remains unverified until independent users act on it.',
    ],
    currentDecision: leaderboard.broadBuyerRepeatLeaders.length > 0
      ? 'Inspect the functional transformations behind broad-buyer repeat leaders before building. Search for recurring utility common across independently used paid services.'
      : 'Do not build. Expand measurement until a broad-buyer repeat pattern is visible or falsify this habitat.',
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const [leaderboardResult, indexResult, statsResult] = await Promise.allSettled([
    fetchJson(LEADERBOARD_URL), fetchJson(INDEX_URL), fetchJson(STATS_URL),
  ]);
  const sourceStatus = {
    leaderboard: leaderboardResult.status === 'fulfilled' ? 'ok' : `error: ${leaderboardResult.reason?.message}`,
    index: indexResult.status === 'fulfilled' ? 'ok' : `error: ${indexResult.reason?.message}`,
    stats: statsResult.status === 'fulfilled' ? 'ok' : `error: ${statsResult.reason?.message}`,
  };
  if (leaderboardResult.status !== 'fulfilled') throw new Error(`Decisive leaderboard measurement failed. ${sourceStatus.leaderboard}`);

  const normalizedRows = normalizeLeaderboard(leaderboardResult.value);
  const leaderboardSummary = summarizeLeaderboard(normalizedRows);
  const indexSummary = indexResult.status === 'fulfilled'
    ? summarizeIndex(indexResult.value)
    : { sellerCount: null, toolCount: null, endpointCount: null, indexedRowsObserved: 0, topLevelKeys: [] };
  const stats = statsResult.status === 'fulfilled' ? statsResult.value : {};

  const report = {
    schemaVersion: 2,
    probe: 'x402_market_gradient_shadow_v2',
    startedAt,
    completedAt: new Date().toISOString(),
    epistemicStatus: 'observation_only',
    publicPromiseCreated: false,
    spendUsd: 0,
    sources: { leaderboard: LEADERBOARD_URL, index: INDEX_URL, stats: STATS_URL, status: sourceStatus },
    indexSummary,
    leaderboardSummary,
    gradient: gradientInterpretation({ leaderboard: leaderboardSummary, indexSummary, stats }),
    topRows: normalizedRows.slice(0, 30),
    rawStats: stats,
    scoringNote: 'evidencePriorityScore is only a search-order heuristic. It cannot verify demand, independence, useful value, ownership, profit, or regenerative surplus.',
    caveats: [
      'Third-party index semantics can change; normalized fields are best-effort and raw rows are retained for audit.',
      'On-chain settlement does not automatically prove independent buyer intent, provider profit, or useful external value.',
      'Summed unique-buyer counts across sellers double-count buyers who use multiple sellers.',
      'Internal, canary, heartbeat, subsidized, or self traffic can inflate raw activity; buyer breadth reduces but does not eliminate this uncertainty.',
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
