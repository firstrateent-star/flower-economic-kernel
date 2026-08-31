import test from 'node:test';
import assert from 'node:assert/strict';
import { pruneToolset } from '../src/core.js';

const tools = [
  { name: 'search_docs', description: 'Search internal documentation by keyword.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'find_documents', description: 'Find internal documents matching a query.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'search_web', description: 'Search the public web for current information.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'delete_document', description: 'Delete a document by ID after explicit approval.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

test('selects tools that cover stated intents and does not authorize production removal', () => {
  const out = pruneToolset({ tools, taskIntents: ['search internal documentation', 'search current web information'], maxTools: 3 });
  assert.equal(out.coverageComplete, true);
  assert.ok(out.selectedTools.some((x) => x.name === 'search_docs' || x.name === 'find_documents'));
  assert.ok(out.selectedTools.some((x) => x.name === 'search_web'));
  assert.equal(out.authority.productionRemovalAuthorized, false);
});

test('flags an uncovered intent instead of inventing capability', () => {
  const out = pruneToolset({ tools, taskIntents: ['book airline flights'], maxTools: 2, minIntentScore: 0.4 });
  assert.equal(out.coverageComplete, false);
  assert.deepEqual(out.uncoveredIntents, ['book airline flights']);
});

test('detects substantially overlapping tool signals', () => {
  const out = pruneToolset({ tools, taskIntents: ['search internal documents'], maxTools: 4, confusionThreshold: 0.2 });
  assert.ok(out.confusedPairs.some((x) => new Set([x.a, x.b]).has('search_docs') && new Set([x.a, x.b]).has('find_documents')));
});

test('accepts a tools/list JSON string', () => {
  const out = pruneToolset({ tools: [], toolsJson: JSON.stringify({ tools }), taskIntents: ['search current web information'] });
  assert.equal(out.inputToolCount, 4);
  assert.ok(out.selectedTools.some((x) => x.name === 'search_web'));
});
