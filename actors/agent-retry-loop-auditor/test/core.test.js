import test from 'node:test';
import assert from 'node:assert/strict';
import { auditInput } from '../src/core.js';

test('detects an immediate identical retry after failure',()=>{
 const [r]=auditInput({traces:[{traceId:'t1',spans:[{name:'tool:search',tool_name:'search',tool_input:{q:'x'},statusCode:'ERROR'},{name:'tool:search',tool_name:'search',tool_input:{q:'x'},statusCode:'ERROR'},{name:'tool:search',tool_name:'search',tool_input:{q:'y'},statusCode:'OK'}]}]});
 assert.equal(r.exactImmediateRetries,1);assert.equal(r.repeatedFailureSignatureCount,1);assert.equal(r.longestErrorStreak,2);assert.equal(r.terminalFailure,false);assert.equal(r.authority.retryPolicyChangeAuthorized,false);
});

test('does not manufacture headroom on a clean trace',()=>{
 const [r]=auditInput({traces:[{traceId:'clean',spans:[{name:'tool:get',tool_name:'get',tool_input:{id:1},statusCode:'OK'}]}]});
 assert.equal(r.errorEventCount,0);assert.equal(r.headroomDetected,false);assert.deepEqual(r.hypotheses,[]);
});

test('marks an unresolved terminal failure',()=>{
 const [r]=auditInput({traces:[{traceId:'terminal',spans:[{name:'tool:run',tool_name:'run',tool_input:{id:1},statusCode:'ERROR'}]}]});
 assert.equal(r.terminalFailure,true);assert.ok(r.hypotheses.some(x=>x.id==='terminal_failure'));
});

test('groups flat spans by trace id',()=>{
 const r=auditInput({spans:[{traceId:'a',name:'tool:x',tool_name:'x',tool_input:1,statusCode:'ERROR'},{traceId:'b',name:'tool:y',tool_name:'y',tool_input:2,statusCode:'OK'}]});
 assert.equal(r.length,2);
});
