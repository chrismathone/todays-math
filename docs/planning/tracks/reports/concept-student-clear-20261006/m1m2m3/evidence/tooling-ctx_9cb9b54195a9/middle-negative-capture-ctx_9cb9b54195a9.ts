import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeProposal} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const file='D:/tmp/concept-student-clear-20261006/current-negative-amendments.json',bytes=fs.readFileSync(file),all=JSON.parse(bytes.toString('utf8'));
const audit=JSON.parse(fs.readFileSync(root+'/audit.json','utf8')),baseline=JSON.parse(fs.readFileSync('D:/tmp/concept-student-clear-20261006/baseline.json','utf8'));
const sources=new Map(Object.values(baseline.parts).flatMap((p:any)=>p.concepts).map((r:any)=>[r.id,r]));
const current:any[]=[],stale:any[]=[];
for(const review of all.filter((r:any)=>/^m[123]-/.test(r.id))){const raw=audit.rows.find((r:any)=>r.id===review.id);if(!raw)throw Error(review.id);const normalized=normalizeProposal(raw,sources.get(raw.id) as any);if(normalized.hash===review.reviewedHash)current.push({id:raw.id,sourceIndex:raw.sourceIndex,raw,normalized,review});else stale.push({id:raw.id,reviewedHash:review.reviewedHash,currentNormalizedHash:normalized.hash,evidence:review.evidence,disposition:'stale-hash; not applied as a current finding'});}
const out=root+'/evidence/negative-current-ctx_9cb9b54195a9.json';if(fs.existsSync(out))throw Error('Capture already exists');
fs.writeFileSync(out,JSON.stringify({capturedAt:new Date().toISOString(),sourcePath:file,sourceSha256:createHash('sha256').update(bytes).digest('hex'),scope:'Only matching current normalized hashes require a per-ID disposition; stale hashes are preserved without automatic edits',current,stale},null,2)+'\n');
console.log(JSON.stringify({current:current.length,stale:stale.length,ids:current.map(r=>r.id)}));
