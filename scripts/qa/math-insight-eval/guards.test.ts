import {describe,test,expect,vi} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {syntheticCases} from "./cases";
import {buildInsightSnapshot} from "@/lib/math-insight/snapshot";
import {buildInsightPrompt,insightSnapshotId,parseInsightSelection,composeInsightResult,type InsightSelection} from "@/lib/math-insight/inference";
import {emptySrsState} from "@/lib/math-srs/serverState";
import {expeditionCourseCheckCandidates} from "@/lib/math-explorers/expedition";
import {practise,plannedCourse,FAIL} from "../../../src/__tests__/helpers/mathPrerequisiteCourse";
vi.stubGlobal("fetch",()=>{throw new Error("independent guards prohibit network");});
const source=syntheticCases();
const cases=source.map(c=>({...c,snapshot:buildInsightSnapshot(c.course,9,c.now)}));
const get=(id:string)=>cases.find(c=>c.id===id)!.snapshot;
const provenance={provider:"anthropic" as const,model:"synthetic-offline",role:"selection-only" as const};
const selection=(s:ReturnType<typeof buildInsightSnapshot>,extra:Record<string,unknown>={})=>({
 snapshotId:insightSnapshotId(s),intent:"insufficient",evidenceIds:[],candidateIds:[],...extra,
});
describe("independent source and selection counterexamples",()=>{
 test("every synthetic snapshot is read-only, bounded, identity-free in prompt and partial in scope",()=>{
  for(const c of source){
   const before=JSON.stringify(c.course),s=buildInsightSnapshot(c.course,9,c.now);
   expect(JSON.stringify(c.course)).toBe(before);
   expect(s.sections).toHaveLength(4);expect(s.evidence.length).toBeLessThanOrEqual(31);
   expect(s.sections.every(x=>x.partial&&x.relation==="covers-part")).toBe(true);
   expect(s.nextChecks.every(x=>x.reviewStatus==="candidate")).toBe(true);
   const prompt=buildInsightPrompt(s,c.query);
   for(const e of s.evidence) expect(prompt).not.toContain(e.sessionId);
   for(const p of c.course.learner.session?.problems??[]){
    expect(prompt).not.toContain(p.content);expect(prompt).not.toContain(p.id);
   }
  }
 });
 test("zero-credit sessions retain source rows and never become missing records or positive credit",()=>{
  for(const id of ["hints-zero-credit","give-up-zero-credit","repeated-zero-credit"]){
   const s=get(id),e=s.evidence.find(e=>e.included)!;
   expect(e).toBeDefined();expect(e.independentCorrect+e.independentIncorrect).toBe(0);
   expect(s.freshness).toBe("insufficient");
   expect(()=>parseInsightSelection(JSON.stringify(selection(s,{intent:"evidence",evidenceIds:[`e${s.evidence.indexOf(e)}`]})),s)).toThrow();
   expect(composeInsightResult(s,selection(s) as InsightSelection,provenance).facts[0].text).not.toContain("기록이 없");
  }
 });
 test("future, unfinished, stale, pre-plan and missing retained evidence cannot become supported",()=>{
  for(const id of ["future-session","future-observation","unfinished","stale","before-plan","missing-retained"]){
   const s=get(id);expect(s.freshness).toBe("insufficient");
   expect(s.evidence.every(e=>!e.included)).toBe(true);
   expect(()=>parseInsightSelection(JSON.stringify(selection(s,{intent:"overview",evidenceIds:["e0"]})),s)).toThrow();
  }
 });
 test("snapshot identity binds revision, exact source, context, graph and as-of",()=>{
  const s=get("two-failures"),raw=JSON.stringify(selection(s));
  for(const mutation of [
   {...s,revision:s.revision+1},{...s,stateDigest:"0".repeat(64)},
   {...s,context:{studentId:"11111111-1111-4111-8111-111111111111",classId:"22222222-2222-4222-8222-222222222222",branchId:null}},
   {...s,asOf:"2026-10-22T03:00:00.001Z"},{...s,scope:{...s.scope,graphHash:"different-graph"}},
  ]) expect(()=>parseInsightSelection(raw,mutation)).toThrow("snapshot-mismatch");
 });
 test("parser rejects invented, excluded, duplicate, mismatched and contradictory selections",()=>{
  const s=get("two-failures"),included=s.evidence.findIndex(e=>e.included),excluded=s.evidence.findIndex(e=>!e.included);
  const malformed=[
   {intent:"mastered"},{intent:"evidence",evidenceIds:["invented"]},
   {intent:"evidence",evidenceIds:[`e${excluded}`]},
   {intent:"evidence",evidenceIds:[`e${included}`,`e${included}`]},
   {intent:"insufficient",evidenceIds:[`e${included}`]},
   {intent:"next-checks",candidateIds:["c99"]},{intent:"next-checks",candidateIds:["c0"]},
   {intent:"overview",diagnosis:"made-up"},{snapshotId:"0".repeat(64)},
  ];
  for(const v of malformed)expect(()=>parseInsightSelection(JSON.stringify(selection(s,v)),s)).toThrow();
  const empty=get("empty");
  expect(()=>parseInsightSelection(JSON.stringify(selection(empty,{intent:"next-checks",candidateIds:["c0"]})),empty)).toThrow();
 });
 test("personalized candidates use real adapter, both triggers, frozen budget and original gates",()=>{
  vi.stubEnv("MATH_PREREQ_CHECK","on");
  const c=source.find(c=>c.id==="two-failures")!;
  const state={...emptySrsState(),course:c.course};
  const pool=expeditionCourseCheckCandidates(state,c.now)!;
  expect(pool.evidenceSessionIds).toHaveLength(2);
  const s=buildInsightSnapshot(c.course,9,c.now,null,pool);
  expect(s.nextChecks.filter(x=>x.eligible)).toHaveLength(2);
  expect(s.evidence.filter(x=>x.purposes.includes("candidate-trigger"))).toHaveLength(2);
  expect(s.evidence.filter(x=>x.purposes.includes("section-current"))).toHaveLength(1);
  expect(s.sections[0].evidenceIds).toHaveLength(1);
  expect(s.nextChecks[0].evidenceIds).toHaveLength(2);
  const both=s.evidence.map((e,i)=>e.included?`e${i}`:null).filter((id):id is string=>!!id);
  const latest=`e${s.evidence.findIndex(e=>e.purposes.includes("section-current"))}`;
  expect(()=>parseInsightSelection(JSON.stringify(selection(s,{intent:"next-checks",evidenceIds:[latest],candidateIds:["c0"]})),s)).toThrow("missing-candidate-evidence");
  expect(parseInsightSelection(JSON.stringify(selection(s,{intent:"next-checks",evidenceIds:both,candidateIds:["c0"]})),s).intent).toBe("next-checks");
  for(const id of ["fresh-pass","unfinished","cooldown","disabled-plan-retained","future-observation"]){
   const other=source.find(x=>x.id===id)!;
   expect(expeditionCourseCheckCandidates({...emptySrsState(),course:other.course},other.now),id).toBeNull();
  }
  const one=practise(plannedCourse("5-2-2-1",new Date("2026-10-01T00:00:00Z")),"5-2-2-1","learn",new Date("2026-10-20T01:00:00Z"),FAIL);
  expect(expeditionCourseCheckCandidates({...emptySrsState(),course:one},c.now)).toBeNull();
  const active=practise(c.course,"5-2-2-1","review",new Date("2026-10-22T01:00:00Z"),["wrong"],{finishRetry:false});
  expect(expeditionCourseCheckCandidates({...emptySrsState(),course:active},c.now)).toBeNull();
  const budgetCourse={...c.course,dailyGoalSnapshot:{date:"2026-10-21",goal:5 as const}};
  expect(expeditionCourseCheckCandidates({...emptySrsState(),course:budgetCourse},new Date("2026-10-21T03:00:00Z"))).toBeNull();
  vi.stubEnv("MATH_PREREQ_CHECK","off");
  expect(expeditionCourseCheckCandidates(state,c.now)).toBeNull();
  vi.unstubAllEnvs();
 });
 test("persist independent guard audit facts when explicitly requested",()=>{
  const root=process.env.INSIGHT_AUDIT_EVIDENCE;
  if(root&&process.env.INSIGHT_AUDIT_GUARDS_OUTPUT)fs.writeFileSync(path.join(root,process.env.INSIGHT_AUDIT_GUARDS_OUTPUT),JSON.stringify({
   at:new Date().toISOString(),caseCount:cases.length,
   cases:cases.map(c=>({id:c.id,freshness:c.snapshot.freshness,eligibility:c.snapshot.eligibility,
    included:c.snapshot.evidence.filter(e=>e.included).length,eligibleCandidates:c.snapshot.nextChecks.filter(e=>e.eligible).map(e=>e.sectionId)})),
  },null,2)+"\n",{flag:"wx"});
 });
});
