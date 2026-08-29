# Flower Economic Kernel v0 — PRIVATE

> **Do not make this repository public before the IP/patent/trade-secret decision is revisited.**

Flower v0 is a deliberately small experiment in event-driven economic reproduction.

## Root

Increase the human Center-holder's sovereign capacity by cultivating low-maintenance economic Fruit whose accumulated money, knowledge, infrastructure, and distribution lower the cost of producing subsequent Fruit.

## What v0 actually tests

It does **not** try to be a universal Flower system. It tests whether a persistent Economic Garden can:

1. wake from its own unresolved pressure;
2. falsify weak opportunities before building;
3. preserve accountable evidence and failure ancestry;
4. route consequential actions through an autonomy membrane;
5. carry forward existing Fruit/Soil into the next generation;
6. reduce human steering over successive Fruit generations.

The initial Garden includes Google Maps Exact Match Guard as existing Fruit and Google Maps Business → Website Identity Guard as a weak seed that must earn survival.

## Local commands

```bash
npm install
cp .env.example .env
# put OPENAI_API_KEY in your shell/.env loader of choice
npm run status
npm test
npm run pulse
```

`pulse` calls the OpenAI Responses API and can use its web-search tool. The default cognition substrate is `gpt-5.6-terra` for a quality/cost balance; model selection remains configurable through `FLOWER_MODEL`. The integration uses the Responses API with optional built-in web search.

## Endogenous pulse

The kernel routes the current Garden state in this order:

- pending consequential action → HUMAN
- new reality event → INTEGRATE
- untested seed → FALSIFY
- supported seed needing reality → EXPERIMENT
- validated seed → BUILD_PLAN
- no living seed → EXPAND
- otherwise → STILLNESS

This is intentionally primitive. We want reality to tell us what routing rules are missing.

## Safety / sovereignty

v0 is hard-oriented around reversibility. It has no wallet, no ability to sign contracts, no permission to impersonate the human Center-holder, and no autonomous public-deployment authority.

## Apify

`src/runtime/apify-main.js` is the private Actor entry point. It persists Garden state in the Actor key-value store under `FLOWER_GARDEN`. A real private Actor can be wired after the repository is placed in a private Git host / private Apify environment.

## Success

See `docs/REPRODUCTION_TEST.md`.

The important metric is not how many apps Flower makes. It is whether later viable Fruit inherits enough from earlier Fruit that human/capital/uncertainty cost declines.
