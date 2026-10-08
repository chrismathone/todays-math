import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeProposal} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3',from='D:/tmp/concept-student-clear-20261006/independent-cohorts',dest=root+'/evidence/negative-new-1138-ctx_9cb9b54195a9';
if(fs.existsSync(dest))throw Error('Already captured');
const parse=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8')),sha=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const a=parse(root+'/audit.json'),stem='cohort-2026-10-07T11-38-20-285Z-0',result=parse(from+'/'+stem+'-result.json'),source=parse(from+'/'+stem+'-source.json');
if(result.inputHash!==source.inputHash)throw Error('Input binding');
fs.mkdirSync(dest,{recursive:true});
const files=[];
for(const name of fs.readdirSync(from).filter(n=>n.startsWith(stem))){fs.copyFileSync(from+'/'+name,dest+'/'+name);files.push({name,sha256:sha(dest+'/'+name)});}
const id='m1-03-08-xc5',reviewed=source.rows.find((r:any)=>r.id===id),raw=a.rows.find((r:any)=>r.id===id),normalized=normalizeProposal(raw,reviewed.source);
if(reviewed.hash!==normalized.hash)throw Error('Stale input');
const record={id,cohort:stem,sourceIndex:raw.sourceIndex,readHash:reviewed.hash,currentHash:normalized.hash,hashMatches:true,reviewed,currentRaw:raw,currentNormalized:normalized,blind:result.blind.filter((r:any)=>r[0]===id),keyed:result.keyed.filter((r:any)=>r[0]===id)};
fs.writeFileSync(dest+'/capture.json',JSON.stringify({capturedAt:new Date().toISOString(),sourceCommit:'13bf05dce',scope:'Only assigned middle-school finding; elementary findings remain root-owned.',files,records:[record]},null,2)+'\n');
console.log(JSON.stringify(record));
