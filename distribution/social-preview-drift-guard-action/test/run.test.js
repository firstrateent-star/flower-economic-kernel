'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseList,
  parseBoolean,
  validateUrls,
  aggregate,
  shouldFail,
} = require('../run.js');

test('parseList accepts JSON arrays, commas, and newlines', () => {
  assert.deepEqual(parseList('["https://a.example","https://b.example"]'), ['https://a.example', 'https://b.example']);
  assert.deepEqual(parseList('https://a.example, https://b.example\nhttps://a.example'), ['https://a.example', 'https://b.example']);
});

test('parseBoolean is strict and predictable', () => {
  assert.equal(parseBoolean('true'), true);
  assert.equal(parseBoolean('0'), false);
  assert.throws(() => parseBoolean('maybe'));
});

test('validateUrls accepts public-shaped HTTP URLs and rejects non-HTTP protocols', () => {
  assert.doesNotThrow(() => validateUrls(['https://example.com/page']));
  assert.throws(() => validateUrls(['file:///tmp/test']));
  assert.throws(() => validateUrls([]));
});

test('aggregate counts verdicts and identifies the gate-relevant worst verdict', () => {
  const summary = aggregate([
    { verdict: 'PASS' },
    { verdict: 'RISK' },
    { verdict: 'FAIL' },
    { verdict: 'INCONCLUSIVE' },
  ]);
  assert.deepEqual(summary.counts, { PASS: 1, RISK: 1, FAIL: 1, INCONCLUSIVE: 1 });
  assert.equal(summary.worstVerdict, 'FAIL');
});

test('fail-on semantics distinguish warnings from build failures', () => {
  const riskOnly = { PASS: 0, RISK: 1, FAIL: 0, INCONCLUSIVE: 0 };
  assert.equal(shouldFail(riskOnly, 'fail'), false);
  assert.equal(shouldFail(riskOnly, 'risk'), true);
  assert.equal(shouldFail(riskOnly, 'never'), false);
});
