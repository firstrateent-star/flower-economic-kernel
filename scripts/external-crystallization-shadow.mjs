import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

const DEFAULT_URL = 'https://raw.githubusercontent.com/pagarsky/agent-trace/main/datasets/nl2bash_0_6B_20260328T133144Z.jsonl';
const outputPath = process.env.FLOWER_EXTERNAL_CRYSTALLIZATION_REPORT || 'reports/external-crystallization-shadow-latest.json';
const sourceUrl = process.env.FLOWER_AGENTTRACE_URL || DEFAULT_URL;
const ngramSize = Number(process.env.FLOWER_CRYSTALLIZATION_NGRAM || 2);
const minOccurrences = Number(process.env.FLOWER_CRYSTALLIZATION_MIN_OCCURRENCES || 3);

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

function toolSequence(trace) {
  return (trace?.spans ?? [])
    .map((span) => span?.tool_name ?? span?.name ?? null)
    .filter((name) => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim());
}

function spanDuration(span) {
  return finite(span?.duration_ms ?? span?.wall_time_ms ?? span?.elapsed_ms);
}

export function analyzeAgentTraceRows(rows, { n = 2, minCount = 3 } = {}) {
  const index = new Map();
  let traceCount = 0;
  let toolBearingTraceCount = 0;
  let totalToolCalls = 0;

  for (const trace of rows) {
    traceCount += 1;
    const seq = toolSequence(trace);
    if (seq.length > 0) toolBearingTraceCount += 1;
    totalToolCalls += seq.length;

    const spans = trace?.spans ?? [];
    for (let i = 0; i <= seq.length - n; i += 1) {
      const key = seq.slice(i, i + n).join(' -> ');
      const entry = index.get(key) ?? {
        sequence: seq.slice(i, i + n),
        occurrenceCount: 0,
        traceIds: new Set(),
        observedDurationMs: [],
      };
      entry.occurrenceCount += 1;
      if (trace?.trace_id != null) entry.traceIds.add(String(trace.trace_id));

      const localDurations = spans.slice(i, i + n).map(spanDuration).filter((x) => x !== null);
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
      return {
        sequence: entry.sequence,
        occurrenceCount: entry.occurrenceCount,
        independentTraceCount: entry.traceIds.size,
        meanObservedDurationMs: meanObservedDurationMs === null ? null : Number(meanObservedDurationMs.toFixed(3)),
        crystallizationCandidate: true,
        compilationSafetyVerified: false,
        decisionEquivalenceVerified: false,
        externalValueVerified: false,
      };
    })
    .sort((a, b) => b.independentTraceCount - a.independentTraceCount
      || b.occurrenceCount - a.occurrenceCount
      || a.sequence.join(' -> ').localeCompare(b.sequence.join(' -> ')));

  return {
    traceCount,
    toolBearingTraceCount,
    totalToolCalls,
    ngramSize: n,
    minimumOccurrences: minCount,
    repeatedSequenceCount: repeated.length,
    topRepeatedSequences: repeated.slice(0, 25),
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
    schemaVersion: 1,
    epistemicStatus: 'external_open_trace_shadow_observation_not_external_value_proof',
    source: {
      project: 'pagarsky/agent-trace',
      url: sourceUrl,
      datasetLicenseClaimFromProject: 'Apache-2.0 subject to upstream task terms',
    },
    question:
      'Do repeated procedural tool subsequences occur across independent non-Flower agent traces often enough to justify further validated-crystallization research?',
    analysis,
    currentClaims: {
      repeatedProceduralStructureObserved: analysis.repeatedSequenceCount > 0,
      safeCompilationObserved: false,
      decisionEquivalenceObserved: false,
      externalValueObserved: false,
    },
    nextEvidenceRequired: [
      'Replay a nominated sequence with a deterministic compiled equivalent on the same task inputs.',
      'Verify identical or improved terminal task outcome with an accountable decision/result witness.',
      'Measure latency, model calls, token use, error rate, and resource cost before and after.',
      'Reject any candidate whose sequence contains a semantic fork or whose compiled form hides material uncertainty.',
    ],
    epistemicBoundary:
      'Cross-trace repetition is evidence of recurring structure only. It does not prove that the sequence is semantically redundant, safe to compile, decision-equivalent, valuable to the source project, or economically valuable.',
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
