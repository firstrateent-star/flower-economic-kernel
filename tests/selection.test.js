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
