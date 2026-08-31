import { auditInput } from '../actors/agent-trace-efficiency-auditor/src/core.js';

const SOURCE_URL = 'https://raw.githubusercontent.com/pagarsky/agent-trace/main/datasets/nl2bash_0_6B_20260328T133144Z.jsonl';

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`AgentTrace fetch failed: ${response.status} ${response.statusText}`);
const text = await response.text();
const traces = text.split(/\r?\n/).filter(Boolean).map((line, index) => {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`Invalid JSONL row ${index + 1}: ${error.message}`);
  }
});

const audits = auditInput({ traces, maxItems: 1000, highInputTokenThreshold: 10000 });
const hypothesisCounts = new Map();
for (const audit of audits) {
  for (const hypothesis of audit.hypotheses ?? []) {
    hypothesisCounts.set(hypothesis.id, (hypothesisCounts.get(hypothesis.id) ?? 0) + 1);
  }
}

const result = {
  source: {
    repository: 'pagarsky/agent-trace',
    dataset: 'nl2bash_0_6B_20260328T133144Z.jsonl',
    url: SOURCE_URL,
    license: 'Apache-2.0',
  },
  traceCount: audits.length,
  totalModelCallSpans: audits.reduce((sum, x) => sum + x.modelCallSpans, 0),
  totalToolCallSpans: audits.reduce((sum, x) => sum + x.toolCallSpans, 0),
  totalInputTokens: audits.reduce((sum, x) => sum + x.totalInputTokens, 0),
  totalOutputTokens: audits.reduce((sum, x) => sum + x.totalOutputTokens, 0),
  totalObservedTokens: audits.reduce((sum, x) => sum + x.totalTokens, 0),
  totalErrorSpans: audits.reduce((sum, x) => sum + x.errorSpans, 0),
  tracesWithErrors: audits.filter((x) => x.errorSpans > 0).length,
  tracesWithHighInputTokenCalls: audits.filter((x) => x.highInputTokenCalls > 0).length,
  tracesWithRepeatedToolShapes: audits.filter((x) => x.repeatedToolShapes > 0).length,
  tracesWithExactRepeatedTransformations: audits.filter((x) => x.exactRepeatedTransformations > 0).length,
  tracesWithHumanBoundaries: audits.filter((x) => x.humanBoundarySpans > 0).length,
  tracesWithModelSwitches: audits.filter((x) => x.modelSwitches > 0).length,
  hypothesisCounts: Object.fromEntries([...hypothesisCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  authorityRegressionCount: audits.filter((x) => x.authority?.optimizationAuthorized !== false || x.authority?.deterministicChoiceAuthorized !== false).length,
  falseSavingsClaimCount: audits.filter((x) => (x.hypotheses ?? []).some((h) => h.savingsVerified !== false)).length,
  examples: {
    firstErrorTrace: audits.find((x) => x.errorSpans > 0) ?? null,
    firstStructuralRecurrenceTrace: audits.find((x) => x.hypotheses?.some((h) => h.id === 'structural_recurrence_only')) ?? null,
    firstExactRepeatTrace: audits.find((x) => x.exactRepeatedTransformations > 0) ?? null,
  },
};

if (result.traceCount !== traces.length) throw new Error(`Trace count mismatch: input ${traces.length}, audits ${result.traceCount}`);
if (result.authorityRegressionCount !== 0) throw new Error(`Authority regression in ${result.authorityRegressionCount} audit(s)`);
if (result.falseSavingsClaimCount !== 0) throw new Error(`Unverified savings regression in ${result.falseSavingsClaimCount} audit(s)`);

console.log(JSON.stringify(result, null, 2));
