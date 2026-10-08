import fs from 'node:fs';
import {normalizeProposal} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import {editorialRows,verifyEditorialRow} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/editorial';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const a=JSON.parse(fs.readFileSync(root+'/audit.json','utf8')),l=JSON.parse(fs.readFileSync(root+'/final-editorial.json','utf8')),baseline=JSON.parse(fs.readFileSync('D:/tmp/concept-student-clear-20261006/baseline.json','utf8'));
const sources=new Map(Object.values(baseline.parts).flatMap((p:any)=>p.concepts).map((r:any)=>[r.id,r]));
const ledgers=new Map(editorialRows(l).map(r=>[r.id,r]));
const problems:any[]=[],pending:string[]=[];
for(const r of a.rows){try{const n=normalizeProposal(r,sources.get(r.id) as any);const e=ledgers.get(r.id);const errors=verifyEditorialRow('middle',r,n,e);if(!e&&errors.length===1&&errors[0]==='이 ID의 최종 직접 읽기 기록 없음')pending.push(r.id);else if(errors.length)problems.push({id:r.id,errors});}catch(e){problems.push({id:r.id,error:String(e)});}}
const result={checkedAt:new Date().toISOString(),sourceCount:a.rows.length,recordedReadings:ledgers.size,passedRecordedReadings:ledgers.size-problems.length,pendingIds:pending,problems,scope:'Actual integration normalizeProposal + editorialRows + verifyEditorialRow; structure/evidence binding, not an independent semantic or student validation'};
fs.writeFileSync(root+'/editorial-validation-ctx_9cb9b54195a9.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,pendingIds:pending.length}));if(problems.length)process.exitCode=1;
