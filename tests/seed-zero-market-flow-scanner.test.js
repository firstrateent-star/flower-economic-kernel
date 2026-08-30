import test from 'node:test';
import assert from 'node:assert/strict';
import { rankSeedZeroCandidates, summarizeFamilies } from '../src/economics/seed-zero-market-flow-scanner.js';

function actor({ id, title, description, users30 = 0, users7 = 0, total = 0, pricingModel = 'PAY_PER_EVENT', agentic = true }) {
  return {
    id,
    username: 'u',
    name: id,
    title,
    description,
    stats: { totalUsers30Days: users30, totalUsers7Days: users7, totalUsers: total },
    currentPricingInfo: { pricingModel },
    allowsAgenticUsers: agentic,
  };
}

test('generative flow outranks diagnostic utility when demand is comparable', () => {
  const actors = [
    actor({ id: 'leads', title: 'Local Supplier Leads', description: 'Find supplier leads and contact data', users30: 20, users7: 7, total: 80 }),
    actor({ id: 'audit', title: 'DNS Audit Validator', description: 'SPF DMARC diagnostic checker', users30: 20, users7: 7, total: 80 }),
  ];
  const { candidates } = rankSeedZeroCandidates(actors);
  assert.equal(candidates[0].id, 'leads');
});

test('crowded dominant commodity does not automatically beat smaller productive niche', () => {
  const actors = [
    actor({ id: 'instagram', title: 'Instagram Scraper', description: 'Instagram profiles and posts', users30: 1000, users7: 300, total: 300000 }),
    actor({ id: 'jobs', title: 'Niche Jobs Feed', description: 'job vacancy listings for hiring workflows', users30: 90, users7: 30, total: 500 }),
  ];
  const { candidates } = rankSeedZeroCandidates(actors);
  assert.ok(candidates.find((x) => x.id === 'jobs'));
  assert.ok(candidates.find((x) => x.id === 'instagram'));
});

test('family summary preserves competition and concentration signals', () => {
  const actors = [
    actor({ id: 'lead-a', title: 'Lead Finder A', description: 'business leads', users30: 80, total: 100 }),
    actor({ id: 'lead-b', title: 'Lead Finder B', description: 'prospect contacts', users30: 20, total: 50 }),
  ];
  const families = summarizeFamilies(actors);
  const lead = families.find((x) => x.family === 'lead_generation');
  assert.equal(lead.actors, 2);
  assert.equal(lead.recentUsers, 100);
  assert.equal(lead.topActorRecentUsers, 80);
  assert.equal(lead.topActorShare, 0.8);
});
