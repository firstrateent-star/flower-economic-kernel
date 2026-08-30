import fs from 'node:fs/promises';

const cfg = JSON.parse(await fs.readFile(new URL('./targets.json', import.meta.url), 'utf8'));
const token = process.env.GITHUB_TOKEN || '';
const headers = {
  'User-Agent': 'flower-economic-kernel-claimability-v2',
  'Accept': 'application/vnd.github+json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
};
const now = new Date();
const daysSince = d => Math.max(0, (now - new Date(d)) / 86400000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const decode = s => String(s || '')
  .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function get(url, text=false) {
  const r = await fetch(url, { headers: text ? {'User-Agent':headers['User-Agent']} : headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return text ? r.text() : r.json();
}

function parseAlgora(org, html) {
  const rows=[];
  const anchor=/href=["'](?:https:\/\/github\.com\/)?([^\/"']+)\/([^\/"']+)\/(?:issues|pull)\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=anchor.exec(html))){
    const [_,owner,repo,num,titleHtml]=m;
    const start=Math.max(0,m.index-700), end=Math.min(html.length,anchor.lastIndex+1800);
    const window=decode(html.slice(start,end));
    const before=decode(html.slice(start,m.index));
    const amounts=[...before.matchAll(/\$([\d,]+(?:\.\d{1,2})?)/g)];
    const amount=amounts.length?Number(amounts.at(-1)[1].replaceAll(',','')):0;
    // Missing claim text is UNKNOWN, never zero.
    const cm=window.match(/(\d[\d,]*)\s+claims?/i);
    const claims=cm?Number(cm[1].replaceAll(',','')):null;
    const title=decode(titleHtml);
    if(!title||!amount) continue;
    rows.push({org,owner,repo,number:Number(num),title,amount,algora_claims:claims,
      issue_url:`https://github.com/${owner}/${repo}/issues/${num}`,
      algora_url:`https://algora.io/${org}/bounties?status=open`});
  }
  const seen=new Set();
  return rows.filter(x=>{const k=`${x.owner}/${x.repo}#${x.number}:${x.amount}`;if(seen.has(k))return false;seen.add(k);return true;});
}

function implementationPressure(comments, issueNo){
  const actors=new Set(), prs=new Set(), signals=[];
  const issuePattern=new RegExp(`(?:/claim|/attempt)\\s+#?${issueNo}\\b`,'i');
  for(const c of comments){
    const body=String(c.body||'');
    const prsHere=[...body.matchAll(/(?:github\.com\/[^\s/]+\/[^\s/]+\/pull\/|\bPR\s*#?|\bpull\s*#)(\d+)/gi)].map(m=>m[1]);
    const signal=issuePattern.test(body)||/\bPR Created\b|\bopened (?:a )?(?:fix|PR)\b|\bfix (?:is )?in #\d+/i.test(body)||prsHere.length>0;
    if(signal){
      if(c.user?.login && c.user.login!=='algora-pbc') actors.add(c.user.login);
      prsHere.forEach(x=>prs.add(x));
      signals.push({user:c.user?.login||null,body:body.slice(0,350)});
    }
  }
  return {actors:[...actors], linked_prs:[...prs], signal_count:signals.length, examples:signals.slice(-6)};
}

function complexityPenalty(title,body,comments){
  const t=`${title} ${body}`.toLowerCase(); let p=0;
  for(const term of ['rewrite','rebuild','subgroups','organisation','organization','integration','browser','mobile','react native','nullable column support','architecture']) if(t.includes(term)) p+=12;
  if(/unknown to why|cannot reproduce|can.t reproduce|not reproducible|intermittent/.test(t)) p+=30;
  if(comments>35) p+=10;
  if(comments>80) p+=15;
  for(const term of ['regression test','small fix','error handling','panic','docs','documentation','toggle','flag']) if(t.includes(term)) p-=3;
  return Math.max(0,Math.min(60,p));
}

function score(x){
  const payout=Math.min(40,Math.log2(x.amount+1)*5);
  const freshness=Math.max(0,15-x.issue_age_days/30)+Math.max(0,15-x.repo_idle_days/10);
  const algora=x.algora_claims===null?0:Math.max(0,15-3*x.algora_claims);
  const impl=Math.max(0,25-9*x.implementation.actors.length-7*x.implementation.linked_prs.length);
  return Number((payout+freshness+algora+impl-x.complexity_penalty).toFixed(2));
}

const scraped=[],errors=[];
for(const org of cfg.algora_orgs){
  try{scraped.push(...parseAlgora(org,await get(`https://algora.io/${encodeURIComponent(org)}/bounties?status=open`,true)));}
  catch(e){errors.push({stage:'algora',org,error:String(e)});} await sleep(50);
}

const repoCache=new Map(), rows=[];
for(const b of scraped){
  try{
    const issue=await get(`https://api.github.com/repos/${b.owner}/${b.repo}/issues/${b.number}`);
    const comments=await get(`https://api.github.com/repos/${b.owner}/${b.repo}/issues/${b.number}/comments?per_page=100`);
    const key=`${b.owner}/${b.repo}`;
    let repo=repoCache.get(key); if(!repo){repo=await get(`https://api.github.com/repos/${key}`);repoCache.set(key,repo);}
    const implementation=implementationPressure(comments,b.number);
    const row={...b,github_state:issue.state,issue_updated_at:issue.updated_at,issue_age_days:Number(daysSince(issue.updated_at).toFixed(1)),repo_pushed_at:repo.pushed_at,repo_idle_days:Number(daysSince(repo.pushed_at).toFixed(1)),repo_archived:Boolean(repo.archived),github_comment_count:issue.comments||0,body_excerpt:String(issue.body||'').slice(0,1800),implementation};
    row.complexity_penalty=complexityPenalty(row.title,row.body_excerpt,row.github_comment_count);
    row.reasons=[];
    if(row.github_state!=='open') row.reasons.push('underlying GitHub issue is closed');
    if(row.repo_archived) row.reasons.push('repository is archived');
    if(row.amount<cfg.min_amount_usd) row.reasons.push('below minimum payout');
    if(row.algora_claims!==null && row.algora_claims>cfg.max_claims) row.reasons.push(`Algora claim pressure high (${row.algora_claims})`);
    if(row.issue_age_days>cfg.max_issue_age_days) row.reasons.push('issue stale');
    if(row.repo_idle_days>cfg.max_repo_idle_days) row.reasons.push('repository inactive');
    if(implementation.actors.length>1) row.reasons.push(`implementation pressure: ${implementation.actors.length} actors`);
    if(implementation.linked_prs.length>1) row.reasons.push(`implementation pressure: ${implementation.linked_prs.length} linked PRs`);
    if(row.complexity_penalty>=30) row.reasons.push(`scope/reproduction risk (${row.complexity_penalty})`);
    row.claimable=row.reasons.length===0;
    row.claimability_score=score(row);
    rows.push(row);
  }catch(e){errors.push({stage:'github',bounty:b,error:String(e)});} await sleep(30);
}
rows.sort((a,b)=>b.claimability_score-a.claimability_score);
const claimable=rows.filter(x=>x.claimable);
const report={checked_at:now.toISOString(),version:2,counts:{algora_rows:scraped.length,enriched:rows.length,claimable:claimable.length,rejected:rows.length-claimable.length},claimable,rejected:rows.filter(x=>!x.claimable),errors};
await fs.writeFile(new URL('./claimability-report-v2.json',import.meta.url),JSON.stringify(report,null,2));
const md=['# Germination Claimability Report v2','',`Checked: ${report.checked_at}`,`Scraped: ${scraped.length} · Enriched: ${rows.length} · Claimable: ${claimable.length}`,'','## Survivors',''];
if(!claimable.length) md.push('_No candidate cleared the stricter source+implementation gate._','');
for(const x of claimable.slice(0,20)) md.push(`- **$${x.amount} · score ${x.claimability_score} · ${x.owner}/${x.repo}#${x.number}** — ${x.title}`,`  - Algora claims: ${x.algora_claims===null?'unknown':x.algora_claims}; implementation actors: ${x.implementation.actors.length}; linked PRs: ${x.implementation.linked_prs.length}`,`  - issue updated ${x.issue_age_days}d ago; repo pushed ${x.repo_idle_days}d ago`,`  - ${x.issue_url}`);
md.push('','## Rejected','');
for(const x of report.rejected.slice(0,40)) md.push(`- $${x.amount} · ${x.owner}/${x.repo}#${x.number} — ${x.reasons.join('; ')}`);
await fs.writeFile(new URL('./CLAIMABILITY_REPORT_V2.md',import.meta.url),md.join('\n')+'\n');
console.log(JSON.stringify(report.counts));
for(const x of claimable.slice(0,10)) console.log(`PASS $${x.amount} ${x.owner}/${x.repo}#${x.number} score=${x.claimability_score} algoraClaims=${x.algora_claims ?? 'unknown'} actors=${x.implementation.actors.length} prs=${x.implementation.linked_prs.length}`);
