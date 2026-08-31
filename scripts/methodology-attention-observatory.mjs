import fs from 'node:fs/promises';
import path from 'node:path';
import { methodologyAttentionAudit } from '../research/methodology/methodology-attention-gate.js';

const OUTPUT = process.env.FLOWER_METHODOLOGY_ATTENTION_REPORT
  || 'reports/methodology-attention-observatory-latest.json';

const candidates = [
  {
    id: 'center_dividend',
    affectedDecision: 'whether another Flower recursion is worth Center-holder attention',
    canChangeDecision: true,
    newEvidence: true,
    unresolvedDecision: true,
    recurringActivationNeeded: true,
    centerDividendPath: true,
    measurableFalsifier: true,
  },
  {
    id: 'constraint_freshness',
    affectedDecision: 'whether a suspected bottleneck still exists before optimizing it',
    canChangeDecision: true,
    duplicateDecisionEffect: true,
    distinctProvenanceWorthPreserving: true,
  },
  {
    id: 'derivation_independence',
    affectedDecision: 'whether repeated meta-learning evidence is independent enough to increase confidence',
    canChangeDecision: true,
    newEvidence: false,
    unresolvedDecision: false,
    recurringActivationNeeded: false,
    internalDividendPath: true,
    measurableFalsifier: true,
  },
  {
    id: 'dimension_adaptive_breath',
    affectedDecision: 'how much local branching/context a region deserves',
    canChangeDecision: true,
    protectedUnknown: true,
    recurringActivationNeeded: false,
    internalDividendPath: true,
    measurableFalsifier: false,
  },
  {
    id: 'methodology_attention_gate',
    affectedDecision: 'whether methodology candidates remain hot, move cold, merge, or rest',
    canChangeDecision: true,
    newEvidence: true,
    unresolvedDecision: true,
    recurringActivationNeeded: true,
    internalDividendPath: true,
    centerDividendPath: true,
    measurableFalsifier: true,
  },
];

const audit = methodologyAttentionAudit({
  candidates,
  recursion: {
    newMethodEvidence: true,
    expectedDecisionChange: true,
    internalImprovementOpportunity: true,
    conceptualNoveltyOnly: false,
  },
});

const report = {
  probe: 'flower_methodology_attention_observatory_v1',
  generatedAt: new Date().toISOString(),
  canonicalMethodologyVersion: '2026-08-30.integrated-v5',
  ...audit,
  claims: {
    candidateResidencyIsCanonical: false,
    methodologyImprovementVerified: false,
    externalValueVerified: false,
  },
  stoppingCondition:
    'Promote no residency/recursion law until repeated prospective use reduces methodology burden or prevents a bad allocation without suppressing a decision-changing branch.',
};

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
