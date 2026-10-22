/** Capture actual server prompt and actual transport body. Offline only. */
import { test, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildInsightSnapshot } from "@/lib/math-insight/snapshot";
import { buildInsightPrompt, insightSnapshotId, maskInsightQuery } from "@/lib/math-insight/inference";
import { insightModelConfig } from "@/lib/math-insight/config";
import { runModelApi } from "@/lib/studio-ai/api";
import { storedCourseSchema } from "@/lib/math-srs/courseAutomation";
import { emptySrsState } from "@/lib/math-srs/serverState";
import { expeditionCourseCheckCandidates } from "@/lib/math-explorers/expedition";
const digest=(text:string|Buffer)=>createHash("sha256").update(text).digest("hex");
const enabled=process.env.INSIGHT_AUDIT_MODE==="capture";
test.skipIf(!enabled)("freeze exact server prompt and transport requests for synthetic sources",async()=>{
  const root=process.env.INSIGHT_AUDIT_EVIDENCE!;
  const phase=process.env.INSIGHT_AUDIT_PHASE??"pilot-claude-v1";
  const write=(rel:string,value:unknown)=>{
    const p=path.join(root,rel); fs.mkdirSync(path.dirname(p),{recursive:true});
    const raw=JSON.stringify(value,null,2)+"\n"; fs.writeFileSync(p,raw,{flag:"wx"}); return digest(raw);
  };
  const cases=JSON.parse(fs.readFileSync(path.join(root,process.env.INSIGHT_AUDIT_CASES_SOURCE??"synthetic-cases.json"),"utf8"));
  vi.stubEnv("ANTHROPIC_API_KEY","offline-placeholder-never-transmitted");
  vi.stubEnv("MATH_PREREQ_CHECK","on");
  const config=insightModelConfig({NODE_ENV:"test",MATH_INSIGHT_VENDOR:"anthropic",ANTHROPIC_API_KEY:"offline-placeholder"});
  expect(config).toMatchObject({vendor:"anthropic",model:"claude-opus-5"});
  const calls:unknown[]=[];
  for (const item of cases) {
    const course=storedCourseSchema.parse(item.course);
    const srsState={...emptySrsState(),course};
    const candidates=expeditionCourseCheckCandidates(srsState,new Date(item.now));
    const snapshot=buildInsightSnapshot(course,9,new Date(item.now),{
      studentId:"11111111-1111-4111-8111-111111111111",classId:"22222222-2222-4222-8222-222222222222",branchId:null,
    },candidates);
    const query=maskInsightQuery(item.query,[]);
    const prompt=buildInsightPrompt(snapshot,query);
    for(const e of snapshot.evidence) expect(prompt).not.toContain(e.sessionId);
    expect(prompt).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(prompt).not.toContain("submittedAnswer");
    const sourcePath=`${phase}/sources/${item.id}.json`;
    const sourceSha256=write(sourcePath,{...item,srsState,candidates,featureContext:{MATH_PREREQ_CHECK:"on"},snapshot,maskedQuery:query,promptSha256:digest(prompt)});
    let count=0;
    vi.stubGlobal("fetch",async(url:unknown,init:RequestInit)=>{
      count++;
      expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
      const body=JSON.parse(String(init.body));
      const requestPath=`${phase}/requests/${item.id}.json`;
      const requestSha256=write(requestPath,body);
      calls.push({id:`${phase}-${item.id}`,caseId:item.id,vendor:config!.vendor,model:config!.model,
        effort:body.output_config?.effort??"default",runtimeTimeoutMs:20_000,endpoint:String(url),sourceKind:"synthetic",
        sourcePath,sourceSha256,requestPath,requestSha256,promptSha256:digest(prompt),snapshotId:insightSnapshotId(snapshot)});
      return Response.json({model:config!.model,stop_reason:"end_turn",content:[{type:"text",text:"offline-capture"}]});
    });
    await runModelApi({...config!,prompt,signal:new AbortController().signal,maxOutputTokens:700,
      singleAttempt:true,suppressUpstreamDetails:true});
    expect(count).toBe(1);
  }
  const sourceFiles=["src/lib/math-insight/inference.ts","src/lib/math-insight/snapshot.ts","src/lib/math-insight/routes.ts",
    "src/lib/math-insight/config.ts","src/lib/studio-ai/api.ts","src/lib/studio-ai/routing.ts","src/lib/math-prerequisite/evidence.ts","src/lib/math-prerequisite/mapping.ts",
    "src/lib/math-prerequisite/policy.ts","src/lib/math-explorers/expedition.ts","src/lib/math-prerequisite/courseIntegration.ts",
    "src/contracts/mathInsight.contract.ts","scripts/qa/math-insight-eval/capture.test.ts","scripts/qa/math-insight-eval/cases.ts","scripts/qa/math-insight-eval/live.py"];
  const sourceHashes=Object.fromEntries(sourceFiles.map(p=>[p,digest(fs.readFileSync(p))]));
  write(`${phase}/manifest.json`,{at:new Date().toISOString(),mode:"exact-server-prompt-and-transport",
    codeHead:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),sourceHashes,calls});
});
