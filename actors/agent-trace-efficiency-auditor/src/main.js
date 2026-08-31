import { Actor, log } from 'apify';
import { auditInput } from './core.js';

async function runActor() {
  const input = (await Actor.getInput()) ?? {};
  const results = auditInput(input);
  const chargingManager = Actor.getChargingManager();
  const pricingInfo = chargingManager.getPricingInfo();
  const hasTraceEvent = Boolean(pricingInfo?.perEventPrices?.['trace-audited']);
  let emitted = 0;
  let charged = 0;
  let chargeLimitReached = false;

  for (const result of results) {
    if (pricingInfo.isPayPerEvent && hasTraceEvent) {
      const chargeResult = await Actor.pushData(result, 'trace-audited');
      emitted += 1;
      charged += Number(chargeResult?.chargedCount ?? 0);
      if (chargeResult?.eventChargeLimitReached) {
        chargeLimitReached = true;
        break;
      }
    } else {
      await Actor.pushData(result);
      emitted += 1;
    }
  }

  const aggregate = {
    ok: true,
    requestedTraceGroups: results.length,
    emittedTraceAudits: emitted,
    chargedTraceAudits: charged,
    chargeLimitReached,
    pricingModel: pricingInfo.isPayPerEvent ? 'pay_per_event' : 'platform_or_unmonetized',
    chargeEventConfigured: hasTraceEvent,
    totalModelCallSpans: results.slice(0, emitted).reduce((sum, r) => sum + r.modelCallSpans, 0),
    totalToolCallSpans: results.slice(0, emitted).reduce((sum, r) => sum + r.toolCallSpans, 0),
    totalInputTokensObserved: results.slice(0, emitted).reduce((sum, r) => sum + r.totalInputTokens, 0),
    totalOutputTokensObserved: results.slice(0, emitted).reduce((sum, r) => sum + r.totalOutputTokens, 0),
    totalErrorSpans: results.slice(0, emitted).reduce((sum, r) => sum + r.errorSpans, 0),
    totalHumanBoundarySpans: results.slice(0, emitted).reduce((sum, r) => sum + r.humanBoundarySpans, 0),
    note: 'Outputs identify optimization experiments from observed trace structure. They do not claim or estimate savings without matched outcome-preserving replay evidence.',
    schemaVersion: 1,
  };

  await Actor.setValue('OUTPUT', aggregate);
  log.info('Agent Trace Efficiency Auditor complete', aggregate);
}

await Actor.init();
try {
  await runActor();
} finally {
  await Actor.exit();
}
