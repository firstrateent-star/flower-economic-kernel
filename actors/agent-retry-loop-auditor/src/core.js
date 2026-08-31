import crypto from 'node:crypto';

const TOOL_KEYS=['gen_ai.tool.name','tool.name','tool_name','openinference.tool.name'];
const INPUT_KEYS=['gen_ai.tool.call.arguments','tool.input','tool.arguments','tool_input','openinference.tool.input'];
const TRACE_KEYS=['traceId','trace_id','sessionId','session_id','conversation.id'];

const obj=(v)=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const attrs=(s)=>({...obj(s?.attributes),...obj(s?.attrs),...obj(s?.resource?.attributes)});
function pick(s,keys){for(const k of keys) if(s?.[k]!==undefined&&s?.[k]!==null&&s?.[k]!=='') return s[k]; return null;}
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
function hash(v){let t;try{t=typeof v==='string'?v.trim():JSON.stringify(stable(v));}catch{t=String(v);}return crypto.createHash('sha256').update(t??'').digest('hex').slice(0,16);}
function isError(s,a){const status=String(s?.status?.code??s?.statusCode??a['error.type']??a['exception.type']??'').toLowerCase();const exit=Number(s?.exit_code??s?.exitCode);return status.includes('error')||status.includes('fail')||Boolean(s?.error)||(Number.isFinite(exit)&&exit!==0);}
function toolName(s,a){const e=pick(a,TOOL_KEYS)??s?.tool_name??s?.toolName;if(e)return String(e);const n=String(s?.name??s?.operationName??'');return /tool/i.test(n)?(n.replace(/^.*tool[:.\s/-]*/i,'').trim()||n):null;}
function traceId(s,f){return String(pick(s,TRACE_KEYS)??pick(attrs(s),TRACE_KEYS)??f);}
function llmSpan(step){return {name:`llm_step_${step?.step_number??step?.stepNumber??'unknown'}`,model:step?.model,type:'LLM_STEP',statusCode:step?.status??null,error:step?.error??false};}

export function normalize(input={}){
 const max=Math.max(1,Math.min(Number(input.maxItems??1000),10000));const groups=[];
 for(const [i,t] of (Array.isArray(input.traces)?input.traces:[]).slice(0,max).entries()){
   const direct=Array.isArray(t?.spans)?t.spans:[t];const steps=Array.isArray(t?.llm_steps)?t.llm_steps.map(llmSpan):Array.isArray(t?.llmSteps)?t.llmSteps.map(llmSpan):[];
   groups.push({id:String(t?.traceId??t?.trace_id??t?.sessionId??t?.session_id??`trace-${i+1}`),spans:[...direct,...steps]});
 }
 const flat=Array.isArray(input.spans)?input.spans:[];if(flat.length){const by=new Map();for(const [i,s] of flat.slice(0,max*100).entries()){const id=traceId(s,`flat-${i+1}`);if(!by.has(id))by.set(id,[]);by.get(id).push(s);}for(const [id,spans] of by)groups.push({id,spans});}
 return groups.slice(0,max);
}

function event(s,index){const a=attrs(s);const tool=toolName(s,a);const inp=pick(a,INPUT_KEYS)??s?.toolInput??s?.tool_input??null;return {index,name:String(s?.name??s?.operationName??s?.type??'unnamed'),toolName:tool,inputHash:tool&&inp!==null?hash(inp):null,error:isError(s,a),model:String(s?.model??s?.modelName??a['gen_ai.request.model']??a['gen_ai.response.model']??'')||null};}
function sig(e){return `${e.toolName??e.name}:${e.inputHash??'no-input'}`;}

export function auditTrace(group,{repeatThreshold=2}={}){
 const events=group.spans.map(event);const errors=events.filter(e=>e.error);const failureBySig=new Map();
 for(const e of errors){const k=sig(e);if(!failureBySig.has(k))failureBySig.set(k,[]);failureBySig.get(k).push(e);}
 const repeatedFailureSignatures=[...failureBySig.entries()].filter(([,v])=>v.length>=repeatThreshold).map(([signature,v])=>({signature,count:v.length,toolName:v[0].toolName,firstIndex:v[0].index,lastIndex:v.at(-1).index})).sort((a,b)=>b.count-a.count);
 const exactRetries=[];for(let i=1;i<events.length;i++){const prev=events[i-1],cur=events[i];if(prev.error&&sig(prev)===sig(cur)) exactRetries.push({previousIndex:prev.index,retryIndex:cur.index,signature:sig(cur),retryAlsoFailed:cur.error});}
 let longestErrorStreak=0,current=0;for(const e of events){if(e.error){current++;longestErrorStreak=Math.max(longestErrorStreak,current);}else current=0;}
 const recoveries=[];for(let i=0;i<events.length-1;i++){if(events[i].error&&!events[i+1].error)recoveries.push({failureIndex:i,recoveryIndex:i+1,failureSignature:sig(events[i]),recoveryOperation:events[i+1].toolName??events[i+1].name});}
 const terminalFailure=Boolean(events.length&&events.at(-1).error);
 const hypotheses=[];
 if(exactRetries.length) hypotheses.push({id:'identical_retry_after_failure',evidence:`${exactRetries.length} immediate retry/replay(s) repeated the same operation/input after a failure.`,test:'Replay matched failing cases with a precondition check, classified retry policy, or changed input/backoff. Compare terminal success and total attempts; do not assume identical retry is always wrong.',savingsVerified:false});
 if(repeatedFailureSignatures.length) hypotheses.push({id:'repeated_failure_signature',evidence:`${repeatedFailureSignatures.length} failure signature(s) repeated at least ${repeatThreshold} times.`,test:'Cluster the repeated failures by root cause and test one upstream prevention or recovery policy against the current behavior on the same cases.',savingsVerified:false});
 if(longestErrorStreak>=2) hypotheses.push({id:'failure_streak',evidence:`Longest consecutive failure streak was ${longestErrorStreak}.`,test:'Replay the streak with an explicit retry budget and fail-fast/escalation condition. Preserve successful recoveries and compare terminal outcomes.',savingsVerified:false});
 if(terminalFailure) hypotheses.push({id:'terminal_failure',evidence:'The final observed event is a failure.',test:'Reproduce the terminal case with the smallest input needed, then test whether classification, fallback, or earlier validation can reach a resolved terminal state.',savingsVerified:false});
 return {traceId:group.id,eventCount:events.length,errorEventCount:errors.length,exactImmediateRetries:exactRetries.length,repeatedFailureSignatureCount:repeatedFailureSignatures.length,longestErrorStreak,terminalFailure,recoveryCount:recoveries.length,repeatedFailureSignatures,exactRetries,recoveries,hypotheses,headroomDetected:hypotheses.length>0,authority:{retryPolicyChangeAuthorized:false,reason:'Trace patterns identify candidate failure loops but cannot prove the right recovery policy without replaying representative failing and successful cases.'},schemaVersion:1};
}

export function auditInput(input={}){const cfg={repeatThreshold:Math.max(2,Math.min(Number(input.repeatThreshold??2),20))};return normalize(input).map(g=>auditTrace(g,cfg));}
