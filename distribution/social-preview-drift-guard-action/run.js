'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const ACTOR_ID = 'firstrate/social-preview-drift-guard-api';

function parseList(value, max = 100) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  let values;
  if (text.startsWith('[')) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array.');
    values = parsed;
  } else {
    values = text.split(/[\n,]+/g);
  }
  return [...new Set(values.map((item) => String(item ?? '').trim()).filter(Boolean))].slice(0, max);
}

function parseBoolean(value, fallback = true) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  if (['true', '1', 'yes', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  throw new Error(`Invalid boolean: ${value}`);
}

function validateUrls(urls) {
  if (!urls.length) throw new Error('At least one URL is required.');
  for (const value of urls) {
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error(`Invalid URL: ${value}`); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Only HTTP(S) URLs are supported: ${value}`);
  }
}

function aggregate(results) {
  const counts = { PASS: 0, RISK: 0, FAIL: 0, INCONCLUSIVE: 0 };
  for (const result of results) {
    const verdict = String(result?.verdict ?? 'INCONCLUSIVE').toUpperCase();
    if (verdict in counts) counts[verdict] += 1;
    else counts.INCONCLUSIVE += 1;
  }
  const worstVerdict = counts.FAIL ? 'FAIL' : counts.RISK ? 'RISK' : counts.PASS ? 'PASS' : counts.INCONCLUSIVE ? 'INCONCLUSIVE' : 'NONE';
  return { counts, worstVerdict };
}

function shouldFail(counts, failOn) {
  const threshold = String(failOn ?? 'fail').toLowerCase();
  if (threshold === 'never') return false;
  if (threshold === 'risk') return counts.FAIL > 0 || counts.RISK > 0;
  if (threshold === 'fail') return counts.FAIL > 0;
  throw new Error('fail-on must be fail, risk, or never.');
}

function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${String(value)}\n`, 'utf8');
}

function annotate(result) {
  const verdict = String(result?.verdict ?? 'INCONCLUSIVE').toUpperCase();
  const url = result?.inputUrl ?? result?.url ?? 'URL';
  const codes = (result?.issues ?? []).slice(0, 4).map((issue) => issue?.code).filter(Boolean);
  const detail = codes.length ? ` (${codes.join(', ')})` : '';
  if (verdict === 'FAIL') console.log(`::error title=Social preview FAIL::${url}${detail}`);
  else if (verdict === 'RISK') console.log(`::warning title=Social preview RISK::${url}${detail}`);
  else if (verdict === 'INCONCLUSIVE') console.log(`::warning title=Social preview INCONCLUSIVE::${url} could not be measured conclusively.`);
  else console.log(`Social preview PASS: ${url}`);
}

function writeSummary(results, aggregateResult) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const rows = results.map((result) => {
    const url = String(result?.inputUrl ?? result?.url ?? '').replace(/\|/g, '\\|');
    const score = result?.riskScore == null ? '—' : result.riskScore;
    return `| ${result?.verdict ?? 'INCONCLUSIVE'} | ${score} | ${url} |`;
  });
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    '## Social Preview Drift Guard',
    '',
    `**PASS ${aggregateResult.counts.PASS} · RISK ${aggregateResult.counts.RISK} · FAIL ${aggregateResult.counts.FAIL} · INCONCLUSIVE ${aggregateResult.counts.INCONCLUSIVE}**`,
    '',
    '| Verdict | Risk score | URL |',
    '| --- | ---: | --- |',
    ...rows,
    '',
    'Powered by [Social Preview Drift Guard API](https://apify.com/firstrate/social-preview-drift-guard-api).',
    '',
  ].join('\n'), 'utf8');
}

function main() {
  const urls = parseList(process.env.DRIFT_GUARD_URLS, 100);
  validateUrls(urls);
  const profiles = parseList(process.env.DRIFT_GUARD_PROFILES || 'default,facebook,x,linkedin', 6);
  const checkImages = parseBoolean(process.env.DRIFT_GUARD_CHECK_IMAGES, true);
  const failOn = String(process.env.DRIFT_GUARD_FAIL_ON || 'fail').toLowerCase();
  if (!['fail', 'risk', 'never'].includes(failOn)) throw new Error('fail-on must be fail, risk, or never.');

  const inputPath = `${process.env.RUNNER_TEMP || '.'}/social-preview-drift-guard-input.json`;
  fs.writeFileSync(inputPath, JSON.stringify({ urls, profiles, checkImages }), 'utf8');

  console.log(`Auditing ${urls.length} URL(s) across ${profiles.join(', ')}.`);
  const stdout = execFileSync('apify', [
    'actors', 'call', ACTOR_ID,
    '--input-file', inputPath,
    '--silent',
    '--output-dataset',
    '--timeout', '60',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 20 * 1024 * 1024 });

  const results = JSON.parse(stdout || '[]');
  if (!Array.isArray(results)) throw new Error('Expected a JSON array from the Actor dataset.');
  for (const result of results) annotate(result);

  const aggregateResult = aggregate(results);
  setOutput('pass', aggregateResult.counts.PASS);
  setOutput('risk', aggregateResult.counts.RISK);
  setOutput('fail', aggregateResult.counts.FAIL);
  setOutput('inconclusive', aggregateResult.counts.INCONCLUSIVE);
  setOutput('worst-verdict', aggregateResult.worstVerdict);
  setOutput('results-json', JSON.stringify(results));
  writeSummary(results, aggregateResult);

  console.log(`Completed: PASS=${aggregateResult.counts.PASS} RISK=${aggregateResult.counts.RISK} FAIL=${aggregateResult.counts.FAIL} INCONCLUSIVE=${aggregateResult.counts.INCONCLUSIVE}`);
  if (shouldFail(aggregateResult.counts, failOn)) throw new Error(`Social preview gate failed at threshold '${failOn}'.`);
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(`::error title=Social Preview Drift Guard::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

module.exports = { parseList, parseBoolean, validateUrls, aggregate, shouldFail };
