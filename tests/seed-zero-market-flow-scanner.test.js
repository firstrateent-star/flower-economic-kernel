import test from 'node:test';
import assert from 'node:assert/strict';
import { rankSeedZeroCandidates, rankSeedZeroProbes, summarizeFamilies } from '../src/economics/seed-zero-market-flow-scanner.js';

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
  const { probes } = rankSeedZeroProbes(actors);
  assert.equal(probes[0].id, 'leads');
});

test('crowded dominant commodity is retained as demand evidence but never auto-promoted to build', () => {
  const actors = [
    actor({ id: 'instagram', title: 'Instagram Scraper', description: 'Instagram profiles and posts', users30: 1000, users7: 300, total: 300000 }),
    actor({ id: 'jobs', title: 'Niche Jobs Feed', description: 'job vacancy listings for hiring workflows', users30: 90, users7: 30, total: 500 }),
  ];
  const { probes } = rankSeedZeroProbes(actors);
  assert.ok(probes.find((x) => x.id === 'jobs'));
  assert.ok(probes.find((x) => x.id === 'instagram'));
  assert.equal(probes.every((x) => x.buildEligible === false), true);
});

test('family summary preserves competition, breadth, and concentration signals', () => {
  const actors = [
    actor({ id: 'lead-a', title: 'Lead Finder A', description: 'business leads', users30: 80, total: 100 }),
    actor({ id: 'lead-b', title: 'Lead Finder B', description: 'prospect contacts', users30: 20, total: 50 }),
  ];
  const families = summarizeFamilies(actors);
  const lead = families.find((x) => x.family === 'lead_generation');
  assert.equal(lead.actors, 2);
  assert.equal(lead.activeActors, 2);
  assert.equal(lead.meaningfulActors, 2);
  assert.equal(lead.recentUsers, 100);
  assert.equal(lead.topActorRecentUsers, 80);
  assert.equal(lead.secondActorRecentUsers, 20);
  assert.equal(lead.topActorShare, 0.8);
  assert.equal(lead.topTwoShare, 1);
});

test('broad non-diagnostic demand can earn a gap probe but not a build claim', () => {
  const actors = [
    actor({ id: 'supplier', title: 'Supplier Lead Finder', description: 'supplier leads and contacts', users30: 40, users7: 15, total: 200 }),
    actor({ id: 'venue', title: 'Venue Prospect Finder', description: 'venue business prospects and emails', users30: 30, users7: 12, total: 160 }),
    actor({ id: 'contractor', title: 'Contractor Lead Feed', description: 'contractor leads and phone contacts', users30: 20, users7: 8, total: 120 }),
  ];
  const { families, probes } = rankSeedZeroProbes(actors);
  const lead = families.find((x) => x.family === 'lead_generation');
  assert.equal(lead.evidenceClass, 'GAP_PROBE_EARNED');
  assert.equal(lead.buildEligible, false);
  assert.equal(probes.every((x) => x.buildEligible === false), true);
  assert.ok(probes.some((x) => x.evidenceClass === 'ADJACENT_WEDGE_REFERENCE'));
});

test('single dominant incumbent remains a concentrated demand witness', () => {
  const actors = [
    actor({ id: 'giant', title: 'Business Lead Giant', description: 'business leads and contacts', users30: 950, users7: 300, total: 50000 }),
    actor({ id: 'tiny', title: 'Small Prospect Tool', description: 'prospect contacts', users30: 3, users7: 1, total: 20 }),
  ];
  const families = summarizeFamilies(actors);
  const lead = families.find((x) => x.family === 'lead_generation');
  assert.equal(lead.evidenceClass, 'CONCENTRATED_DEMAND_WITNESS');
  assert.equal(lead.buildEligible, false);
});

test('backward-compatible candidate API carries the same non-build evidence gate', () => {
  const actors = [
    actor({ id: 'jobs', title: 'Jobs Feed', description: 'job listings and hiring data', users30: 10, users7: 4, total: 50 }),
  ];
  const { candidates } = rankSeedZeroCandidates(actors);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].buildEligible, false);
});
