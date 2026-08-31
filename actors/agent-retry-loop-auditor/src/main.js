import { Actor, log } from 'apify';
import { auditInput } from './core.js';

await Actor.init();
try {
  const input=(await Actor.getInput())??{};
  const results=auditInput(input);
  const charging=Actor.getChargingManager();
  const pricing=charging.getPricingInfo();
  const hasEvent=Boolean(pricing?.perEventPrices?.['retry-audited']);
  let charged=0;
  for(const row of results){
    if(pricing.isPayPerEvent&&hasEvent){const r=await Actor.pushData(row,'retry-audited');charged+=Number(r?.chargedCount??0);}else await Actor.pushData(row);
  }
  const output={ok:true,tracesAudited:results.length,tracesWithFailurePressure:results.filter(x=>x.headroomDetected).length,totalErrorEvents:results.reduce((s,x)=>s+x.errorEventCount,0),totalExactImmediateRetries:results.reduce((s,x)=>s+x.exactImmediateRetries,0),terminalFailures:results.filter(x=>x.terminalFailure).length,chargedAudits:charged,pricingModel:pricing.isPayPerEvent?'pay_per_event':'platform_or_unmonetized',schemaVersion:1};
  await Actor.setValue('OUTPUT',output);log.info('Agent Retry Loop Auditor complete',output);
} finally { await Actor.exit(); }
