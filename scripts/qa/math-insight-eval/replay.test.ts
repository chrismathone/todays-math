/** Replay saved raw provider responses through actual transport/parser/composer. */
import {test,expect,vi} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {buildInsightPrompt,parseInsightSelection,composeInsightResult} from "@/lib/math-insight/inference";
import {runModelApi} from "@/lib/studio-ai/api";
import type {MathInsightSnapshot} from "@/contracts/mathInsight.contract";
interface FrozenCall { id:string;caseId:string;vendor:"anthropic";model:string;endpoint:string;sourcePath:string;requestPath:string; }
interface ReplaySource {snapshot:MathInsightSnapshot;maskedQuery:string;expected:string[];}
const digest=(x:string|Buffer)=>createHash("sha256").update(x).digest("hex");
test.skipIf(process.env.INSIGHT_AUDIT_MODE!=="replay")("saved raw responses retain all holds and pass actual downstream validation",async()=>{
 const root=process.env.INSIGHT_AUDIT_EVIDENCE!,phase=process.env.INSIGHT_AUDIT_PHASE??"pilot-claude-v1";
 const manifest=JSON.parse(fs.readFileSync(path.join(root,phase,"manifest.json"),"utf8")) as {sourceHashes:Record<string,string>;calls:FrozenCall[]};
 const relevant=["src/lib/math-insight/inference.ts","src/lib/math-insight/snapshot.ts","src/lib/studio-ai/api.ts"];
 for(const p of relevant) expect(digest(fs.readFileSync(p)),`exact committed replay source ${p}`).toBe(manifest.sourceHashes[p]);
 vi.stubEnv("ANTHROPIC_API_KEY","offline-replay-never-transmitted");
 const rows:Record<string,unknown>[]=[];
 for(const call of manifest.calls){
  const dir=path.join(root,"attempts",call.id);
  if(!fs.existsSync(path.join(dir,"result.json"))) continue;
  const result=JSON.parse(fs.readFileSync(path.join(dir,"result.json"),"utf8"));
  const source=JSON.parse(fs.readFileSync(path.join(root,call.sourcePath),"utf8")) as ReplaySource;
  const rawPath=path.join(dir,"response.raw.json");
  const row:Record<string,unknown>={id:call.id,caseId:call.caseId,transport:result.status,expected:source.expected};
  if(result.status!=="received"){rows.push({...row,status:"held-before-parser"});continue;}
  const response=fs.readFileSync(rawPath,"utf8");
  expect(digest(response)).toBe(result.responseSha256);
  let requestCount=0;
  vi.stubGlobal("fetch",async(url:unknown,init:RequestInit)=>{
   requestCount++;expect(String(url)).toBe(call.endpoint);
   const frozenBody=JSON.parse(fs.readFileSync(path.join(root,call.requestPath),"utf8"));
   expect(JSON.parse(String(init.body))).toEqual(frozenBody);
   return new Response(response,{status:200,headers:{"content-type":"application/json"}});
  });
  try{
   const text=await runModelApi({vendor:call.vendor,model:call.model,
    prompt:buildInsightPrompt(source.snapshot,source.maskedQuery),signal:new AbortController().signal,
    maxOutputTokens:700,singleAttempt:true,suppressUpstreamDetails:true});
   row.modelText=text;
   const selection=parseInsightSelection(text,source.snapshot);
   const composed=composeInsightResult(source.snapshot,selection,{provider:call.vendor,model:result.actualModel,role:"selection-only"});
   row.status="parsed-and-composed";row.selection=selection;row.composed=composed;
   // Guard success and semantic intent quality are distinct measurements.
   const expectedInsufficient=["empty","plan-no-records","stale","before-plan","unfinished","future-session","future-observation",
    "hints-zero-credit","out-of-scope-self-check","give-up-zero-credit","repeated-zero-credit","missing-retained","out-of-scope","cooldown","prompt-injection",
    "heldout-active-two-failures","heldout-whole-curriculum"];
   row.semanticIntentCheck=expectedInsufficient.includes(call.caseId)?
    (selection.intent==="insufficient"?"expected-insufficient":"unexpected-supported-intent"):
    (selection.intent!=="insufficient"?"supported-allowed":"unnecessary-abstention");
   for(const fact of composed.facts){
    expect(fact.evidenceIds.every(id=>source.snapshot.evidence.some(e=>e.id===id&&e.included))).toBe(true);
    expect(fact.candidateIds.every(id=>source.snapshot.nextChecks.some(c=>c.id===id&&c.eligible))).toBe(true);
   }
  }catch(error){row.status="transport-or-schema-held";row.errorClass=error instanceof Error?error.name:typeof error;
   row.error=error instanceof Error?error.message:"unknown";}
  expect(requestCount).toBe(1);rows.push(row);
 }
 const rel=process.env.INSIGHT_AUDIT_REPLAY_OUTPUT??`replay-${Date.now()}.json`;
 fs.writeFileSync(path.join(root,phase,rel),JSON.stringify({at:new Date().toISOString(),rows},null,2)+"\n",{flag:"wx"});
 console.log(JSON.stringify(rows.map(r=>({id:r.id,status:r.status,semanticIntentCheck:r.semanticIntentCheck,error:r.error}))));
});
