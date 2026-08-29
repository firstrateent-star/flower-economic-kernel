import test from 'node:test';
import assert from 'node:assert/strict';
import { compareProfileResults, createSafeLookup, isPublicIp, parseMetadata, scoreIssues } from '../src/core.js';

test('parseMetadata resolves canonical and preview image URLs', () => {
  const html = `<!doctype html><html><head>
    <title>Example &amp; Demo</title>
    <link rel="canonical" href="/article">
    <meta property="og:title" content="Example Card">
    <meta property="og:image" content="/card.jpg">
    <meta property="og:url" content="https://example.com/article">
    <meta name="twitter:card" content="summary_large_image">
  </head></html>`;
  const metadata = parseMetadata(html, 'https://example.com/article?ref=1');
  assert.equal(metadata.title, 'Example & Demo');
  assert.equal(metadata.canonical, 'https://example.com/article');
  assert.equal(metadata.og.imageResolved, 'https://example.com/card.jpg');
  assert.equal(metadata.twitter.card, 'summary_large_image');
});

test('profile comparison detects crawler-conditioned image drift', () => {
  const base = {
    profile: 'default', status: 200, finalUrl: 'https://example.com/page',
    metadata: { canonical: 'https://example.com/page', og: { title: 'A', imageResolved: 'https://example.com/a.jpg', urlResolved: 'https://example.com/page' }, twitter: { card: 'summary', imageResolved: null } },
  };
  const bot = structuredClone(base);
  bot.profile = 'facebook';
  bot.metadata.og.imageResolved = 'https://example.com/b.jpg';
  const issues = compareProfileResults([base, bot]);
  assert.ok(issues.some((x) => x.code === 'PROFILE_METADATA_DRIFT' && x.details?.field === 'og:image'));
  assert.ok(issues.some((x) => x.severity === 'fail'));
});

test('scoreIssues is deterministic and fail-closed', () => {
  assert.deepEqual(scoreIssues([]), { verdict: 'PASS', riskScore: 0 });
  assert.equal(scoreIssues([{ severity: 'risk' }]).verdict, 'RISK');
  const fail = scoreIssues([{ severity: 'fail' }, { severity: 'risk' }]);
  assert.equal(fail.verdict, 'FAIL');
  assert.equal(fail.riskScore, 47);
});

test('private and reserved addresses are rejected', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '169.254.1.1', '::1', 'fc00::1', 'fe80::1']) {
    assert.equal(isPublicIp(address), false, address);
  }
  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('2606:4700:4700::1111'), true);
});

test('safe lookup supports Node multi-address and single-address callback shapes', () => {
  const records = [
    { address: '8.8.8.8', family: 4 },
    { address: '2606:4700:4700::1111', family: 6 },
  ];

  let multiArgs;
  createSafeLookup(records)('example.com', { all: true }, (...args) => { multiArgs = args; });
  assert.deepEqual(multiArgs, [null, records]);

  let singleArgs;
  createSafeLookup(records)('example.com', { all: false }, (...args) => { singleArgs = args; });
  assert.deepEqual(singleArgs, [null, '8.8.8.8', 4]);
});
