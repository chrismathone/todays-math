/** Independently compare the approved extraction against the exact base Git source. */
import {test,expect,vi} from "vitest";
import ts from "typescript";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import * as kst from "@/lib/kstDate";
import * as evidence from "@/lib/math-prerequisite/evidence";
import * as mapping from "@/lib/math-prerequisite/mapping";
import * as supply from "@/lib/math-prerequisite/supply";
import * as versions from "@/lib/math-prerequisite/versions";
import * as current from "@/lib/math-prerequisite/policy";
import {syntheticCases} from "./cases";
vi.stubGlobal("fetch",()=>{throw new Error("policy parity forbids network");});
test("prerequisite policy extraction preserves exact base behavior for source cases and budgets",()=>{
 const baseline="1939eb621d7545f764a1c37d80464b4928d065b5";
 const code=execFileSync("git",["show",`${baseline}:src/lib/math-prerequisite/policy.ts`],{encoding:"utf8"});
 const transformed=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const dependencies:Record<string,unknown>={"@/lib/kstDate":kst,"./evidence":evidence,"./mapping":mapping,"./supply":supply,"./versions":versions};
 const previous={} as Pick<typeof current,"prerequisiteStep"|"heldCheckSections">;
 new Function("require","exports",transformed)((id:string)=>{
  if(!(id in dependencies))throw new Error(`unexpected baseline dependency ${id}`);return dependencies[id];
 },previous);
 let compared=0;
 for(const c of syntheticCases())for(const enabled of [false,true])for(const budget of [
  {answered:0,goal:20},{answered:16,goal:20},{answered:15,goal:20},{answered:20,goal:20},{answered:5,goal:10},
 ]){
  const before=JSON.stringify(c.course);
  expect(current.prerequisiteStep(c.course,c.now,enabled,budget),`${c.id}/${enabled}/${JSON.stringify(budget)}`)
   .toEqual(previous.prerequisiteStep(c.course,c.now,enabled,budget));
  expect(current.heldCheckSections(c.course,c.now,enabled)).toEqual(previous.heldCheckSections(c.course,c.now,enabled));
  expect(JSON.stringify(c.course)).toBe(before);compared++;
 }
 const root=process.env.INSIGHT_AUDIT_EVIDENCE,out=process.env.INSIGHT_AUDIT_PARITY_OUTPUT;
 if(root&&out)fs.writeFileSync(path.join(root,out),JSON.stringify({at:new Date().toISOString(),baseline,compared,
  baselinePolicySha256:createHash("sha256").update(code).digest("hex"),
  currentPolicySha256:createHash("sha256").update(fs.readFileSync("src/lib/math-prerequisite/policy.ts")).digest("hex"),
  result:"exact-outputs-equal-no-mutation"},null,2)+"\n",{flag:"wx"});
 expect(compared).toBe(180);
});
