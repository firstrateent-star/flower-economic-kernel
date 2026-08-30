import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessSemanticIndexTransfer,
  minimumQueriesForAmortizedGain,
} from '../src/core/semantic-index-transfer.js';

test('one lookup over a nine-item lifecycle does not earn an index', () => {
  const result = assessSemanticIndexTransfer({
    itemCount: 9,
    queryCount: 1,
    rebuildCount: 1,
    lookupShape: 'worst_case_success',
    stableStructureWitness: false,
  });
  assert.equal(result.linear.touches, 9);
  assert.equal(result.indexed.touches, 10);
  assert.equal(result.workProxyImproves, false);
  assert.equal(result.transferState, 'no_work_proxy_gain');
  assert.equal(result.externalValueVerified, false);
});

test('stable repeated lookups can amortize one index build', () => {
  const result = assessSemanticIndexTransfer({
    itemCount: 100,
    queryCount: 100,
    rebuildCount: 1,
    lookupShape: 'uniform_success',
    stableStructureWitness: true,
  });
  assert.equal(result.linear.touches, 5050);
  assert.equal(result.indexed.touches, 200);
  assert.equal(result.workProxyImproves, true);
  assert.equal(result.transferState, 'amortized_work_reduction_candidate');
  assert.ok(result.relativeReduction > 0.95);
});

test('rebuilding the index every query destroys the apparent gain', () => {
  const result = assessSemanticIndexTransfer({
    itemCount: 100,
    queryCount: 100,
    rebuildCount: 100,
    lookupShape: 'uniform_success',
    stableStructureWitness: false,
  });
  assert.equal(result.linear.touches, 5050);
  assert.equal(result.indexed.touches, 10100);
  assert.equal(result.workProxyImproves, false);
  assert.equal(result.transferState, 'no_work_proxy_gain');
});

test('small stable collections require multiple queries before indexing earns its build cost', () => {
  assert.equal(minimumQueriesForAmortizedGain({ itemCount: 9, lookupShape: 'uniform_success' }), 3);
});

test('a mathematical reduction without a stability witness is not promoted into an amortized transfer claim', () => {
  const result = assessSemanticIndexTransfer({
    itemCount: 100,
    queryCount: 100,
    rebuildCount: 1,
    lookupShape: 'uniform_success',
    stableStructureWitness: false,
  });
  assert.equal(result.workProxyImproves, true);
  assert.equal(result.transferState, 'mathematical_gain_without_stability_witness');
  assert.equal(result.externalValueVerified, false);
});
