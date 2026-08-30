import fs from 'node:fs/promises';

const cfg = JSON.parse(await fs.readFile(new URL('./targets.json', import.meta.url), 'utf8'));
const token = process.env.GITHUB_TOKEN || '';
const headers = {
  'User-Agent': 'flower-economic-kernel-claimability-scan',
  'Accept': 'application/vnd.github+json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = new Date();
const daysSince = d => Math.max(0, (now - new Date(d)) / 86400000);
const decode = s => s
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': headers['User-Agent'] } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}

async function getJson(url) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.json();
}

function parseAlgora(org, html) {
  const rows = [];
  const anchor = /href=["'](?:https:\/\/github\.com\/)?([^\/"']+)\/([^\/"']+)\/(?:issues|pull)\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchor.exec(html))) {
    const [_, owner, repo, num, titleHtml] = m;
    const start = Math.max(0, m.index - 500);
    const end = Math.min(html.length, anchor.lastIndex + 1200);
    const window = decode(html.slice(start, end));
    const before = decode(html.slice(start, m.index));
    const amountMatches = [...before.matchAll(/\$([\d,]+(?:\.\d{1,2})?)/g)];
    const amount = amountMatches.length ? Number(amountMatches.at(-1)[1].replaceAll(',', '')) : 0;
    const claimMatch = window.match(/(\d[\d,]*)\s+claims?/i);
    const claims = claimMatch ? Number(claimMatch[1].replaceAll(',', '')) : 0;
    const title = decode(titleHtml);
    if (!title || !amount) continue;
    rows.push({ org, owner, repo, number: Number(num), title, amount, claims,
      issue_url: `https://github.com/${owner}/${repo}/issues/${num}`,
      algora_url: `https://algora.io/${org}/bounties?status=open` });
  }
  const seen = new Set();
  return rows.filter(x => {
    const k = `${x.owner}/${x.repo}#${x.number}:${x.amount}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

function scopePenalty(title, body='') {
  const text = `${title} ${body}`.toLowerCase();
  let p = 0;
  for (const term of ['rebuild','rewrite','organisation','organization','subgroups','integration','browser','mobile','react native','nullable column support','agentic rag']) {
    if (text.includes(term)) p += 14;
  }
  for (const term of ['test','ci','error handling','panic','docs','documentation','toggle','flag','column','type','fix']) {
    if (text.includes(term)) p -= 4;
  }
  return Math.max(-12, Math.min(35, p));
}

function score(x) {
  const amount = Math.min(45, Math.log2(x.amount + 1) * 5.5);
  const claims = 30 / (1 + x.claims);
  const issueFresh = Math.max(0, 15 - x.issue_age_days / 30);
  const repoFresh = Math.max(0, 15 - x.repo_idle_days / 10);
  const scope = 10 - scopePenalty(x.title, x.body_excerpt);
  return Number((amount + claims + issueFresh + repoFresh + scope).toFixed(2));
}

const scraped = [];
const scrapeErrors = [];
for (const org of cfg.algora_orgs) {
  try {
    const url = `https://algora.io/${encodeURIComponent(org)}/bounties?status=open`;
    const html = await getText(url);
    scraped.push(...parseAlgora(org, html));
  } catch (e) {
    scrapeErrors.push({ org, error: String(e) });
  }
  await sleep(80);
}

const enriched = [];
const ghErrors = [];
const repoCache = new Map();
for (const b of scraped) {
  try {
    const issue = await getJson(`https://api.github.com/repos/${b.owner}/${b.repo}/issues/${b.number}`);
    const repoKey = `${b.owner}/${b.repo}`;
    let repo = repoCache.get(repoKey);
    if (!repo) {
      repo = await getJson(`https://api.github.com/repos/${repoKey}`);
      repoCache.set(repoKey, repo);
    }
    const row = {
      ...b,
      github_state: issue.state,
      issue_updated_at: issue.updated_at,
      issue_age_days: Number(daysSince(issue.updated_at).toFixed(1)),
      repo_pushed_at: repo.pushed_at,
      repo_idle_days: Number(daysSince(repo.pushed_at).toFixed(1)),
      repo_archived: Boolean(repo.archived),
      body_excerpt: String(issue.body || '').slice(0, 1200)
    };
    row.claimability_score = score(row);
    row.reasons = [];
    if (row.github_state !== 'open') row.reasons.push('underlying GitHub issue is closed');
    if (row.repo_archived) row.reasons.push('repository is archived');
    if (row.amount < cfg.min_amount_usd) row.reasons.push('below minimum payout');
    if (row.claims > cfg.max_claims) row.reasons.push('claim pressure too high');
    if (row.issue_age_days > cfg.max_issue_age_days) row.reasons.push('issue has gone stale');
    if (row.repo_idle_days > cfg.max_repo_idle_days) row.reasons.push('repository activity too old');
    row.claimable = row.reasons.length === 0;
    enriched.push(row);
  } catch (e) {
    ghErrors.push({ bounty: b, error: String(e) });
  }
  await sleep(35);
}

enriched.sort((a,b) => b.claimability_score - a.claimability_score);
const claimable = enriched.filter(x => x.claimable);

const report = {
  checked_at: now.toISOString(),
  config: cfg,
  counts: {
    algora_rows: scraped.length,
    enriched: enriched.length,
    claimable: claimable.length,
    rejected: enriched.length - claimable.length
  },
  claimable,
  rejected: enriched.filter(x => !x.claimable),
  errors: { scrape: scrapeErrors, github: ghErrors }
};

await fs.writeFile(new URL('./claimability-report.json', import.meta.url), JSON.stringify(report, null, 2));

const lines = [
  '# Germination Claimability Report', '',
  `Checked: ${report.checked_at}`,
  `Scraped: ${report.counts.algora_rows} · Enriched: ${report.counts.enriched} · Claimable: ${report.counts.claimable}`, '',
  '## Claimable candidates', ''
];
if (!claimable.length) lines.push('_No candidate cleared the current gate._', '');
for (const x of claimable.slice(0, 20)) {
  lines.push(`- **$${x.amount} · score ${x.claimability_score} · ${x.owner}/${x.repo}#${x.number}** — ${x.title}`,
    `  - claims: ${x.claims}; issue updated ${x.issue_age_days}d ago; repo pushed ${x.repo_idle_days}d ago`,
    `  - ${x.issue_url}`);
}
lines.push('', '## Rejected examples', '');
for (const x of report.rejected.slice(0, 25)) {
  lines.push(`- $${x.amount} · ${x.owner}/${x.repo}#${x.number} — ${x.reasons.join('; ')}`);
}
await fs.writeFile(new URL('./CLAIMABILITY_REPORT.md', import.meta.url), lines.join('\n') + '\n');

console.log(JSON.stringify(report.counts));
for (const x of claimable.slice(0, 10)) {
  console.log(`PASS $${x.amount} ${x.owner}/${x.repo}#${x.number} score=${x.claimability_score} claims=${x.claims}`);
}
