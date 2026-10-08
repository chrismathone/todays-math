import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { normalizeProposal } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import { readIndependentEvidence } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/independent';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e5e6';
const out=root+'/evidence/root-disputes-20261007';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const write=(n:string,v:unknown)=>writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n');
const audit=read(root+'/audit.json'), ledger=read(root+'/codex-final-editorial.json');
const baseline=read('D:/tmp/concept-student-clear-20261006/baseline.json');
const originals=new Map(Object.values(baseline.parts).flatMap((b:any)=>b.concepts.map((e:any)=>[e.id,e])));
const file='D:/tmp/concept-student-clear-20261006/current-negative-amendments.json';
const negatives=read(file).filter((r:any)=>r.id.startsWith('e5-')||r.id.startsWith('e6-'));
const ids=new Set(negatives.map((r:any)=>r.id));
const independent=readIndependentEvidence('D:/tmp/concept-student-clear-20261006/independent-cohorts');
const targets=audit.rows.filter((r:any)=>ids.has(r.id)).map((r:any)=>{
 const normalized=normalizeProposal(r,originals.get(r.id) as any)!;
 return {id:r.id,sourceIndex:r.sourceIndex,actualRow:r,ledger:ledger.rows.find((l:any)=>l.id===r.id),normalized,
  negatives:negatives.filter((n:any)=>n.id===r.id).map((n:any)=>({...n,currentHashMatch:n.reviewedHash===normalized.hash})),
  currentIndependent:independent.evidence.filter(e=>e.id===r.id&&e.contentHash===normalized.hash)};
});
write('before-actualrows-and-normalized.json',{capturedAt:new Date().toISOString(),auditSha256:sha(root+'/audit.json'),ledgerSha256:sha(root+'/codex-final-editorial.json'),negativeInputSha256:sha(file),negativeResponseCount:negatives.length,uniqueIds:ids.size,targets});
write('negative-input-original.json',negatives);
write('independent-provenance.json',{totalValidatedEvidenceCount:independent.evidence.length,evidence:independent.evidence.filter(e=>ids.has(e.id)),invalidPackets:independent.invalidPackets});
const manifest:any[]=[];
function walk(p:string){for(const name of readdirSync(p)){const f=p+'/'+name;if(f===out)continue;if(statSync(f).isDirectory())walk(f);else manifest.push({file:f.slice(root.length+1),sha256:sha(f)});}}
walk(root); write('before-files-manifest.json',manifest);
for(let start=0;start<targets.length;start+=25)write(`before-batch-${String(start).padStart(3,'0')}.json`,targets.slice(start,start+25));
console.log(JSON.stringify({responses:negatives.length,uniqueIds:ids.size,targetRows:targets.length,currentMatches:targets.filter((t:any)=>t.negatives.some((n:any)=>n.currentHashMatch)).length,stale:targets.filter((t:any)=>!t.negatives.some((n:any)=>n.currentHashMatch)).length,currentPass:targets.filter((t:any)=>t.currentIndependent.some((e:any)=>e.accepted)).length,invalidPackets:independent.invalidPackets.length}));
