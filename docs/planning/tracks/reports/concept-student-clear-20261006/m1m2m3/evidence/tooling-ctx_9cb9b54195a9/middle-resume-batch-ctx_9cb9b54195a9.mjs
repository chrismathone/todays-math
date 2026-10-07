import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {split} from './middle-student-canonical.mjs';
const report='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const dest=path.join(report,'evidence/resume-editorial-ctx_9cb9b54195a9');
const auditPath=path.join(report,'audit.json');
const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(report,'evidence/source.json'),'utf8'));
const ledgerPath=path.join(report,'final-editorial.json');
const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const fp=r=>sha(JSON.stringify({bDecision:r.bDecision,bPrompt:r.bPrompt,bAnswer:r.bAnswer,bRequiredIdeas:r.bRequiredIdeas,cDecision:r.cDecision,cMarkedSentence:r.cMarkedSentence,cAcceptedAnswers:r.cAcceptedAnswers,coreAfter:r.coreAfter}));
const write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const compact=r=>({id:r.id,ix:r.sourceIndex,source:[source.entries[r.sourceIndex].term,source.entries[r.sourceIndex].definition,source.entries[r.sourceIndex].studentC],role:r.learningRole,B:r.bDecision,q:r.bPrompt,a:r.bAnswer,k:r.bRequiredIdeas,C:r.cDecision,c:r.cStudentSentence,ca:r.cAcceptedAnswers,core:r.coreAfter,exclude:r.exclusionReason,fp:r.proposalFingerprint});
fs.mkdirSync(dest,{recursive:true});
const [mode,arg,...rest]=process.argv.slice(2);
if(mode==='capture'){
 const start=Number(arg),end=Number(rest[0]);
 const rows=Number.isInteger(start)&&Number.isInteger(end)?audit.rows.slice(start,end):arg.split(',').map(id=>audit.rows.find(r=>r.id===id));
 if(rows.some(r=>!r))throw Error('missing requested row');
 const label=Number.isInteger(start)&&Number.isInteger(end)?`${start}-${end-1}`:(rest[0]||'notation-six');
 const file=path.join(dest,`input-${label}.json`);
 write(file,{dispatchId:'ctx_9cb9b54195a9',capturedAt:new Date().toISOString(),rows:rows.map(r=>({source:source.entries[r.sourceIndex],proposal:r}))});
 console.log('CAPTURE '+file);for(const r of rows)console.log(JSON.stringify(compact(r)));
}else if(mode==='apply'){
 const spec=JSON.parse(fs.readFileSync(arg,'utf8'));
 const before=JSON.parse(fs.readFileSync(spec.input,'utf8'));
 if(JSON.stringify(before.rows.map(r=>r.proposal.id))!==JSON.stringify(spec.notes.map(n=>n.id)))throw Error('notes must exactly match actual captured IDs/order');
 const changes=spec.changes||[];
 const scan=x=>{if(typeof x==='string'&&/[\u0000-\u0009\u000B-\u001F]/.test(x))throw Error('control character in amendment');if(Array.isArray(x))x.forEach(scan);else if(x&&typeof x==='object')Object.values(x).forEach(scan);};
 scan(changes);
 for(const change of changes){
  if(!spec.notes.some(n=>n.id===change.id))throw Error('cannot change unread row');
  const r=audit.rows.find(r=>r.id===change.id);
  Object.assign(r,change);
  if(change.cAfter){
   const pieces=split(change.cAfter),answers=pieces.filter(p=>p.kind==='key').map(p=>p.text);
   if(!answers.length)throw Error('no C slots');
   r.cDecision='rewrite';r.cMarkedSentence=change.cAfter;r.cStudentSentence=pieces.map(p=>p.kind==='key'?'□':p.text).join('');r.cAnswers=answers;r.cSlotAnswers=answers;
   r.cAcceptedAnswers=change.cAcceptedAnswers||answers.map(a=>[a]);
   r.cSlots=answers.map((a,i)=>({index:i,answer:a,equivalentAnswers:r.cAcceptedAnswers[i],equivalenceReview:'direct editorial proposal; independent verification required'}));
   delete r.cFrozenSentence;delete r.cFrozenDefinition;delete r.cFrozenAnswers;
  }
  if(change.cAcceptedAnswers&&!change.cAfter)r.cSlots=r.cSlotAnswers.map((a,i)=>({index:i,answer:a,equivalentAnswers:r.cAcceptedAnswers[i],equivalenceReview:'direct editorial proposal; independent verification required'}));
  r.proposalFingerprint=fp(r);
 }
 write(path.join(dest,`amended-${spec.label}.json`),{input:spec.input,changes,rows:spec.notes.map(n=>audit.rows.find(r=>r.id===n.id))});
 write(auditPath,audit);write(path.join(report,'proposal-cohorts.json'),audit);
 for(const c of changes)console.log(JSON.stringify(compact(audit.rows.find(r=>r.id===c.id))));
 console.log('Applied '+changes.length+' content amendments; reread output before record.');
}else if(mode==='record'){
 const spec=JSON.parse(fs.readFileSync(arg,'utf8'));
 const input=JSON.parse(fs.readFileSync(spec.input,'utf8'));
 if(JSON.stringify(input.rows.map(x=>x.proposal.id))!==JSON.stringify(spec.notes.map(x=>x.id)))throw Error('notes ID/order mismatch');
 for(const n of spec.notes){
  if(!n.b?.trim()||!n.c?.trim())throw Error('explicit per-ID B and C reason required');
  const r=audit.rows.find(r=>r.id===n.id),old=input.rows.find(x=>x.proposal.id===n.id).proposal;
  if(fp(r)!==r.proposalFingerprint)throw Error('current hash mismatch '+r.id);
  const changed=r.proposalFingerprint!==old.proposalFingerprint;
  if(changed&&!spec.rereadIds?.includes(r.id))throw Error('corrected fields must be reread '+r.id);
  if(r.coreAfter&&!n.core?.trim())throw Error('changed general definition must be directly reviewed '+r.id);
  const row={id:r.id,sourceIndex:r.sourceIndex,proposalFingerprint:r.proposalFingerprint,learningRole:r.learningRole,bVerdict:'keep',bSourceDecision:r.bDecision,bReason:n.b,cVerdict:'keep',cSourceDecision:r.cDecision,cReason:n.c,...(n.core?{coreReason:n.core}:{}),reader:'Codex dispatched worker direct reading',readScope:'Full actual source title/definition/C and proposed B prompt/model answer/required ideas/C accepted answers/general core; corrected fields reread',readAt:new Date().toISOString(),inputEvidence:`evidence/resume-editorial-ctx_9cb9b54195a9/${path.basename(spec.input)}`,initialReadFingerprint:old.proposalFingerprint,amendedAfterReading:changed};
  const ix=ledger.rows.findIndex(x=>x.id===r.id);if(ix<0)ledger.rows.push(row);else ledger.rows[ix]=row;
 }
 ledger.rows.sort((a,b)=>a.sourceIndex-b.sourceIndex);ledger.reviewedCount=ledger.rows.length;
 ledger.status=ledger.rows.length===audit.rows.length?'complete direct final-editorial reading':'partial direct final-editorial reading';
 write(ledgerPath,ledger);write(path.join(dest,`verdicts-${spec.label}.json`),spec);
 audit.finalEditorialCount=ledger.rows.filter(e=>audit.rows.some(r=>r.id===e.id&&r.proposalFingerprint===e.proposalFingerprint&&r.learningRole===e.learningRole)).length;
 audit.finalEditorialPendingIds=audit.rows.filter(r=>!ledger.rows.some(e=>e.id===r.id&&e.proposalFingerprint===r.proposalFingerprint&&e.learningRole===r.learningRole)).map(r=>r.id);
 write(auditPath,audit);write(path.join(report,'proposal-cohorts.json'),audit);
 console.log(JSON.stringify({ledger:ledger.rows.length,current:audit.finalEditorialCount,pending:audit.finalEditorialPendingIds.length}));
}else throw Error('capture|apply|record');
