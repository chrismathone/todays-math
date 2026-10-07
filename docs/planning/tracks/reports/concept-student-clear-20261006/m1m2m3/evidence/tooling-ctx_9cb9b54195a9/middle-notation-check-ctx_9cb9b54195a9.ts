import fs from 'node:fs';
import {normalizeProposal,proposedEntry} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import {bankNotationFaults} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/notation';
const report='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const audit=JSON.parse(fs.readFileSync(report+'/audit.json','utf8')),baseline=JSON.parse(fs.readFileSync('D:/tmp/concept-student-clear-20261006/baseline.json','utf8'));
const source=new Map(Object.values(baseline.parts).flatMap((p:any)=>p.concepts).map((r:any)=>[r.id,r]));
const issues:any[]=[],entries:any[]=[];for(const row of audit.rows)try{entries.push(proposedEntry(normalizeProposal(row,source.get(row.id) as any)));}catch(e:any){issues.push({id:row.id,error:e.message});}
const faults=bankNotationFaults({concepts:entries,ox:[],apply:[],figures:[]});
const groups=[...new Set(faults.map(f=>f.id+'|'+f.field))].map(key=>{const [id,field]=key.split('|'),r=audit.rows.find((r:any)=>r.id===id),entry=entries.find(r=>r.id===id);let val:any=entry;for(const k of field.split('.')){val=Array.isArray(val)&&!/^\d+$/.test(k)?val:val[k];if(k==='requiredIdeas')val=val.map((x:any)=>x.anyOf);};return {id,sourceIndex:r.sourceIndex,field,value:val,faults:faults.filter(f=>f.id===id&&f.field===field)};});
const result={checkedAt:new Date().toISOString(),issues,faultCount:faults.length,groups};fs.writeFileSync(report+'/resume-notation-ctx_9cb9b54195a9.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
