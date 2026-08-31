import { auditInput } from '../actors/agent-retry-loop-auditor/src/core.js';

const SOURCE_URL='https://raw.githubusercontent.com/pagarsky/agent-trace/main/datasets/nl2bash_0_6B_20260328T133144Z.jsonl';
const response=await fetch(SOURCE_URL);if(!response.ok)throw new Error(`AgentTrace fetch failed: ${response.status}`);
const traces=(await response.text()).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const audits=auditInput({traces,maxItems:1000,repeatThreshold:2});
const result={
 source:{repository:'pagarsky/agent-trace',dataset:'nl2bash_0_6B_20260328T133144Z.jsonl',url:SOURCE_URL,license:'Apache-2.0'},
 traceCount:audits.length,
 tracesWithAnyErrors:audits.filter(x=>x.errorEventCount>0).length,
 tracesWithFailurePressure:audits.filter(x=>x.headroomDetected).length,
 tracesWithExactImmediateRetries:audits.filter(x=>x.exactImmediateRetries>0).length,
 tracesWithRepeatedFailureSignatures:audits.filter(x=>x.repeatedFailureSignatureCount>0).length,
 terminalFailureTraces:audits.filter(x=>x.terminalFailure).length,
 cleanNoHeadroomTraces:audits.filter(x=>!x.headroomDetected).length,
 totalErrorEvents:audits.reduce((s,x)=>s+x.errorEventCount,0),
 totalExactImmediateRetries:audits.reduce((s,x)=>s+x.exactImmediateRetries,0),
 maxFailureStreak:audits.reduce((m,x)=>Math.max(m,x.longestErrorStreak),0),
 falseSavingsClaimCount:audits.filter(x=>(x.hypotheses??[]).some(h=>h.savingsVerified!==false)).length,
 authorityRegressionCount:audits.filter(x=>x.authority?.retryPolicyChangeAuthorized!==false).length,
 examples:{firstExactRetry:audits.find(x=>x.exactImmediateRetries>0)??null,firstTerminalFailure:audits.find(x=>x.terminalFailure)??null,firstCleanTrace:audits.find(x=>!x.headroomDetected)??null}
};
if(result.traceCount!==traces.length)throw new Error('Trace count mismatch');
if(result.falseSavingsClaimCount!==0)throw new Error('Unverified savings regression');
if(result.authorityRegressionCount!==0)throw new Error('Authority regression');
console.log(JSON.stringify(result,null,2));
