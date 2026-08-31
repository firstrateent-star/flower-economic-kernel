import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyBatch, verifyComparison } from '../src/core.js';

test('cost reduction cannot compensate for terminal regression', () => {
  const row=verifyComparison({caseId:'a',baseline:{terminalSuccess:true,costUsd:1},challenger:{terminalSuccess:false,costUsd:0.1}});
  assert.equal(row.verdict,'regression');
  assert.equal(row.materialRegression,true);
  assert.equal(row.authority.productionPromotionAuthorized,false);
});

test('preserved success plus lower cost is candidate improvement', () => {
  const row=verifyComparison({caseId:'b',baseline:{terminalSuccess:true,costUsd:1,quality:0.9},challenger:{terminalSuccess:true,costUsd:0.5,quality:0.9}});
  assert.equal(row.verdict,'candidate_improvement');
  assert.ok(row.efficiency.costUsdImprovement>0);
  assert.equal(row.promotionCandidate,true);
});

test('protected metric regression vetoes otherwise cheaper challenger', () => {
  const row=verifyComparison({caseId:'c',baseline:{terminalSuccess:true,costUsd:2},challenger:{terminalSuccess:true,costUsd:1},protectedMetrics:[{name:'accuracy',direction:'higher',baseline:0.95,challenger:0.8,tolerance:0.01}]});
  assert.equal(row.verdict,'regression');
  assert.equal(row.protectedRegressionCount,1);
});

test('missing terminal evidence stays insufficient', () => {
  const row=verifyComparison({caseId:'d',baseline:{costUsd:2},challenger:{costUsd:1}});
  assert.equal(row.verdict,'insufficient_evidence');
});

test('representative clean replay set can pass witness but never self-authorizes production', () => {
  const batch=verifyBatch({representativeWorkload:true,comparisons:[{caseId:'e',baseline:{terminalSuccess:true,latencyMs:100},challenger:{terminalSuccess:true,latencyMs:80}}]});
  assert.equal(batch.replaySetPass,true);
  assert.equal(batch.authority.productionPromotionAuthorized,false);
});
