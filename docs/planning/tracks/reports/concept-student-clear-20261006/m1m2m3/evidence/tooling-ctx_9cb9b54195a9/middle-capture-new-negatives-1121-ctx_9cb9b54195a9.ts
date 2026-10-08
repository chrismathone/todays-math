import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeProposal} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3',from='D:/tmp/concept-student-clear-20261006/independent-cohorts';
const label='negative-new-1121-ctx_9cb9b54195a9',dest=root+'/evidence/'+label;
if(fs.existsSync(dest))throw Error('Already captured');
const parse=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8')),sha=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const a=parse(root+'/audit.json'),old=parse(root+'/evidence/negative-current-ctx_9cb9b54195a9.json'),records=[];
fs.mkdirSync(dest,{recursive:true});
const files=[];
for(const stem of ['cohort-2026-10-07T11-21-07-361Z-0','cohort-2026-10-07T11-21-07-398Z-1']){
 const result=parse(from+'/'+stem+'-result.json'),source=parse(from+'/'+stem+'-source.json');
 if(result.inputHash!==source.inputHash)throw Error('Input binding');
 for(const name of fs.readdirSync(from).filter(n=>n.startsWith(stem))){fs.copyFileSync(from+'/'+name,dest+'/'+name);files.push({name,sha256:sha(dest+'/'+name)});}
 const blind=result.blind.filter((r:any)=>r[3]!=='pass'),keyed=result.keyed.filter((r:any)=>r.slice(1,4).some((v:any)=>!['pass','none','excluded'].includes(v)));
 for(const id of [...new Set([...blind,...keyed].map((r:any)=>r[0]))]){
  const reviewed=source.rows.find((r:any)=>r.id===id),raw=a.rows.find((r:any)=>r.id===id),normalized=normalizeProposal(raw,reviewed.source),oldIndex=old.current.findIndex((r:any)=>r.id===id);
  records.push({id,cohort:stem,sourceIndex:raw.sourceIndex,oldDisputeIndex:oldIndex,readHash:reviewed.hash,currentHash:normalized.hash,hashMatches:reviewed.hash===normalized.hash,reservedTail:oldIndex>=160,reviewed,currentRaw:raw,currentNormalized:normalized,blind:blind.filter((r:any)=>r[0]===id),keyed:keyed.filter((r:any)=>r[0]===id)});
 }
}
fs.writeFileSync(dest+'/capture.json',JSON.stringify({capturedAt:new Date().toISOString(),sourceCommit:'13bf05dce',files,records},null,2)+'\n');
console.log(JSON.stringify(records.map(({id,oldDisputeIndex,hashMatches,reservedTail})=>({id,oldDisputeIndex,hashMatches,reservedTail}))));
