import test from 'node:test';
import assert from 'node:assert/strict';
import { executeEmailAuthDnsSample } from '../src/experiments/email-auth-dns-sample.js';

function mockResolver(recordsByName) {
  return async (name) => {
    if (!(name in recordsByName)) {
      const error = new Error('no data');
      error.code = 'ENODATA';
      throw error;
    }
    return recordsByName[name].map((record) => [record]);
  };
}

test('supports only on hard SPF/DMARC failures among enough ESP-signaled domains', async () => {
  const domains = Array.from({ length: 8 }, (_, i) => `sender${i + 1}.example`);
  const records = {};
  for (const domain of domains) {
    records[domain] = ['v=spf1 include:sendgrid.net -all'];
    records[`_dmarc.${domain}`] = ['v=DMARC1; p=reject'];
  }
  records['sender1.example'] = [
    'v=spf1 include:sendgrid.net -all',
    'v=spf1 include:mailgun.org -all',
  ];
  records['_dmarc.sender2.example'] = ['not-a-valid-dmarc-record'];

  const result = await executeEmailAuthDnsSample({
    domains,
    resolveTxt: mockResolver(records),
    concurrency: 2,
  });

  assert.equal(result.verdict, 'supports');
  assert.equal(result.sample.espSignaled, 8);
  assert.equal(result.sample.hardFailureDomains, 2);
});

test('missing DMARC is a softer risk and does not alone earn failure-reality support', async () => {
  const domains = Array.from({ length: 8 }, (_, i) => `sender${i + 1}.example`);
  const records = {};
  for (const domain of domains) {
    records[domain] = ['v=spf1 include:amazonses.com -all'];
  }

  const result = await executeEmailAuthDnsSample({
    domains,
    resolveTxt: mockResolver(records),
    concurrency: 2,
  });

  assert.equal(result.verdict, 'weakens');
  assert.equal(result.sample.espSignaled, 8);
  assert.equal(result.sample.hardFailureDomains, 0);
  assert.equal(result.sample.riskDomains, 8);
});

test('stays inconclusive when too few sampled domains expose a recognized ESP marker', async () => {
  const domains = ['a.example', 'b.example', 'c.example'];
  const records = {
    'a.example': ['v=spf1 include:sendgrid.net -all'],
    '_dmarc.a.example': ['v=DMARC1; p=reject'],
    'b.example': ['v=spf1 include:_spf.google.com -all'],
    '_dmarc.b.example': ['v=DMARC1; p=reject'],
    'c.example': ['v=spf1 include:spf.protection.outlook.com -all'],
    '_dmarc.c.example': ['v=DMARC1; p=reject'],
  };

  const result = await executeEmailAuthDnsSample({
    domains,
    resolveTxt: mockResolver(records),
    concurrency: 1,
  });

  assert.equal(result.verdict, 'inconclusive');
  assert.equal(result.sample.espSignaled, 1);
});
