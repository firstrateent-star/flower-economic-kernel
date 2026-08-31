import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { createHash } from 'node:crypto';

const DEFAULT_URL = 'https://raw.githubusercontent.com/pagarsky/agent-trace/main/datasets/nl2bash_0_6B_20260328T133144Z.jsonl';
const outputPath = process.env.FLOWER_EXTERNAL_CRYSTALLIZATION_REPORT || 'reports/external-crystallization-shadow-latest.json';
const sourceUrl = process.env.FLOWER_AGENTTRACE_URL || DEFAULT_URL;
const ngramSize = Number(process.env.FLOWER_CRYSTALLIZATION_NGRAM || 2);
const minOccurrences = Number(process.env.FLOWER_CRYSTALLIZATION_MIN_OCCURRENCES || 3);
const BOUNDARY_NAMES = new Set(['final_answer', 'answer', 'response', 'respond']);

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        fetchText(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        res.resume();
        return;
      }
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stable(value ?? null))).digest('hex').slice(0, 16);
}

function normalizedSpans(trace) {
  return (trace?.spans ?? [])
    .map((span) => ({
      name: span?.tool_name ?? span?.name ?? null,
      input: span?.tool_input ?? span?.input ?? null,
      durationMs: finite(span?.duration_ms ?? span?.wall_time_ms ?? span?.elapsed_ms),
    }))
    .filter((span) => typeof span.name === 'string' && span.name.trim().length > 0)
    .map((span) => ({ ...span, name: span.name.trim() }));
}

export function analyzeAgentTraceRows(rows, { n = 2, minCount = 3 } = {}) {
  const index = new Map();
  let traceCount = 0;
  let toolBearingTraceCount = 0;
  let totalToolCalls = 0;

  for (const trace of rows) {
    traceCount += 1;
    const spans = normalizedSpans(trace);
    if (spans.length > 0) toolBearingTraceCount += 1;
    totalToolCalls += spans.length;

    for (let i = 0; i <= spans.length - n; i += 1) {
      const window = spans.slice(i, i + n);
      const sequence = window.map((span) => span.name);
      const key = sequence.join(' -> ');
      const inputSignature = fingerprint(window.map((span) => span.input));
      const entry = index.get(key) ?? {
        sequence,
        occurrenceCount: 0,
        traceIds: new Set(),
        observedDurationMs: [],
        inputSignatures: new Map(),
        containsBoundary: sequence.some((name) => BOUNDARY_NAMES.has(name.toLowerCase())),
      };
      entry.occurrenceCount += 1;
      const traceId = trace?.trace_id != null ? String(trace.trace_id) : `row_${traceCount}`;
      entry.traceIds.add(traceId);
      const inputEntry = entry.inputSignatures.get(inputSignature) ?? { occurrenceCount: 0, traceIds: new Set() };
      inputEntry.occurrenceCount += 1;
      inputEntry.traceIds.add(traceId);
      entry.inputSignatures.set(inputSignature, inputEntry);

      const localDurations = window.map((span) => span.durationMs).filter((x) => x !== null);
      if (localDurations.length === n) entry.observedDurationMs.push(localDurations.reduce((a, b) => a + b, 0));
      index.set(key, entry);
    }
  }

  const repeated = [...index.values()]
    .filter((entry) => entry.occurrenceCount >= minCount)
    .map((entry) => {
      const durations = entry.observedDurationMs;
      const meanObservedDurationMs = durations.length
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : null;
      const signatureStats = [...entry.inputSignatures.values()];
      const strongestExactInputReuseTraceCount = signatureStats.length
        ? Math.max(...signatureStats.map((item) => item.traceIds.size))
        : 0;
      const exactTransformationRecurrenceObserved = !entry.containsBoundary
        && strongestExactInputReuseTraceCount >= minCount;
      return {
        sequence: entry.sequence,
        occurrenceCount: entry.occurrenceCount,
        independentTraceCount: entry.traceIds.size,
        distinctInputSequenceCount: entry.inputSignatures.size,
        inputDiversityRatio: Number((entry.inputSignatures.size / entry.occurrenceCount).toFixed(6)),
        strongestExactInputReuseTraceCount,
        containsBoundary: entry.containsBoundary,
        meanObservedDurationMs: meanObservedDurationMs === null ? null : Number(meanObservedDurationMs.toFixed(3)),
        recurringToolShapeObserved: true,
        exactTransformationRecurrenceObserved,
        crystallizationCandidate: exactTransformationRecurrenceObserved,
        compilationSafetyVerified: false,
        decisionEquivalenceVerified: false,
        externalValueVerified: false,
      };
    })
    .sort((a, b) => Number(b.crystallizationCandidate) - Number(a.crystallizationCandidate)
      || b.strongestExactInputReuseTraceCount - a.strongestExactInputReuseTraceCount
      || b.independentTraceCount - a.independentTraceCount
      || a.sequence.join(' -> ').localeCompare(b.sequence.join(' -> ')));

  const crystallizationCandidates = repeated.filter((entry) => entry.crystallizationCandidate);

  return {
    traceCount,
    toolBearingTraceCount,
    totalToolCalls,
    ngramSize: n,
    minimumOccurrences: minCount,
    repeatedToolShapeCount: repeated.length,
    exactTransformationCandidateCount: crystallizationCandidates.length,
    topRepeatedSequences: repeated.slice(0, 25),
    topExactTransformationCandidates: crystallizationCandidates.slice(0, 25),
  };
}

function parseJsonl(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
    }
  });
}

async function main() {
  const text = await fetchText(sourceUrl);
  const rows = parseJsonl(text);
  const analysis = analyzeAgentTraceRows(rows, { n: ngramSize, minCount: minOccurrences });
  const report = {
    schemaVersion: 2,
    epistemicStatus: 'external_open_trace_shadow_observation_not_external_value_proof',
    source: {
      project: 'pagarsky/agent-trace',
      url: sourceUrl,
      datasetLicenseClaimFromProject: 'Apache-2.0 subject to upstream task terms',
    },
    question:
      'Do repeated transformations, not merely repeated tool names, occur across independent non-Flower agent traces often enough to justify further validated-crystallization research?',
    analysis,
    currentClaims: {
      recurringToolShapesObserved: analysis.repeatedToolShapeCount > 0,
      exactTransformationRecurrenceObserved: analysis.exactTransformationCandidateCount > 0,
      safeCompilationObserved: false,
      decisionEquivalenceObserved: false,
      externalValueObserved: false,
    },
    nextEvidenceRequired: [
      'For any exact-transformation candidate, inspect whether the repeated inputs represent the same semantic operation rather than an incidental literal duplicate.',
      'Replay a nominated sequence with a deterministic compiled equivalent on the same task inputs.',
      'Verify identical or improved terminal task outcome with an accountable decision/result witness.',
      'Measure latency, model calls, token use, error rate, and resource cost before and after.',
      'Reject any candidate whose sequence contains a semantic/terminal boundary or whose compiled form hides material uncertainty.',
    ],
    epistemicBoundary:
      'Tool-name recurrence is only a shape recurrence. Even exact input recurrence does not prove semantic redundancy, safe compilation, decision equivalence, value to the source project, or economic value.',
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
