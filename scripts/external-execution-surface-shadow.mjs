import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

const DEFAULT_URL = 'https://raw.githubusercontent.com/Lamb-Project/mcp-vs-cli-bench/fix-tokenise/results/analysis.md';
const sourceUrl = process.env.FLOWER_EXECUTION_SURFACE_URL || DEFAULT_URL;
const outputPath = process.env.FLOWER_EXECUTION_SURFACE_REPORT || 'reports/external-execution-surface-shadow-latest.json';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        fetchText(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        res.resume();
        return;
      }
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function numberCell(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').replace(/%/g, '').replace(/\$/g, '').trim();
  if (!cleaned || cleaned === '—' || cleaned === '⛔') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseAnalysisTable(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 11) continue;
    if (cells[0] === 'Scaffolding' || cells[0].startsWith('---')) continue;
    const [scaffolding, model, arm, initTok, totalIn, cachePct, tools, toolOk, donePct, costUsd, wallS] = cells;
    if (!['CLI', 'MCP'].includes(arm)) continue;
    rows.push({
      scaffolding,
      model,
      arm,
      initTokens: numberCell(initTok),
      totalInputTokens: numberCell(totalIn),
      cachePct: numberCell(cachePct),
      toolCalls: numberCell(tools),
      toolSuccessRatio: numberCell(toolOk),
      completionPct: numberCell(donePct),
      theoreticalCostUsd: numberCell(costUsd),
      wallSeconds: numberCell(wallS),
    });
  }
  return rows;
}

function pairKey(row) {
  return `${row.scaffolding}::${row.model}`;
}

function lowerOrEqual(a, b) {
  return a !== null && b !== null && a <= b;
}

function strictlyLower(a, b) {
  return a !== null && b !== null && a < b;
}

function surfaceDominance(a, b) {
  if (a.completionPct === null || b.completionPct === null) return false;
  if (a.completionPct < b.completionPct) return false;
  if (!lowerOrEqual(a.totalInputTokens, b.totalInputTokens)) return false;
  if (!lowerOrEqual(a.theoreticalCostUsd, b.theoreticalCostUsd)) return false;
  return a.completionPct > b.completionPct
    || strictlyLower(a.totalInputTokens, b.totalInputTokens)
    || strictlyLower(a.theoreticalCostUsd, b.theoreticalCostUsd);
}

export function analyzeExecutionSurfaces(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = pairKey(row);
    const entry = grouped.get(key) ?? { scaffolding: row.scaffolding, model: row.model };
    entry[row.arm.toLowerCase()] = row;
    grouped.set(key, entry);
  }

  const pairs = [...grouped.values()]
    .filter((entry) => entry.cli && entry.mcp
      && entry.cli.totalInputTokens !== null && entry.mcp.totalInputTokens !== null
      && entry.cli.completionPct !== null && entry.mcp.completionPct !== null)
    .map((entry) => {
      const cliDominates = surfaceDominance(entry.cli, entry.mcp);
      const mcpDominates = surfaceDominance(entry.mcp, entry.cli);
      const outcome = cliDominates ? 'cli_pareto_dominates' : mcpDominates ? 'mcp_pareto_dominates' : 'tradeoff_or_tie';
      return {
        scaffolding: entry.scaffolding,
        model: entry.model,
        cli: entry.cli,
        mcp: entry.mcp,
        mcpToCliTokenRatio: Number((entry.mcp.totalInputTokens / entry.cli.totalInputTokens).toFixed(4)),
        completionDeltaMcpMinusCli: entry.mcp.completionPct - entry.cli.completionPct,
        outcome,
      };
    });

  const byScaffold = new Map();
  for (const pair of pairs) {
    const set = byScaffold.get(pair.scaffolding) ?? new Set();
    if (pair.outcome !== 'tradeoff_or_tie') set.add(pair.outcome);
    byScaffold.set(pair.scaffolding, set);
  }
  const reversalScaffolds = [...byScaffold.entries()]
    .filter(([, outcomes]) => outcomes.has('cli_pareto_dominates') && outcomes.has('mcp_pareto_dominates'))
    .map(([scaffolding]) => scaffolding);

  const counts = {
    cliParetoDominates: pairs.filter((p) => p.outcome === 'cli_pareto_dominates').length,
    mcpParetoDominates: pairs.filter((p) => p.outcome === 'mcp_pareto_dominates').length,
    tradeoffOrTie: pairs.filter((p) => p.outcome === 'tradeoff_or_tie').length,
  };

  return {
    comparablePairCount: pairs.length,
    counts,
    reversalScaffolds,
    staticSurfaceWinnerExists: counts.cliParetoDominates === pairs.length || counts.mcpParetoDominates === pairs.length,
    pairs,
  };
}

async function main() {
  const markdown = await fetchText(sourceUrl);
  const rows = parseAnalysisTable(markdown);
  const analysis = analyzeExecutionSurfaces(rows);
  const report = {
    schemaVersion: 1,
    epistemicStatus: 'external_benchmark_shadow_observation_not_flower_policy_proof',
    source: {
      project: 'Lamb-Project/mcp-vs-cli-bench',
      url: sourceUrl,
    },
    question:
      'Does one execution surface universally dominate for a fixed real workflow, or does efficient routing depend on the cognition/scaffolding context?',
    analysis,
    currentClaims: {
      staticSurfaceWinnerObserved: analysis.staticSurfaceWinnerExists,
      contextDependentSurfaceReversalObserved: analysis.reversalScaffolds.length > 0,
      flowerRouterValidated: false,
      externalValueObserved: false,
    },
    nextEvidenceRequired: [
      'Derive task/scaffold/model features without using the outcome label, then predict the protected-outcome Pareto surface on held-out cells.',
      'Require completion not to regress before claiming token or cost improvement.',
      'Compare the learned/shadow router against simple static baselines such as always-CLI and always-MCP.',
      'Test on at least one independent benchmark family before runtime promotion.',
    ],
    epistemicBoundary:
      'This analysis can falsify universal execution-surface claims on this benchmark. It does not establish a Flower-optimal routing rule, causal value, or external economic value.',
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    comparablePairCount: analysis.comparablePairCount,
    counts: analysis.counts,
    reversalScaffolds: analysis.reversalScaffolds,
    staticSurfaceWinnerExists: analysis.staticSurfaceWinnerExists,
  }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
