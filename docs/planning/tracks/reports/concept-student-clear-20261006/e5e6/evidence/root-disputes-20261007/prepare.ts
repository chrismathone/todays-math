import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeProposal,proposedEntry} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import {workerFingerprint} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/editorial';
import {splitBlankSentence} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/contracts/conceptBlank.contract';
import {bankNotationFaults} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/notation';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e5e6';const out=root+'/evidence/root-disputes-20261007';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));const write=(n:string,v:any)=>writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n');
const before=read(out+'/before-actualrows-and-normalized.json');
const decisions=readdirSync(out).filter(n=>/^decisions-\d+\.json$/.test(n)).flatMap(n=>read(out+'/'+n).decisions);
if(existsSync(out+'/reread-supplemental-decisions.json'))for(const s of read(out+'/reread-supplemental-decisions.json').decisions){const d=decisions.find((d:any)=>d.id===s.id);Object.assign(d.patch,s.patch);d.reason+=' '+s.reason;d.supplementalReadAt=s.readAt;}
if(decisions.length!==235||new Set(decisions.map((d:any)=>d.id)).size!==235)throw Error('Decision coverage');
const baseline=read('D:/tmp/concept-student-clear-20261006/baseline.json');const originals=new Map(Object.values(baseline.parts).flatMap((b:any)=>b.concepts.map((e:any)=>[e.id,e])));
const targets:any[]=[];const failures:any[]=[];
for(const t of before.targets){
 const r=structuredClone(t.actualRow);const d=decisions.find((d:any)=>d.id===r.id);const p=d.patch;
 if('prompt'in p){r.bPrompt=p.prompt;r.bQuestion.prompt=p.prompt;}
 if('answer'in p){r.bAnswer=p.answer;r.bQuestion.answer=p.answer;}
 if('ideas'in p){r.bRequiredIdeas=p.ideas.map((anyOf:any)=>({anyOf}));r.bQuestion.requiredIdeas=r.bRequiredIdeas;}
 if('excludeB'in p){r.bDecision='exclude';r.bQuestion=null;r.bReason=p.excludeB;r.questionExclusions.term=p.excludeB;}
 if('excludeC'in p){r.cDecision='exclude';r.clozeQuestion=null;r.cReason=p.excludeC;r.questionExclusions.cloze=p.excludeC;}
 if('sentence'in p){r.cDecision='revise';r.clozeQuestion={sentence:p.sentence,acceptedAnswers:p.accepted};delete r.questionExclusions.cloze;}
 else if('accepted'in p){r.clozeQuestion.acceptedAnswers=p.accepted;}
 if('sentence'in p||'accepted'in p){
  const c=r.clozeQuestion, pieces=splitBlankSentence(c.sentence), keys=pieces.filter(p=>p.kind==='key').map(p=>p.text);
  r.cAfter=c.sentence;r.cMarkedSentence=c.sentence;r.cStudentAfter=r.cStudentSentence=pieces.map(p=>p.kind==='key'?'□':p.text).join('');r.cProposedAnswers=keys;
  r.cAcceptedAnswers=c.acceptedAnswers.map((anyOf:any)=>({anyOf}));r.cSlotAnswers=keys.map((key:string,i:number)=>({key,equivalents:c.acceptedAnswers[i].filter((v:string)=>v!==key)}));
 }
 for(const k of ['coreAfter','coreReason'])if(k in p)r[k]=p[k];
 if(d.verdict==='revise'){
  if('prompt'in p||'answer'in p||'ideas'in p){r.bDecision='revise';r.bReason=d.reason;}
  if('sentence'in p||'accepted'in p)r.cReason=d.reason;
  r.rootDisputeAmendment={dispatchId:'ctx_006010d1494b',beforeNormalizedHash:t.normalized.hash,decisionEvidence:`evidence/root-disputes-20261007/decisions-${String(Math.floor(d.index/25)*25).padStart(3,'0')}.json`,independentApproval:false};
 }
 r.proposalFingerprint=workerFingerprint('e5e6',r);
 if(d.verdict==='revise')r.questionRevision='planning-e5e6-20261007-'+r.proposalFingerprint.slice(0,12);
 try{
  const normalized=normalizeProposal(r,originals.get(r.id) as any)!;if(!normalized)throw Error('incomplete');
  const entry=proposedEntry(normalized), notation=bankNotationFaults({concepts:[entry],ox:[],apply:[],figures:[]} as any);if(notation.length)failures.push({id:r.id,notation});
  const currentIndependent=normalized.hash===t.normalized.hash?t.currentIndependent:[];
  const originalFullVerdicts=t.negatives.map((n:any)=>{const path='D:/tmp/concept-student-clear-20261006/independent-cohorts/'+n.evidence;const v=read(path+'-result.json');return {packet:n.evidence,inputSha256:createHash('sha256').update(readFileSync(path+'-source.json')).digest('hex'),blind:v.blind.filter((x:any)=>x[0]===r.id),key:v.keyed.filter((x:any)=>x[0]===r.id)};});
  targets.push({...t,actualRow:r,normalized,studentSentence:r.clozeQuestion?splitBlankSentence(r.clozeQuestion.sentence).map(p=>p.kind==='key'?'□':p.text).join(''):null,decision:d,currentIndependent,originalFullVerdicts});
 }catch(e){failures.push({id:r.id,error:String(e)});}
}
write('after-actualrows-and-normalized.json',{preparedAt:new Date().toISOString(),targets});
for(let start=0;start<targets.length;start+=25)write(`after-batch-${String(start).padStart(3,'0')}.json`,targets.slice(start,start+25));
write('prepare-validation.json',{targets:targets.length,failures});console.log(JSON.stringify({targets:targets.length,revised:decisions.filter((d:any)=>d.verdict==='revise').length,retained:decisions.filter((d:any)=>d.verdict==='retain').length,failures}));
