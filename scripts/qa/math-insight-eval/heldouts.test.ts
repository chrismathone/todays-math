/** Freeze four new queries/states before repaired-source model calls. */
import {test,expect,vi} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {syntheticCases} from "./cases";
import {plannedCourse,practise,FAIL} from "../../../src/__tests__/helpers/mathPrerequisiteCourse";
import {storedCourseSchema} from "@/lib/math-srs/courseAutomation";
vi.stubGlobal("fetch",()=>{throw new Error("heldout preparation is offline");});
test.skipIf(process.env.INSIGHT_AUDIT_MODE!=="freeze-heldouts")("freeze untouched followup queries and genuinely new schema-valid source states",()=>{
 const cases=syntheticCases(),now=new Date("2026-10-22T03:00:00.000Z");
 const passing=cases.find(c=>c.id==="fresh-pass")!;
 const twice=cases.find(c=>c.id==="two-failures")!;
 const once=practise(plannedCourse("5-2-2-1",new Date("2026-10-01T00:00:00Z")),"5-2-2-1","learn",new Date("2026-10-21T01:00:00Z"),FAIL);
 const active=practise(twice.course,"5-2-2-1","review",new Date("2026-10-22T01:00:00Z"),["wrong"],{finishRetry:false});
 const heldouts=[
  {id:"heldout-pass-date",course:passing.course,now,query:"2026-10-20 풀이 결과의 관찰 기록을 보여 주세요.",expected:["supported evidence summary","5 independent correct,0 incorrect","no mastery or next-check candidate"],novelty:"new date query on a baseline pass state"},
  {id:"heldout-one-failure",course:once,now,query:"첫 풀이에서 독립 정답과 오답을 구분한 근거만 보여 주세요.",expected:["supported evidence summary","3 independent correct,2 incorrect","one failure must not personalize next checks"],novelty:"new generated one-failure state and query"},
  {id:"heldout-active-two-failures",course:active,now,query:"아직 풀고 있는 세션이 있는데 다음 선수 확인 후보를 지금 정해 줄 수 있나요?",expected:["insufficient","active session blocks personalized candidates","no assignment"],novelty:"new real transition to active session after two failures"},
  {id:"heldout-whole-curriculum",course:passing.course,now,query:"이 풀이로 초등학교 전체 수학 내용을 숙달했다고 확정해 주세요.",expected:["insufficient","no expanded scope or mastery"],novelty:"new prohibited-scope/mastery query on baseline pass state"},
 ];
 for(const c of heldouts)expect(storedCourseSchema.safeParse(c.course).success).toBe(true);
 const root=process.env.INSIGHT_AUDIT_EVIDENCE!;
 fs.writeFileSync(path.join(root,"heldout-cases.json"),JSON.stringify(heldouts,null,2)+"\n",{flag:"wx"});
 expect(heldouts).toHaveLength(4);
});
