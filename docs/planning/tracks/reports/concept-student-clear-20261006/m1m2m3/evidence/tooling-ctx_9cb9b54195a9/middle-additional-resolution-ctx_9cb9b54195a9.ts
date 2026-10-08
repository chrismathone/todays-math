import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeProposal} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3',rel='evidence/resume-editorial-ctx_9cb9b54195a9';
const read=(p:string)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),sha=(p:string)=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const audit=read('audit.json'),ledger=read('final-editorial.json');
const batches=fs.readdirSync(root+'/'+rel).filter(n=>n.startsWith('verdicts-')).map(n=>({path:rel+'/'+n,...read(rel+'/'+n)}));
const rows=[];
for(const label of ['1121','1138']){
 const capturePath=`evidence/negative-new-${label}-ctx_9cb9b54195a9/capture.json`,capture=read(capturePath);
 for(const r of capture.records){
  const found=batches.flatMap(b=>(b.additionalFindingDispositions??[]).filter((d:any)=>d.id===r.id).map((d:any)=>({b,d})));
  if(found.length!==1)throw Error('Must have exactly one additional disposition '+r.id);
  const {b,d}=found[0],input=JSON.parse(fs.readFileSync(b.input,'utf8')),initial=input.rows.find((x:any)=>x.proposal.id===r.id).proposal,afterPath=rel+'/amended-'+b.label+'.json',after=read(afterPath).rows.find((x:any)=>x.id===r.id),current=audit.rows.find((x:any)=>x.id===r.id),l=ledger.rows.find((x:any)=>x.id===r.id);
  if(initial.proposalFingerprint!==r.currentRaw.proposalFingerprint||!r.hashMatches||l.proposalFingerprint!==current.proposalFingerprint)throw Error('Hash binding '+r.id);
  rows.push({id:r.id,sourceIndex:r.sourceIndex,capture:capturePath,captureSha256:sha(capturePath),cohort:r.cohort,reviewedNormalizedHash:r.readHash,reviewedRawFingerprint:r.currentRaw.proposalFingerprint,decision:d.decision,reason:d.reason,dispositionEvidence:b.path,firstResolutionEvidence:afterPath,firstResolutionFingerprint:after.proposalFingerprint,currentRawFingerprint:current.proposalFingerprint,currentNormalizedHash:normalizeProposal(current,r.reviewed.source).hash,currentReader:l.reader,currentReadAt:l.readAt,currentInputEvidence:l.inputEvidence,blind:r.blind,keyed:r.keyed});
 }
}
const result={generatedAt:new Date().toISOString(),sourceCommit:audit.sourceCommit,scope:'Additional assigned findings after the fixed 276-current/36-stale snapshot; some IDs overlap that older snapshot, so counts are not unique IDs across both files.',resolved:rows.length,amended:rows.filter(r=>r.decision==='amend').length,retainedWithReason:rows.filter(r=>r.decision==='retain-with-reason').length,pending:0,disclosure:'Decisions come from actual primary reading and recorded verdicts. This file checks evidence binding only; retained disagreements are not independent approvals.',rows};
fs.writeFileSync(root+'/additional-negative-resolution-ctx_9cb9b54195a9.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({resolved:result.resolved,amended:result.amended,retained:result.retainedWithReason,pending:0}));
