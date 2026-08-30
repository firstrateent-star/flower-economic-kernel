import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyMarketArchetype, summarizeMarketArchetypes } from '../src/economics/seed-zero-market-archetypes.js';

function actor({ id, title, description = '', users30 = 0, users7 = 0, total = 0, pricingModel = 'PAY_PER_EVENT', agentic = true }) {
  return {
    id,
    name: id,
    title,
    description,
    stats: { totalUsers30Days: users30, totalUsers7Days: users7, totalUsers: total },
    currentPricingInfo: { pricingModel },
    allowsAgenticUsers: agentic,
  };
}

test('stateful delta wins when the title explicitly names monitoring behavior', () => {
  const result = classifyMarketArchetype(actor({
    id: 'monitor',
    title: 'LinkedIn Jobs Scraper Monitor and Alerts',
    description: 'Scrapes jobs and emits only new postings.',
  }));
  assert.equal(result.archetype, 'stateful_delta');
  assert.equal(result.evidenceSurface, 'title');
});

test('plain scraper is source access even when description lists downstream analytics use cases', () => {
  const result = classifyMarketArchetype(actor({
    id: 'maps',
    title: 'Google Maps Scraper',
    description: 'Extract businesses for lead generation, analysis, monitoring, and market research.',
  }));
  assert.equal(result.archetype, 'source_access');
});

test('decision product is distinct from source extraction', () => {
  const result = classifyMarketArchetype(actor({
    id: 'intel',
    title: 'Competitive Intelligence Analyzer',
    description: 'Collects public data and ranks competitor strengths.',
  }));
  assert.equal(result.archetype, 'decision_transform');
});

test('archetype summary preserves actual usage shares', () => {
  const actors = [
    actor({ id: 'source', title: 'Jobs Scraper', users30: 90, total: 1000 }),
    actor({ id: 'delta', title: 'Jobs Change Monitor', users30: 10, total: 100 }),
  ];
  const rows = summarizeMarketArchetypes(actors);
  const source = rows.find((x) => x.archetype === 'source_access');
  const delta = rows.find((x) => x.archetype === 'stateful_delta');
  assert.equal(source.recentUsers, 90);
  assert.equal(delta.recentUsers, 10);
  assert.equal(source.recentUserShare, 0.9);
  assert.equal(delta.recentUserShare, 0.1);
});
