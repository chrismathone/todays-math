/** Reproduce external reviewer claims without changing product code. */
import {test,expect,vi} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {maskInsightQuery} from "@/lib/math-insight/inference";
import {buildInsightSnapshot} from "@/lib/math-insight/snapshot";
import {heldCheckSections} from "@/lib/math-prerequisite/policy";
import {emptySrsState} from "@/lib/math-srs/serverState";
import {expeditionCourseCheckCandidates} from "@/lib/math-explorers/expedition";
import {syntheticCases} from "./cases";
test("ordinary dates and known section IDs remain valid while contact/identifier queries stay closed",()=>{
 const q=["2026-10-20 풀이 결과는?","5-2-2-1 5-1-5-4 기록은?"];
 const queryResults=q.map(query=>{try{return {query,status:"accepted",masked:maskInsightQuery(query,[])};}catch{return {query,status:"rejected-as-identity"};}});
 expect(queryResults.every(x=>x.status==="accepted")).toBe(true);
 for(const contact of ["010-1234-5678","person@example.test","d56e582b-a5af-4763-8b0a-801ecff4b5a5"])
  expect(()=>maskInsightQuery(contact,[])).toThrow();
});
test("featureoff snapshot must agree with scheduler that no review is held",()=>{
 const c=syntheticCases().find(c=>c.id==="cooldown")!;
 vi.stubEnv("MATH_PREREQ_CHECK","off");
 const candidates=expeditionCourseCheckCandidates({...emptySrsState(),course:c.course},c.now);
 expect(candidates).toBeNull();
 const authoritative=heldCheckSections(c.course,c.now,false);
 expect(authoritative.sectionIds).toEqual([]);
 const snapshot=buildInsightSnapshot(c.course,9,c.now,null,candidates);
 const misleading=snapshot.nextChecks.filter(x=>x.caveats.some(s=>s.includes("복습을 미뤄요")));
 expect(misleading).toHaveLength(0);
 vi.unstubAllEnvs();
 const root=process.env.INSIGHT_AUDIT_EVIDENCE;
 if(root&&process.env.INSIGHT_AUDIT_COUNTEREXAMPLES_OUTPUT)fs.writeFileSync(path.join(root,process.env.INSIGHT_AUDIT_COUNTEREXAMPLES_OUTPUT),JSON.stringify({
  at:new Date().toISOString(),featureOffCaveat:{authoritative,snapshotCandidates:misleading},productEdits:false,
 },null,2)+"\n",{flag:"wx"});
});
