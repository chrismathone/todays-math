import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {normalizeProposal} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const [file,attestation,label]=process.argv.slice(2),folder=path.dirname(file);
const sha=(x:any)=>createHash('sha256').update(x).digest('hex');
const fp=(r:any)=>sha(JSON.stringify({bDecision:r.bDecision,bPrompt:r.bPrompt,bAnswer:r.bAnswer,bRequiredIdeas:r.bRequiredIdeas,cDecision:r.cDecision,cMarkedSentence:r.cMarkedSentence,cAcceptedAnswers:r.cAcceptedAnswers,coreAfter:r.coreAfter}));
const parse=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const artifact=parse(file),reread=parse(attestation),inputFile=path.join(folder,'immutable-input.json'),input=parse(inputFile);
const a=parse(root+'/audit.json'),negative=parse(root+'/evidence/negative-current-ctx_9cb9b54195a9.json');
const baseline=parse('D:/tmp/concept-student-clear-20261006/baseline.json');
const sources=new Map(Object.values(baseline.parts).flatMap((p:any)=>p.concepts).map((r:any)=>[r.id,r]));
if(sha(fs.readFileSync(inputFile))!==artifact.inputSha256||reread.candidateArtifact.byteSha256!==sha(fs.readFileSync(file)))throw Error('Input/candidate byte SHA mismatch');
if(input.immutableBaseline.sourceCommit!=='13bf05dce'||input.sourceSnapshot.byteSha256!==sha(fs.readFileSync(root+'/evidence/negative-current-ctx_9cb9b54195a9.json')))throw Error('Snapshot provenance mismatch');
const names=new Set<string>([path.basename(file),path.basename(attestation),'immutable-input.json']);
const refs=[reread.actualOutput,...artifact.reviews.flatMap((r:any)=>[r.beforeReadingEvidence,r.manualEvidence])];
for(const ref of refs){
 if(!ref?.path||!ref.byteSha256||sha(fs.readFileSync(path.join(folder,ref.path)))!==ref.byteSha256)throw Error('Referenced artifact byte mismatch '+JSON.stringify(ref));
 names.add(ref.path);
}
const verified=[];
for(const r of artifact.reviews){
 const original=input.rows.find((x:any)=>x.id===r.id),current=a.rows.find((x:any)=>x.id===r.id),n=negative.current[r.originalDisputeIndex],source=sources.get(r.id),proof=reread.rows.find((x:any)=>x.id===r.id);
 if(!original||!current||!proof||n?.id!==r.id||n.sourceIndex!==r.sourceIndex||r.originalDisputeIndex!==original.originalDisputeIndex)throw Error('ID/order binding '+r.id);
 if(original.currentFingerprint!==r.currentFingerprint||r.currentFingerprint!==current.proposalFingerprint||fp(current)!==r.currentFingerprint||r.currentFingerprint!==n.raw.proposalFingerprint)throw Error('Stale current raw '+r.id);
 if(normalizeProposal(current,source).hash!==r.currentNormalizedHash||r.currentNormalizedHash!==n.normalized.hash)throw Error('Stale current normalized '+r.id);
 if(!r.proposedRawRow&&r.verdict==='retain'&&r.candidateFingerprint===r.currentFingerprint)r.proposedRawRow=original.raw;
 if(fp(r.proposedRawRow)!==r.candidateFingerprint||normalizeProposal(r.proposedRawRow,source).hash!==r.candidateNormalizedHash||proof.candidateFingerprint!==r.candidateFingerprint||proof.candidateNormalizedHash!==r.candidateNormalizedHash)throw Error('Candidate binding '+r.id);
 if(r.proposedRawRow.sourceFingerprint!==current.sourceFingerprint)throw Error('Source binding '+r.id);
 if(r.proposedRawRow.cDecision==='keep'&&r.candidateNormalized.C?.sentence!==n.normalized.C?.sentence)throw Error('Changed C marked keep '+r.id);
 verified.push({id:r.id,disputeIndex:r.originalDisputeIndex,sourceIndex:r.sourceIndex,currentFingerprint:r.currentFingerprint,currentNormalizedHash:r.currentNormalizedHash,candidateFingerprint:r.candidateFingerprint,candidateNormalizedHash:r.candidateNormalizedHash});
}
const evidence='evidence/'+label+'-20261007',dest=root+'/'+evidence;
if(fs.existsSync(dest))throw Error('Evidence already imported '+dest);
fs.mkdirSync(dest,{recursive:true});
for(const name of names){const target=path.join(dest,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(folder,name),target);}
fs.writeFileSync(dest+'/import-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),sourceFile:file,attestation,files:[...names].map(name=>({name,sha256:sha(fs.readFileSync(path.join(dest,name)))})),rows:verified},null,2)+'\n');
const captured=root+'/evidence/resume-editorial-ctx_9cb9b54195a9/input-'+label+'.json';
if(fs.existsSync(captured))throw Error('Capture exists');
execFileSync(process.execPath,['D:/tmp/concept-student-clear-20261006/middle-resume-batch-ctx_9cb9b54195a9.mjs','capture',artifact.reviews.map((r:any)=>r.id).join(','),label],{encoding:'utf8'});
const keys=['bDecision','bPrompt','bAnswer','bRequiredIdeas','bGoal','bReason','studentLabel','cDecision','cAfter','cMarkedSentence','cAcceptedAnswers','cReason','coreAfter','coreReason','exclusionReason','learningRole','roleReason','exampleNeeded'];
const changes=artifact.reviews.filter((r:any)=>keys.some(k=>r.proposedRawRow[k]!==undefined&&JSON.stringify(a.rows.find((x:any)=>x.id===r.id)[k])!==JSON.stringify(r.proposedRawRow[k]))).map((r:any)=>{
 const old=a.rows.find((x:any)=>x.id===r.id),p=r.proposedRawRow,c:any={id:r.id};
 for(const k of keys)if(JSON.stringify(old[k])!==JSON.stringify(p[k])&&p[k]!==undefined)c[k]=p[k];
 if(c.bPrompt||c.bRequiredIdeas)c.bReason=r.reason;
 if(c.cAfter){c.cReason=r.reason;c.cAcceptedAnswers=p.cAcceptedAnswers;}
 if(c.coreAfter)c.coreReason=r.reason;
 if(c.cDecision==='keep')delete c.cAfter;
 if(c.cDecision==='exclude')Object.assign(c,{cAfter:null,cMarkedSentence:null,cStudentSentence:null,cAnswers:null,cSlotAnswers:null,cAcceptedAnswers:null,cSlots:null});
 return c;
});
const spec={label,input:captured,changes,notes:[],rereadIds:changes.map((r:any)=>r.id),workerEvidence:evidence+'/'+path.basename(file),independentFindingDispositions:artifact.reviews.map((r:any)=>({id:r.id,disputeIndex:r.originalDisputeIndex,decision:changes.some((c:any)=>c.id===r.id)?'amend':'retain-with-reason',reason:r.reason,workerEvidence:evidence+'/'+path.basename(file)}))};
fs.writeFileSync('D:/tmp/concept-student-clear-20261006/middle-resume-'+label+'-ctx_9cb9b54195a9.json',JSON.stringify(spec,null,2)+'\n');
console.log(JSON.stringify({rows:artifact.reviews.length,changes:changes.length,evidence,input:captured}));
