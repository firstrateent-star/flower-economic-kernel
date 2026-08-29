import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { pulse } from '../src/core/kernel.js';
import { classifyPressure } from '../src/core/pressure.js';
import { MockReasoner } from '../src/reasoners/mock.js';

test('multiple surviving siblings route through SELECT before EXPERIMENT', async () => {
  const garden = structuredClone(seed);
  const first = garden.opportunities[0];
  first.status = 'needs_test';
  first.name = 'Sibling A';
  first.realityAccess = 'Direct public sample';
  first.cheapestRealityTest = 'Sample public records';

  garden.opportunities.push({
    ...structuredClone(first),
    id: 'opp_sibling_b',
    name: 'Sibling B',
    nutrientChannel: 'Developer marketplace',
    cheapestRealityTest: 'Search public package breakage evidence',
  });

  assert.equal(classifyPressure(garden).type, 'SELECT');

  const reasoner = new MockReasoner({
    SELECT: {
      data: {
        chosenOpportunityId: 'opp_sibling_b',
        rationale: 'Sibling B has cheaper reality access and stronger passive distribution.',
      },
      sources: [],
      rawId: 'mock_select',
      usage: null,
    },
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 1 });
  assert.equal(result.breaths[0].pressure.type, 'SELECT');
  assert.equal(garden.opportunities.find((x) => x.id === 'opp_sibling_b').selectedForExperiment, true);
  assert.equal(garden.opportunities.find((x) => x.id === first.id).selectionState, 'reserve');
  assert.equal(garden.selections.length, 1);

  const next = classifyPressure(garden);
  assert.equal(next.type, 'EXPERIMENT');
  assert.equal(next.targetId, 'opp_sibling_b');
});

test('a selected sibling with newer non-supporting evidence yields deterministically to a fresh sibling', async () => {
  const garden = structuredClone(seed);
  const first = garden.opportunities[0];
  first.status = 'needs_test';
  first.name = 'Previously Selected';
  first.selectedForExperiment = true;
  first.selectionState = 'selected';
  first.lastSelectionAt = '2026-08-29T03:06:00.000Z';

  const second = {
    ...structuredClone(first),
    id: 'opp_fresh_sibling',
    name: 'Fresh Sibling',
    selectedForExperiment: false,
    selectionState: 'reserve',
    lastSelectionAt: '2026-08-29T03:06:00.000Z',
  };
  garden.opportunities.push(second);

  garden.experiments.push({
    id: 'exp_non_supporting',
    opportunityId: first.id,
    status: 'integrated',
    validationDimension: 'failure_reality',
    actionType: 'web_search',
    createdAt: '2026-08-29T03:10:00.000Z',
    executedAt: '2026-08-29T03:12:00.000Z',
    integratedAt: '2026-08-29T03:13:00.000Z',
    result: {
      verdict: 'inconclusive',
      finding: 'The search did not establish repeatable incidents.',
      sources: [{ url: 'https://example.com/evidence' }],
      sourceCount: 1,
    },
  });

  const pressure = classifyPressure(garden);
  assert.equal(pressure.type, 'SELECT');

  const result = await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });
  assert.equal(result.breaths[0].pressure.type, 'SELECT');
  assert.match(result.breaths[0].result.summary, /Selected Fresh Sibling deterministically/);
  assert.equal(first.selectedForExperiment, false);
  assert.equal(second.selectedForExperiment, true);

  const next = classifyPressure(garden);
  assert.equal(next.type, 'EXPERIMENT');
  assert.equal(next.targetId, second.id);
});
