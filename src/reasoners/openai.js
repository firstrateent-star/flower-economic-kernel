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
  if (operation !== 'EXECUTE_EXPERIMENT') return null;
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
    const body = {
      model: this.model,
      instructions,
      reasoning: { effort: this.reasoningEffort },
      max_output_tokens: this.maxOutputTokens,
      input: `OPERATION: ${operation}\nTARGET: ${JSON.stringify(target ?? null)}\nSOIL: ${JSON.stringify(garden.soil)}\nFRUIT: ${JSON.stringify(garden.fruits)}\n\n${prompt}`,
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
