import { Actor, log } from 'apify';
import { verifyBatch } from './core.js';

await Actor.init();
try {
  const input=(await Actor.getInput())??{};
  const output=verifyBatch(input);
  const charging=Actor.getChargingManager();
  const pricing=charging.getPricingInfo();
  const hasEvent=Boolean(pricing?.perEventPrices?.['comparison-verified']);
  let charged=0;
  for(const row of output.results){
    if(pricing.isPayPerEvent&&hasEvent){const r=await Actor.pushData(row,'comparison-verified');charged+=Number(r?.chargedCount??0);} else await Actor.pushData(row);
  }
  await Actor.setValue('OUTPUT',{...output,chargedComparisons:charged,pricingModel:pricing.isPayPerEvent?'pay_per_event':'platform_or_unmonetized'});
  log.info('Counterfactual Agent Verifier complete',{comparisons:output.comparisonCount,regressions:output.regressionCount,candidates:output.candidateImprovementCount,replaySetPass:output.replaySetPass,charged});
} finally { await Actor.exit(); }
