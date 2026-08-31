const API='https://api.apify.com/v2';
const token=process.env.APIFY_TOKEN;
if(!token) throw new Error('APIFY_TOKEN missing');
const headers={'content-type':'application/json','accept':'application/json','authorization':`Bearer ${token}`};

const tasks=[
  {
    actId:'BKGUeMqIiFcaELH8d', name:'find-waste-in-ai-agent-trace', title:'Find waste in an AI agent trace',
    description:'Inspect an AI-agent execution trace for repeated transformations, expensive context, model switching, errors, and human-boundary pressure without inventing savings.',
    seoTitle:'Find Waste in an AI Agent Trace',
    seoDescription:'Audit an AI-agent trace for repeated work, token-heavy calls, model switches, errors, and human interruptions before changing the workflow.',
    fields:['traces','highInputTokenThreshold'],
    input:{traces:[{traceId:'example-agent-run',spans:[{name:'llm.plan',attributes:{'gen_ai.request.model':'frontier-model','gen_ai.usage.input_tokens':14000,'gen_ai.usage.output_tokens':800}},{name:'tool:search',tool_name:'search',tool_input:{q:'current docs'},statusCode:'OK'},{name:'tool:search',tool_name:'search',tool_input:{q:'current docs'},statusCode:'OK'}]}],highInputTokenThreshold:10000}
  },
  {
    actId:'BKGUeMqIiFcaELH8d', name:'audit-agent-human-interruptions', title:'Audit human interruptions in an AI agent',
    description:'Check a trace for approval, review, handoff, and other human-boundary events alongside the surrounding agent work.',
    seoTitle:'Audit Human Interruptions in an AI Agent',
    seoDescription:'Find approval, review, handoff, and human-interruption pressure in an AI-agent trace before redesigning the workflow.',
    fields:['traces'],
    input:{traces:[{traceId:'human-boundary-example',spans:[{name:'agent.plan',statusCode:'OK'},{name:'human_approval_required',statusCode:'OK'},{name:'tool:deploy',tool_name:'deploy',tool_input:{target:'staging'},statusCode:'OK'}]}]}
  },
  {
    actId:'negCd0HzBapwGxr7U', name:'reduce-mcp-tools-without-losing-coverage', title:'Reduce MCP tools without losing task coverage',
    description:'Generate a smaller candidate MCP tool allowlist while keeping uncovered task intents and routing-confusion warnings visible.',
    seoTitle:'Reduce MCP Tools Without Losing Task Coverage',
    seoDescription:'Prune a large MCP tool catalog into a smaller candidate allowlist while preserving required task coverage and exposing routing confusion.',
    fields:['tools','taskIntents','maxTools'],
    input:{tools:[{name:'search_docs',description:'Search internal documentation by keyword.'},{name:'find_documents',description:'Find internal documents matching a query.'},{name:'search_web',description:'Search the current public web.'},{name:'delete_document',description:'Delete a document after explicit approval.'}],taskIntents:['search internal documentation','search current web information'],maxTools:3}
  },
  {
    actId:'negCd0HzBapwGxr7U', name:'find-confusing-mcp-tools', title:'Find confusing or overlapping MCP tools',
    description:'Identify MCP tools with overlapping routing signals before they cause unnecessary tool-choice ambiguity.',
    seoTitle:'Find Confusing or Overlapping MCP Tools',
    seoDescription:'Detect overlapping MCP tool descriptions and generate a smaller candidate toolset without pretending ambiguity is already solved.',
    fields:['tools','taskIntents','confusionThreshold'],
    input:{tools:[{name:'search_docs',description:'Search company documentation for an answer.'},{name:'find_docs',description:'Find company documents matching a query.'},{name:'web_search',description:'Search the public web for current information.'}],taskIntents:['find internal documentation','search current web information'],confusionThreshold:0.55}
  },
  {
    actId:'7KeQJObJ5eqj6Crm5', name:'detect-identical-agent-retries', title:'Detect identical retries after AI-agent failures',
    description:'Find repeated failed tool calls where an agent retries the same input without an observed state change.',
    seoTitle:'Detect Identical AI Agent Retry Loops',
    seoDescription:'Find same-input retries after tool failures and generate a bounded replay experiment instead of assuming a retry-policy fix will save money.',
    fields:['traces','repeatThreshold'],
    input:{traces:[{traceId:'identical-retry',spans:[{name:'tool:search',tool_name:'search',tool_input:{q:'alpha'},statusCode:'ERROR'},{name:'tool:search',tool_name:'search',tool_input:{q:'alpha'},statusCode:'ERROR'},{name:'tool:search',tool_name:'search',tool_input:{q:'alpha revised'},statusCode:'OK'}]}],repeatThreshold:2}
  },
  {
    actId:'7KeQJObJ5eqj6Crm5', name:'find-repeated-agent-tool-failures', title:'Find repeated tool failures in an AI agent trace',
    description:'Cluster repeated failure signatures, error streaks, terminal failures, and recovery transitions in an AI-agent trace.',
    seoTitle:'Find Repeated AI Agent Tool Failures',
    seoDescription:'Audit an AI-agent trace for repeated tool failures, error streaks, terminal failure, and recovery evidence without false savings claims.',
    fields:['traces','repeatThreshold'],
    input:{traces:[{traceId:'failure-cluster',spans:[{name:'tool:api',tool_name:'api',tool_input:{id:1},statusCode:'ERROR'},{name:'tool:api',tool_name:'api',tool_input:{id:2},statusCode:'ERROR'},{name:'tool:fallback',tool_name:'fallback',tool_input:{id:2},statusCode:'OK'}]}],repeatThreshold:2}
  },
  {
    actId:'q31WQSvCAJd9rPQ2q', name:'verify-cheaper-agent-configuration', title:'Verify a cheaper AI-agent configuration',
    description:'Compare matched baseline and challenger runs so lower cost, latency, or token use cannot hide a terminal or protected-quality regression.',
    seoTitle:'Verify a Cheaper AI Agent Configuration',
    seoDescription:'Compare baseline and cheaper challenger agent runs on matched work. Reject savings when terminal success or protected quality regresses.',
    fields:['comparisons','qualityTolerance','representativeWorkload'],
    input:{comparisons:[{caseId:'same-task',baseline:{terminalSuccess:true,quality:0.9,costUsd:0.05,latencyMs:1200,inputTokens:6000},challenger:{terminalSuccess:true,quality:0.9,costUsd:0.02,latencyMs:850,inputTokens:3200},protectedMetrics:[{name:'accuracy',direction:'higher',baseline:0.95,challenger:0.95,tolerance:0.01}]}],qualityTolerance:0,representativeWorkload:false}
  },
  {
    actId:'q31WQSvCAJd9rPQ2q', name:'catch-agent-optimization-regression', title:'Catch an AI-agent optimization regression',
    description:'Test a challenger that looks cheaper but may fail the task or regress a protected metric before treating it as an improvement.',
    seoTitle:'Catch an AI Agent Optimization Regression',
    seoDescription:'Run a matched baseline/challenger check that vetoes cheaper AI-agent configurations when terminal success or protected outcomes regress.',
    fields:['comparisons','qualityTolerance'],
    input:{comparisons:[{caseId:'cheaper-but-broken',baseline:{terminalSuccess:true,quality:0.9,costUsd:0.05},challenger:{terminalSuccess:false,quality:0.9,costUsd:0.01}}],qualityTolerance:0}
  }
];

async function req(path, options={}){
  const r=await fetch(`${API}${path}`,{...options,headers:{...headers,...options.headers}});
  const text=await r.text();
  if(!r.ok) throw new Error(`${options.method??'GET'} ${path} ${r.status}: ${text}`);
  return text?JSON.parse(text):{};
}

const listed=await req('/actor-tasks?limit=1000');
const existing=listed?.data?.items??[];
const out=[];
for(const spec of tasks){
  let task=existing.find(x=>x.name===spec.name);
  if(!task){
    const created=await req('/actor-tasks',{method:'POST',body:JSON.stringify({actId:spec.actId,name:spec.name,title:spec.title,description:spec.description,input:spec.input})});
    task=created?.data;
  } else {
    await req(`/actor-tasks/${task.id}/input`,{method:'PUT',body:JSON.stringify(spec.input)});
  }
  const updated=await req(`/actor-tasks/${task.id}`,{method:'PUT',body:JSON.stringify({title:spec.title,description:spec.description,isPublic:true,publicConfig:{seoTitle:spec.seoTitle,seoDescription:spec.seoDescription,inputSchemaFields:spec.fields,datasetView:'overview'}})});
  const t=updated?.data;
  out.push({id:t?.id,name:t?.name,actorId:t?.actId,isPublic:t?.isPublic,publishedAt:t?.publicConfig?.publishedAt??null,seoTitle:t?.publicConfig?.seoTitle??null,datasetView:t?.publicConfig?.datasetView??null});
}
console.log(JSON.stringify({published:out.length,tasks:out,authority:'distribution_surface_expansion_only',epistemicBoundary:'Published example tasks increase machine-readable discovery surfaces. They do not prove independent agent selection, usefulness, return use, or economic value.'},null,2));