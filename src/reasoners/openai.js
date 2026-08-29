function extractText(response) {
  const chunks = [];
  for (const item of response?.output ?? []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content?.type === 'output_text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function extractSources(response) {
  const sources = [];
  for (const item of response?.output ?? []) {
    if (item?.type !== 'web_search_call') continue;
    for (const source of item?.action?.sources ?? []) {
      if (!source?.url) continue;
      sources.push({ title: source.title ?? null, url: source.url });
    }
  }
  return [...new Map(sources.map((s) => [s.url, s])).values()];
}

function parseJsonLoose(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error(`Reasoner returned non-JSON output: ${cleaned.slice(0, 240)}`);
  }
}

function evidenceItemSchema() {
  return {
    type: 'object',
    properties: {
      url: { type: 'string' },
      claim: { type: 'string', maxLength: 320 },
    },
    required: ['url', 'claim'],
    additionalProperties: false,
  };
}

function structuredFormatFor(operation) {
  if (operation === 'EXPAND') {
    return {
      type: 'json_schema',
      name: 'flower_evidence_bearing_expansion',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          candidates: {
            type: 'array',
            minItems: 0,
            maxItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                thesis: { type: 'string' },
                moneyFlow: { type: 'string' },
                buyer: { type: 'string' },
                nutrientChannel: { type: 'string' },
                passivity: { type: 'string' },
                autonomyCompatibility: { type: 'string' },
                reproductivePotential: { type: 'string' },
                realityAccess: { type: 'string' },
                cheapestRealityTest: { type: 'string' },
                inheritedInfrastructure: { type: 'string' },
                whyNow: { type: 'string' },
                failureArchetype: { type: 'string' },
                reusableCapability: { type: 'string' },
                resolutionPrimitive: { type: 'string' },
                geometryReuse: { type: 'string' },
                failureEvidence: {
                  type: 'array',
                  minItems: 0,
                  maxItems: 4,
                  items: evidenceItemSchema(),
                },
                buyerEvidence: {
                  type: 'array',
                  minItems: 0,
                  maxItems: 4,
                  items: evidenceItemSchema(),
                },
              },
              required: [
                'name', 'thesis', 'moneyFlow', 'buyer', 'nutrientChannel', 'passivity',
                'autonomyCompatibility', 'reproductivePotential', 'realityAccess',
                'cheapestRealityTest', 'inheritedInfrastructure', 'whyNow',
                'failureArchetype', 'reusableCapability', 'resolutionPrimitive',
                'geometryReuse', 'failureEvidence', 'buyerEvidence',
              ],
              additionalProperties: false,
            },
          },
        },
        required: ['candidates'],
        additionalProperties: false,
      },
    };
  }

  if (operation === 'FALSIFY') {
    return {
      type: 'json_schema',
      name: 'flower_seed_falsification',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          verdict: {
            type: 'string',
            enum: ['compost', 'continue', 'needs_test'],
          },
          rationale: { type: 'string' },
          evidence: {
            type: 'array',
            maxItems: 4,
            items: { type: 'string' },
          },
          counterEvidence: {
            type: 'array',
            maxItems: 4,
            items: { type: 'string' },
          },
          cheapestFalsifier: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              action: { type: 'string' },
              estimatedCostUsd: { type: 'number' },
            },
            required: ['question', 'action', 'estimatedCostUsd'],
            additionalProperties: false,
          },
          principles: {
            type: 'array',
            maxItems: 3,
            items: { type: 'string' },
          },
        },
        required: ['verdict', 'rationale', 'evidence', 'counterEvidence', 'cheapestFalsifier', 'principles'],
        additionalProperties: false,
      },
    };
  }

  if (operation === 'SELECT') {
    return {
      type: 'json_schema',
      name: 'flower_sibling_selection',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          chosenOpportunityId: { type: 'string' },
          rationale: { type: 'string', maxLength: 500 },
        },
        required: ['chosenOpportunityId', 'rationale'],
        additionalProperties: false,
      },
    };
  }

  if (operation === 'EXPERIMENT') {
    return {
      type: 'json_schema',
      name: 'flower_experiment_design',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          experiment: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              tests: { type: 'string' },
              actionType: {
                type: 'string',
                enum: ['observe', 'web_search', 'create_private', 'sandbox', 'spend', 'public_deploy', 'human_contact'],
              },
              oneTimeCostUsd: { type: 'number' },
              recurringUsd: { type: 'number' },
              successCondition: { type: 'string' },
              killCondition: { type: 'string' },
              validationDimension: {
                type: 'string',
                enum: ['failure_reality', 'buyer_demand', 'distribution_access', 'resolution_complexity', 'willingness_to_pay'],
              },
            },
            required: [
              'name', 'tests', 'actionType', 'oneTimeCostUsd', 'recurringUsd',
              'successCondition', 'killCondition', 'validationDimension',
            ],
            additionalProperties: false,
          },
        },
        required: ['experiment'],
        additionalProperties: false,
      },
    };
  }

  if (operation === 'EXECUTE_EXPERIMENT') {
    return {
      type: 'json_schema',
      name: 'flower_experiment_result',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          verdict: {
            type: 'string',
            enum: ['supports', 'weakens', 'inconclusive'],
          },
          finding: { type: 'string' },
          observations: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['verdict', 'finding', 'observations'],
        additionalProperties: false,
      },
    };
  }

  return null;
}

export class OpenAIReasoner {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.FLOWER_MODEL || 'gpt-5.6-luna',
    enableWebSearch = process.env.FLOWER_ENABLE_WEB_SEARCH === 'true',
    reasoningEffort = process.env.FLOWER_REASONING_EFFORT || 'low',
    maxOutputTokens = Number(process.env.FLOWER_MAX_OUTPUT_TOKENS || 1200),
  } = {}) {
    if (!apiKey) throw new Error('OPENAI_API_KEY is required for OpenAIReasoner.');
    this.apiKey = apiKey;
    this.model = model;
    this.enableWebSearch = enableWebSearch;
    this.reasoningEffort = reasoningEffort;
    this.maxOutputTokens = maxOutputTokens;
  }

  async reason({ operation, garden, target, prompt, allowWebSearch = false }) {
    const instructions = `You are the cognition substrate inside Flower Economic Kernel v0.\n\nROOT: ${garden.center.rootGoal}\nDIRECTION: ${garden.center.direction}\n\nYou do not decide values or permissions. You create candidate reasoning only. Preserve uncertainty. Prefer falsification over enthusiasm. The economic target is low-maintenance, machine-mediated income with passive discoverability and reproductive inheritance. Sacred-geometry language is a functional design metaphor for centers, overlaps, and reusable relationships; it is never evidence by itself. Never claim economic validation without accountable external evidence. Return ONLY valid JSON.`;

    const useWebSearch = this.enableWebSearch || allowWebSearch === true;
    const structuredFormat = structuredFormatFor(operation);
    let boundedPrompt = prompt;

    if (operation === 'EXPAND') {
      const inactiveHistory = (garden.opportunities ?? [])
        .filter((x) => ['dormant', 'compost', 'measurement_blocked'].includes(x.status))
        .map((x) => ({
          name: x.name,
          thesis: x.thesis,
          status: x.status,
          archetype: x.failureArchetype ?? null,
          failedBecause: x.failedBecause ?? x.measurementBlockedReason ?? x.epistemicNote ?? null,
        }));
      const scoutMisses = (garden.scoutMisses ?? []).slice(-8);
      const geometry = garden.geometry ? {
        stage: garden.geometry.stage,
        metrics: garden.geometry.metrics,
        reusableArchetypes: (garden.geometry.archetypes ?? []).filter((x) => x.reuseCount > 1).slice(0, 8),
        reusableCapabilities: (garden.geometry.capabilities ?? []).filter((x) => x.reuseCount > 1).slice(0, 8),
        recentCenters: (garden.geometry.centers ?? []).slice(-8).map((x) => ({
          name: x.name,
          status: x.status,
          archetype: x.archetype,
          reusableCapability: x.reusableCapability,
        })),
      } : null;

      boundedPrompt = `${prompt}\n\nEVIDENCE-BEARING GEOMETRY RULES:\n- Return ZERO candidates when current public evidence does not justify a real center. Never invent a candidate merely to fill the schema.\n- Return at most ONE candidate. The expensive frontier should maximize information density, not branch count.\n- Search failure reality first. A candidate is admissible only when failureEvidence contains at least 3 exact consulted URLs across at least 2 independent hosts documenting concrete real-world cases of the specific failure. Generic risk articles do not count.\n- Map provenance explicitly: failureEvidence contains only sources supporting failure reality; buyerEvidence contains only sources supporting concrete buyer/action or paid-market demand. A source may appear in both only when it genuinely supports both claims.\n- Every evidence URL must be an exact URL actually consulted in this web-search response. Do not invent URLs and do not cite a source you did not inspect.\n- Buyer evidence is harvested opportunistically in the SAME frontier. If it is strong, Flower may avoid a later buyer-demand search. If it is weak, leave buyerEvidence sparse or empty rather than overstating it.\n- Name a cross-domain failureArchetype, the reusableCapability or sensor/algorithm this branch could leave behind, the smallest resolutionPrimitive, and geometryReuse: how this center overlaps existing geometry or why a genuinely novel center is worth the cost.\n- Prefer overlap that lowers future testing/build cost, but do not force a cosmetic variant merely to reuse an old pattern. Reuse must be functional.\n- CURRENT GENERIC EXECUTOR: public web_search. Branch-specific sensors do not automatically generalize. Reject candidates whose decisive reality requires private data, authentication, arbitrary HTTP/API enumeration, GitHub/package-registry access, DNS, scraping, or another unavailable executor.\n- Prefer existing machine/buyer nutrient channels with metered or self-serve payment and automatic fulfillment.\n- Penalize consulting, cold outreach, physical fulfillment, procurement watches, speculative trading/gambling, regulated/gray-market activity, identity use, contracts, recurring obligations, and continuing human labor.\n- The Fruit-of-Life/Metatron metaphor guides graph reuse; it does not lower evidence thresholds.\nINACTIVE HISTORY: ${JSON.stringify(inactiveHistory)}\nRECENT SCOUT MISSES: ${JSON.stringify(scoutMisses)}\nCURRENT GEOMETRY: ${JSON.stringify(geometry)}\nOUTPUT BUDGET: No prose outside the schema. Keep descriptive fields compact and evidence claims specific.`;
    } else if (operation === 'FALSIFY') {
      boundedPrompt = `${prompt}\nCURRENT V0 EXECUTORS: generic autonomous experiment execution is public web_search only; branch-specific sensors are not generic capabilities. Do not call DNS/API/package/GitHub/direct sampling cheap or immediately available unless a real executor exists. If the cheapest falsifier requires missing capability, say so explicitly in the action.\nOUTPUT BUDGET: Keep rationale concise. Return at most 4 short evidence items, 4 short counter-evidence items, and 3 principles. Do not invent external evidence; without retrieved sources, economic claims remain hypotheses.`;
    } else if (operation === 'SELECT') {
      boundedPrompt = `${prompt}\nSELECTION RULE: Choose exactly one supplied opportunity ID. Do not claim new evidence. Prefer the sibling with the best combination of passive distribution, executable cheap falsifiability, autonomy compatibility, resolution value, and reusable inheritance. CURRENT generic v0 executor is public web_search; branch-specific sensors do not generalize automatically. Penalize broad targets, inaccessible evidence, and continuing human labor. Keep rationale under 500 characters.`;
    } else if (operation === 'EXECUTE_EXPERIMENT') {
      boundedPrompt = `${prompt}\nOUTPUT BUDGET: Keep finding under 500 characters. Return at most 4 observations, each under 220 characters. Do not place source URLs in observations; sources are captured separately by the API.`;
    }

    const operationMaxOutputTokens = operation === 'EXPAND'
      ? Math.max(this.maxOutputTokens, 2200)
      : this.maxOutputTokens;

    const body = {
      model: this.model,
      instructions,
      reasoning: { effort: this.reasoningEffort },
      max_output_tokens: operationMaxOutputTokens,
      input: `OPERATION: ${operation}\nTARGET: ${JSON.stringify(target ?? null)}\nSOIL: ${JSON.stringify(garden.soil)}\nFRUIT: ${JSON.stringify(garden.fruits)}\nGEOMETRY: ${JSON.stringify(garden.geometry ?? null)}\n\n${boundedPrompt}`,
      ...(structuredFormat ? { text: { format: structuredFormat } } : {}),
      ...(useWebSearch ? {
        tools: [{ type: 'web_search_preview', search_context_size: 'low' }],
        include: ['web_search_call.action.sources'],
      } : {}),
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`OpenAI Responses API ${response.status}: ${await response.text()}`);

    const raw = await response.json();
    if (raw.status !== 'completed') {
      throw new Error(`OpenAI response did not complete: status=${raw.status}; details=${JSON.stringify(raw.incomplete_details ?? raw.error ?? null)}`);
    }

    const text = extractText(raw);
    return {
      data: parseJsonLoose(text),
      sources: extractSources(raw),
      rawId: raw.id ?? null,
      usage: raw.usage ?? null,
    };
  }
}
