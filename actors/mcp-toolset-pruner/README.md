# MCP Toolset Pruner

Reduce a large MCP or AI-agent tool catalog to a smaller **candidate allowlist** for the tasks your agent actually needs to perform.

Agents often see too many tools. That increases context size and can make neighboring tools harder to distinguish. This Actor takes MCP-style tool definitions plus explicit task intents, ranks coverage deterministically, flags confusing neighbors, and returns the smallest shortlist it can justify under your configured cap.

It does **not** call an LLM and it does **not** claim that removing tools is safe without representative replay evidence.

## Best for

- MCP servers with large `tools/list` responses
- AI agents that expose dozens or hundreds of tools
- CI checks before publishing a tool catalog
- reducing tool-selection noise and schema/context overhead
- identifying redundant tools that need clearer `use when / avoid when` boundaries
- creating a candidate tool allowlist before agent evaluation

## What you get

One dataset item containing:

- `selectedTools` — candidate shortlist with per-intent evidence
- `droppedTools` — tools outside the shortlist and why
- `taskCoverage` — best matching tool for each stated intent
- `uncoveredIntents` — tasks for which the catalog does not show enough evidence
- `confusedPairs` — tools with substantially overlapping routing signals
- `selectedConfusedPairs` — ambiguity that remains inside the proposed shortlist
- `recommendation` — the next verification step
- `authority.productionRemovalAuthorized = false` — explicit reminder that lexical/schema evidence is not behavioral equivalence

## Example input

```json
{
  "tools": [
    {
      "name": "search_docs",
      "description": "Search internal documentation by keyword.",
      "inputSchema": {
        "type": "object",
        "properties": { "query": { "type": "string" } },
        "required": ["query"]
      }
    },
    {
      "name": "search_web",
      "description": "Search the public web for current information.",
      "inputSchema": {
        "type": "object",
        "properties": { "query": { "type": "string" } },
        "required": ["query"]
      }
    }
  ],
  "taskIntents": [
    "search internal documentation",
    "search current web information"
  ],
  "maxTools": 12
}
```

You may alternatively pass a raw `toolsJson` string containing a single tool, an array, or a standard `{ "tools": [...] }` response.

## How the pruning works

The Actor normalizes tool names, descriptions, schema properties, and required arguments into routing signals. It then:

1. scores each tool against each stated task intent;
2. preserves the strongest evidenced tool for each covered intent;
3. fills remaining slots with tools that add evidenced coverage;
4. detects overlapping neighboring tools using token/schema similarity;
5. reports uncovered intents rather than pretending the catalog can perform them;
6. returns a **candidate** allowlist for replay, not a production deletion order.

This is deliberately conservative. A tool catalog can look redundant lexically while still containing behaviorally distinct tools.

## Why this is useful for AI agents

A model does not benefit from seeing every possible tool on every turn. Smaller task-relevant toolsets can reduce prompt/schema burden and make tool routing easier, but pruning the wrong tool can destroy capability. This Actor separates those two questions:

- **Which tools look necessary from the declared tasks and schemas?** — deterministic shortlist.
- **Is removing the others actually safe?** — must be answered by replaying representative tasks.

## Pricing

The intended Store pricing is one small pay-per-event charge per successfully emitted toolset audit. The Actor has no external API, browser, proxy, or model dependency, so platform cost stays small and predictable.

## Privacy and permissions

The Actor uses limited permissions. Tool definitions are processed inside the Actor run. It does not call external AI APIs.

## Search phrases this Actor is designed for

MCP tool selection, MCP tool pruning, AI agent tool catalog optimization, reduce MCP tools, tool allowlist, tool routing confusion, tools/list optimizer, agent tool selection accuracy, MCP context reduction.
