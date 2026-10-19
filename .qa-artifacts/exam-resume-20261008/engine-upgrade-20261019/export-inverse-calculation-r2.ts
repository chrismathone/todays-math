import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inverseMinimum } from "../../../src/lib/examStudy/families/middle/inverseMinimum";
import { inverseRootTable } from "../../../src/lib/examStudy/families/middle/inverseRootTable";
const b=".qa-artifacts/exam-resume-20261008/",e=b+"engine-upgrade-20261019/";
const hash=(p:string)=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const previousMin=JSON.parse(fs.readFileSync(e+"inverse-minimum-actual-drafts-r1.json","utf8")).drafts;
const previousTable=JSON.parse(fs.readFileSync(b+"inverse-root-table-engine-audit-20261019-r1/own-generated-drafts.json","utf8")).drafts.map((x:{draft:unknown})=>x.draft);
const minimum=Array.from({length:24},(_,i)=>inverseMinimum.generate(0,i));
const table=Array.from({length:45},(_,i)=>inverseRootTable.generate(0,i));
assert.deepEqual(minimum,previousMin);assert.deepEqual(table,previousTable);
for(const q of minimum)assert(inverseMinimum.verify(q).valid);
for(const q of table)assert(inverseRootTable.verify(q).valid);
assert.equal(inverseMinimum.version,"2");assert.equal(inverseRootTable.version,"2");
const packet=e+"inverse-calculation-r2-actual-drafts.json";
fs.writeFileSync(packet,JSON.stringify({utc:new Date().toISOString(),minimum,table,
  versions:{minimum:inverseMinimum.version,rootTable:inverseRootTable.version},
  all69DraftsExactlyEqualPreservedR1:true,oldRawProofsOrRenderBytesModified:false,
  priorMinimumPacketSha256:hash(e+"inverse-minimum-actual-drafts-r1.json"),
  priorRootTablePacketSha256:hash(b+"inverse-root-table-engine-audit-20261019-r1/own-generated-drafts.json"),
  newManualQuestions:0,newManualFigures:0,gradeApproval:false,publicApproval:false,dbWrites:0},null,2)+"\n",{flag:"wx"});
const scope=JSON.parse(fs.readFileSync(e+"inverse-minimum-code-scope-r1.json","utf8"));
const sources=[...scope.files.map((x:{path:string})=>x.path),path.resolve("src/lib/examStudy/families/middle/inverseRootTable.ts"),path.resolve("src/__tests__/unit/examStudyInverseRootTable.test.ts")];
fs.writeFileSync(e+"inverse-calculation-r2-code-scope.json",JSON.stringify({utc:new Date().toISOString(),
  files:sources.map(p=>({path:p,sha256:hash(p)})),packet:{path:path.resolve(packet),sha256:hash(packet)},
  noFreshStudentBlindClaim:true,all69StudentAnswerSolutionFormatParamsUnchanged:true,
  onlyVerifierAndFamilyVersionChanged:true,newManualQuestions:0,dbWrites:0},null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({currentVersions:[2,2],minimum:24,rootTable:45,identicalDrafts:69,public:0}));
