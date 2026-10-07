import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {split} from './middle-student-canonical.mjs';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const bytes=fs.readFileSync(`${root}/evidence/source.json`),source=JSON.parse(bytes),audit=JSON.parse(fs.readFileSync(`${root}/audit.json`)),ledger=JSON.parse(fs.readFileSync(`${root}/final-editorial.json`));
const hash=x=>createHash('sha256').update(x).digest('hex'),issues=[];
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fingerprint=r=>hash(JSON.stringify({bDecision:r.bDecision,bPrompt:r.bPrompt,bAnswer:r.bAnswer,bRequiredIdeas:r.bRequiredIdeas,cDecision:r.cDecision,cMarkedSentence:r.cMarkedSentence,cAcceptedAnswers:r.cAcceptedAnswers,coreAfter:r.coreAfter}));
if(audit.sourceSha256!==hash(bytes))issues.push('source file hash mismatch');
if(!eq(source.entries.map(r=>r.id),audit.rows.map(r=>r.id)))issues.push('source IDs/order mismatch');
if(!eq(audit.rows.map(r=>r.id),audit.reviewedIds))issues.push('draft reviewed IDs mismatch');
if(fs.readFileSync(`${root}/audit.json`,'utf8')!==fs.readFileSync(`${root}/proposal-cohorts.json`,'utf8'))issues.push('canonical/compatibility alias differs');
const texts=x=>{if(typeof x==='string')return[x];if(Array.isArray(x))return x.flatMap(texts);if(x&&typeof x==='object')return Object.values(x).flatMap(texts);return[];};
for(const [i,r] of audit.rows.entries()){
 const original=source.entries[i];
 if(r.sourceIndex!==i||r.sourceFingerprint!==hash(JSON.stringify(original)))issues.push(`${r.id}: source/index fingerprint`);
 if(fingerprint(r)!==r.proposalFingerprint)issues.push(`${r.id}: content fingerprint`);
 if(r.bDecision!=='exclude'&&(!r.bPrompt?.trim()||!r.bAnswer?.trim()||!Array.isArray(r.bRequiredIdeas)||!r.bRequiredIdeas.length||r.bRequiredIdeas.some(k=>!Array.isArray(k.anyOf)||!k.anyOf.length||k.anyOf.some(x=>typeof x!=='string'||!x.trim()))))issues.push(`${r.id}: incomplete B`);
 if(r.cDecision!=='exclude'){
  const pieces=split(r.cMarkedSentence||''),keys=pieces.filter(x=>x.kind==='key').map(x=>x.text),masked=pieces.map(x=>x.kind==='key'?'□':x.text).join('');
  if(!keys.length||!eq(keys,r.cSlotAnswers)||masked!==r.cStudentSentence)issues.push(`${r.id}: C parser/key/masked mismatch`);
  if(!Array.isArray(r.cAcceptedAnswers)||r.cAcceptedAnswers.length!==keys.length||r.cAcceptedAnswers.some((a,j)=>!Array.isArray(a)||!a.includes(keys[j])||a.some(v=>typeof v!=='string'||!v.trim())))issues.push(`${r.id}: C accepted answers`);
 }
 if(r.coreAfter&&!r.coreReason?.trim())issues.push(`${r.id}: core reason missing`);
 const inspected={bPrompt:r.bPrompt,bAnswer:r.bAnswer,bRequiredIdeas:r.bRequiredIdeas,cMarkedSentence:r.cMarkedSentence,cAcceptedAnswers:r.cAcceptedAnswers,coreAfter:r.coreAfter};
 if(texts(inspected).some(t=>/[\u0000-\u0009\u000B-\u001F]/.test(t)))issues.push(`${r.id}: control character in visible fields`);
}
const current=ledger.rows.filter(e=>{const r=audit.rows[e.sourceIndex];return r?.id===e.id&&r.proposalFingerprint===e.proposalFingerprint&&r.learningRole===e.learningRole;});
const changedIds=new Set(fs.readdirSync(`${root}/evidence/resume-editorial-ctx_9cb9b54195a9`).filter(n=>n.startsWith('verdicts-')).flatMap(n=>JSON.parse(fs.readFileSync(`${root}/evidence/resume-editorial-ctx_9cb9b54195a9/${n}`)).changes.map(c=>c.id)));
const results={checkedAt:new Date().toISOString(),dispatchId:'ctx_9cb9b54195a9',purpose:'ID/order/fingerprint/parser/schema checks; not semantic approval or evidence of unread IDs being read',sourceCount:source.entries.length,currentDrafts:audit.rows.length,recordedFinalReadings:ledger.rows.length,currentFinalReadings:current.length,pendingFinalReadings:audit.rows.length-current.length,resumeChangedIds:[...changedIds],issues};
fs.writeFileSync(`${root}/resume-validation-ctx_9cb9b54195a9.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
if(issues.length)process.exitCode=1;
