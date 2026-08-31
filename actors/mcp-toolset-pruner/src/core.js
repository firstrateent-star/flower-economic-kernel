const STOP = new Set(['a','an','and','are','as','at','be','by','for','from','in','into','is','it','of','on','or','the','to','use','using','with']);

function words(value) {
  return new Set(String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_\- ]+/g, ' ')
    .split(/[\s_\-]+/)
    .filter((x) => x.length > 1 && !STOP.has(x)));
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter || 1);
}

function normalizeTool(raw, index) {
  const inputSchema = raw?.inputSchema ?? raw?.input_schema ?? raw?.schema ?? {};
  const name = String(raw?.name ?? `tool_${index + 1}`);
  const description = String(raw?.description ?? '');
  const required = Array.isArray(inputSchema?.required) ? inputSchema.required.map(String) : [];
  const properties = Object.keys(inputSchema?.properties ?? {});
  const sideEffectText = `${name} ${description}`.toLowerCase();
  const destructive = /\b(delete|remove|destroy|cancel|revoke|refund|charge|pay|purchase|send|post|publish|write|update|create|execute|deploy|terminate)\b/.test(sideEffectText);
  const readLike = /\b(search|find|get|fetch|read|list|inspect|lookup|query|view|retrieve|check)\b/.test(sideEffectText);
  const tokens = words(`${name} ${description} ${properties.join(' ')}`);
  return { index, name, description, inputSchema, required, properties, destructive, readLike, tokens, raw };
}

function parseTools(input) {
  if (Array.isArray(input?.tools) && input.tools.length > 0) return input.tools;
  if (typeof input?.toolsJson === 'string' && input.toolsJson.trim()) {
    const parsed = JSON.parse(input.toolsJson);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.tools)) return parsed.tools;
    if (parsed?.name) return [parsed];
  }
  if (Array.isArray(input?.tools)) return input.tools;
  return [];
}

function scoreToolForIntent(tool, intent) {
  const iw = words(intent);
  const overlap = [...iw].filter((x) => tool.tokens.has(x));
  const coverage = iw.size ? overlap.length / iw.size : 0;
  const exactNameBonus = tool.name.toLowerCase().includes(String(intent).toLowerCase().trim()) ? 0.25 : 0;
  const descriptionBonus = tool.description.length >= 30 ? 0.05 : 0;
  return { score: Math.min(1, coverage + exactNameBonus + descriptionBonus), matchedTerms: overlap, intentTerms: [...iw] };
}

function qualityPenalty(tool) {
  let p = 0;
  const reasons = [];
  if (!tool.description.trim()) { p += 0.25; reasons.push('missing description'); }
  else if (tool.description.trim().length < 20) { p += 0.1; reasons.push('very short description'); }
  if (tool.properties.length && tool.required.length === 0) { p += 0.05; reasons.push('schema has fields but no required arguments'); }
  if (tool.destructive && !/confirm|approval|explicit/i.test(tool.description)) { p += 0.05; reasons.push('side-effect language without explicit confirmation boundary'); }
  return { penalty: p, reasons };
}

function confusedPairs(tools, threshold) {
  const out = [];
  for (let i = 0; i < tools.length; i += 1) {
    for (let j = i + 1; j < tools.length; j += 1) {
      const similarity = jaccard(tools[i].tokens, tools[j].tokens);
      if (similarity >= threshold) {
        out.push({
          a: tools[i].name,
          b: tools[j].name,
          similarity: Number(similarity.toFixed(3)),
          warning: 'These tools expose substantially overlapping language/schema signals; agents may confuse them unless their use/avoid boundaries are distinct.',
        });
      }
    }
  }
  return out.sort((a, b) => b.similarity - a.similarity);
}

export function pruneToolset(input = {}) {
  const rawTools = parseTools(input);
  const tools = rawTools.map(normalizeTool);
  const taskIntents = Array.isArray(input.taskIntents) ? input.taskIntents.map(String).filter(Boolean) : [];
  const maxTools = Math.max(1, Math.min(Number(input.maxTools ?? 12), 50));
  const minIntentScore = Math.max(0, Math.min(Number(input.minIntentScore ?? 0.2), 1));
  const confusionThreshold = Math.max(0.1, Math.min(Number(input.confusionThreshold ?? 0.55), 1));
  if (!tools.length) throw new Error('Provide at least one tool in tools or toolsJson.');

  const pairs = confusedPairs(tools, confusionThreshold);
  const perTool = tools.map((tool) => {
    const quality = qualityPenalty(tool);
    const intents = taskIntents.map((intent) => ({ intent, ...scoreToolForIntent(tool, intent) }));
    const best = intents.reduce((m, x) => Math.max(m, x.score), 0);
    const matchedIntentCount = intents.filter((x) => x.score >= minIntentScore).length;
    const selectionScore = taskIntents.length ? Math.max(0, best - quality.penalty) : Math.max(0, 0.5 - quality.penalty);
    return {
      name: tool.name,
      description: tool.description,
      destructive: tool.destructive,
      readLike: tool.readLike,
      requiredArguments: tool.required,
      schemaFields: tool.properties,
      matchedIntentCount,
      bestIntentScore: Number(best.toFixed(3)),
      selectionScore: Number(selectionScore.toFixed(3)),
      qualityWarnings: quality.reasons,
      intentMatches: intents.map((x) => ({ intent: x.intent, score: Number(x.score.toFixed(3)), matchedTerms: x.matchedTerms })),
    };
  });

  const selected = new Set();
  const taskCoverage = [];
  if (taskIntents.length) {
    for (const intent of taskIntents) {
      const ranked = perTool
        .map((t) => ({ tool: t, match: t.intentMatches.find((x) => x.intent === intent) }))
        .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0) || b.tool.selectionScore - a.tool.selectionScore);
      const winner = ranked[0];
      const covered = Boolean(winner && (winner.match?.score ?? 0) >= minIntentScore);
      if (covered) selected.add(winner.tool.name);
      taskCoverage.push({
        intent,
        covered,
        bestTool: winner?.tool?.name ?? null,
        bestScore: Number((winner?.match?.score ?? 0).toFixed(3)),
        matchedTerms: winner?.match?.matchedTerms ?? [],
      });
    }
  }

  const rankedOverall = [...perTool].sort((a, b) => b.selectionScore - a.selectionScore || b.matchedIntentCount - a.matchedIntentCount || a.name.localeCompare(b.name));
  for (const tool of rankedOverall) {
    if (selected.size >= maxTools) break;
    if (!taskIntents.length || tool.matchedIntentCount > 0) selected.add(tool.name);
  }
  if (selected.size > maxTools) {
    const keepRank = new Map(rankedOverall.map((x, i) => [x.name, i]));
    const trimmed = [...selected].sort((a, b) => (keepRank.get(a) ?? 9999) - (keepRank.get(b) ?? 9999)).slice(0, maxTools);
    selected.clear();
    for (const name of trimmed) selected.add(name);
  }

  const selectedTools = rankedOverall.filter((x) => selected.has(x.name));
  const droppedTools = rankedOverall.filter((x) => !selected.has(x.name)).map((x) => ({
    name: x.name,
    reason: taskIntents.length
      ? (x.matchedIntentCount === 0 ? 'No stated task intent crossed the evidence threshold.' : 'Lower marginal coverage than selected tools under maxTools.')
      : 'Outside the size cap after deterministic quality/distinctiveness ranking; provide taskIntents for evidence-based pruning.',
    selectionScore: x.selectionScore,
  }));
  const uncoveredIntents = taskCoverage.filter((x) => !x.covered).map((x) => x.intent);
  const selectedPairNames = new Set(selectedTools.map((x) => x.name));
  const selectedConfusions = pairs.filter((x) => selectedPairNames.has(x.a) && selectedPairNames.has(x.b));

  return {
    ok: true,
    inputToolCount: tools.length,
    selectedToolCount: selectedTools.length,
    droppedToolCount: droppedTools.length,
    taskIntentCount: taskIntents.length,
    maxTools,
    minIntentScore,
    coverageComplete: taskIntents.length ? uncoveredIntents.length === 0 : null,
    uncoveredIntents,
    selectedTools,
    droppedTools,
    taskCoverage,
    confusedPairs: pairs,
    selectedConfusedPairs: selectedConfusions,
    recommendation: uncoveredIntents.length
      ? 'Do not treat this shortlist as sufficient. One or more stated task intents lack a tool above the configured evidence threshold.'
      : selectedConfusions.length
        ? 'Coverage is preserved, but selected tools still contain ambiguous neighbors. Clarify descriptions/use-when boundaries or expose fewer overlapping tools.'
        : 'Use the selected shortlist as a candidate allowlist, then replay representative agent tasks before removing tools from production.',
    authority: {
      productionRemovalAuthorized: false,
      reason: 'Lexical/schema evidence can identify a candidate shortlist but cannot prove behavioral equivalence. Replay representative tasks before removing production tools.',
    },
    schemaVersion: 1,
  };
}
