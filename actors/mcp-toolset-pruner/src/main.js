import { Actor, log } from 'apify';
import { pruneToolset } from './core.js';

async function runActor() {
  const input = (await Actor.getInput()) ?? {};
  const result = pruneToolset(input);
  const chargingManager = Actor.getChargingManager();
  const pricingInfo = chargingManager.getPricingInfo();
  const hasEvent = Boolean(pricingInfo?.perEventPrices?.['toolset-pruned']);
  let charged = 0;

  if (pricingInfo.isPayPerEvent && hasEvent) {
    const chargeResult = await Actor.pushData(result, 'toolset-pruned');
    charged = Number(chargeResult?.chargedCount ?? 0);
  } else {
    await Actor.pushData(result);
  }

  const aggregate = {
    ok: true,
    inputToolCount: result.inputToolCount,
    selectedToolCount: result.selectedToolCount,
    droppedToolCount: result.droppedToolCount,
    coverageComplete: result.coverageComplete,
    chargedToolsets: charged,
    pricingModel: pricingInfo.isPayPerEvent ? 'pay_per_event' : 'platform_or_unmonetized',
    chargeEventConfigured: hasEvent,
    note: 'The shortlist is a replay candidate, not authority to remove production tools without representative task evidence.',
    schemaVersion: 1,
  };
  await Actor.setValue('OUTPUT', aggregate);
  log.info('MCP Toolset Pruner complete', aggregate);
}

await Actor.init();
try {
  await runActor();
} finally {
  await Actor.exit();
}
