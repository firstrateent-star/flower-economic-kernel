import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyMapsWebsitePair } from '../src/experiments/maps-website-sample.js';

test('direct sample recognizes corroborating website identity', () => {
  const result = classifyMapsWebsitePair({
    business: {
      title: 'Harbor Plumbing LLC',
      website: 'https://harborplumbing.example',
      phone: '(843) 555-1212',
      address: '101 Bay St, Charleston, SC 29401',
    },
    finalUrl: 'https://harborplumbing.example/',
    html: '<html><head><title>Harbor Plumbing | Charleston</title></head><body>Call 843-555-1212 at 101 Bay St, Charleston.</body></html>',
  });
  assert.equal(result.status, 'match_signal');
});

test('direct sample flags a different website brand with no corroborating identity signal', () => {
  const result = classifyMapsWebsitePair({
    business: {
      title: 'Harbor Plumbing LLC',
      website: 'https://totallydifferent.example',
      phone: '(843) 555-1212',
      address: '101 Bay St, Charleston, SC 29401',
    },
    finalUrl: 'https://totallydifferent.example/',
    html: '<html><head><meta property="og:site_name" content="Summit Roofing"><title>Summit Roofing</title></head><body>Roof replacement in Phoenix, Arizona. Call 602-555-9090.</body></html>',
  });
  assert.equal(result.status, 'mismatch_candidate');
});
