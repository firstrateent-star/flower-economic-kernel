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

function structuredFormatFor(operation) {
  if (operation === 'EXPAND') {
    return {
      type: 'json_schema',
      name: 'flower_seed_expansion',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          candidates: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
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
              },
              required: [
                'name', 'thesis', 'moneyFlow', 'buyer', 'nutrientChannel', 'passivity',
                'autonomyCompatibility', 'reproductivePotential', 'realityAccess',
                'cheapestRealityTest', 'inheritedInfrastructure', 'whyNow',
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
    const instructions = `You are the cognition substrate inside Flower Economic Kernel v0.\n\nROOT: ${garden.center.rootGoal}\nDIRECTION: ${garden.center.direction}\n\nYou do not decide values or permissions. You create candidate reasoning only. Preserve uncertainty. Prefer falsification over enthusiasm. The economic target is low-maintenance, machine-mediated income with passive discoverability and reproductive inheritance. Never claim economic validation without external market evidence. Return ONLY valid JSON.`;

    // Global web search remains off by default. A caller may explicitly enable it only
    // after the deterministic autonomy membrane has authorized a web-search experiment.
    const useWebSearch = this.enableWebSearch || allowWebSearch === true;
    const structuredFormat = structuredFormatFor(operation);
    let boundedPrompt = prompt;

    if (operation === 'EXPAND') {
      const dormant = (garden.opportunities ?? [])
        .filter((x) => ['dormant', 'compost'].includes(x.status))
        .map((x) => ({ name: x.name, thesis: x.thesis, failedBecause: x.failedBecause ?? x.epistemicNote ?? null }));
      boundedPrompt = `${prompt}\n\nGENERATION RULES:\n- Return 1-3 candidates in descending order of expected economic usefulness; the first candidate will be tested first.\n- Seeds are hypotheses only. Do not imply evidence or validation.\n- Prefer existing machine/buyer nutrient channels with metered or self-serve payment and automatic fulfillment.\n- Prefer opportunities whose claimed failure or demand can be directly sampled from public or low-cost machine-readable reality; cheap reality access is part of the product thesis, not an afterthought.\n- Prefer a cheapest discriminating test that could kill the seed in one or two breaths for <= $0.50 before any build.\n- Favor inheritance from existing Flower infrastructure, code patterns, marketplace familiarity, or distribution knowledge.\n- Penalize consulting, cold outreach, physical fulfillment, procurement watches, speculative trading/gambling, regulated/gray-market activity, identity use, contracts, recurring obligations, and anything requiring Sean's continuing labor.\n- Do not return a cosmetic variant of an existing Fruit or a dormant/composted branch unless materially new context resolves the reason it failed.\n- Diversity matters: candidates should occupy genuinely different economic mechanisms or nutrient channels when possible.\nDORMANT/COMPOSTED HISTORY: ${JSON.stringify(dormant)}\nKeep every field concise.`;
    } else if (operation === 'EXECUTE_EXPERIMENT') {
      boundedPrompt = `${prompt}\nOUTPUT BUDGET: Keep finding under 500 characters. Return at most 4 observations, each under 220 characters. Do not place source URLs in observations; sources are captured separately by the API.`;
    }

    const body = {
      model: this.model,
      instructions,
      reasoning: { effort: this.reasoningEffort },
      max_output_tokens: this.maxOutputTokens,
      input: `OPERATION: ${operation}\nTARGET: ${JSON.stringify(target ?? null)}\nSOIL: ${JSON.stringify(garden.soil)}\nFRUIT: ${JSON.stringify(garden.fruits)}\n\n${boundedPrompt}`,
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
