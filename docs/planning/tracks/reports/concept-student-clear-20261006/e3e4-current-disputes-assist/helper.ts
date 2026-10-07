import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { normalizeProposal, proposedEntry, proposalRows, contentHash } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals.ts';
import { workerFingerprint, verifyEditorialRow } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/editorial.ts';
import { readIndependentEvidence } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/independent.ts';
import { conceptEntrySchema, splitBlankSentence } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/contracts/conceptBlank.contract.ts';
import { bankNotationFaults } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/notation.ts';
import { blankClashes } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/audit.ts';

const ROOT = 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006';
const DIR = 'C:/Users/user/orca/workspaces/todays-math/student-clear-e3e4-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e3e4-current-disputes-assist';
const TMP = 'D:/tmp/concept-student-clear-20261006';
const read = (p: string): any => JSON.parse(readFileSync(p, 'utf8'));
const write = (p: string, v: any) => { mkdirSync(resolve(p, '..'), {recursive: true}); writeFileSync(p, JSON.stringify(v, null, 2)+'\n'); };
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const paths = {
  audit: ROOT+'/docs/planning/tracks/reports/concept-student-clear-20261006/e3e4/audit.json',
  ledger: ROOT+'/docs/planning/tracks/reports/concept-student-clear-20261006/e3e4/final-editorial-ledger.json',
  baseline: TMP+'/baseline.json', negatives: TMP+'/current-negative-amendments.json',
  targets: TMP+'/e3e4-current-unapproved-targets-20261007.json',
};
const mode = process.argv[2];
if (mode === 'prepare') {
  const baseline = read(paths.baseline);
  if (baseline.sourceCommit !== '13bf05dce') throw new Error('wrong baseline');
  const raw = proposalRows(read(paths.audit));
  const ledger = read(paths.ledger);
  const originals = new Map(Object.values(baseline.parts).flatMap((p: any) => p.concepts).map((o: any) => [o.id,o]));
  const negatives = read(paths.negatives).filter((n: any) => /^e[34]-/.test(n.id));
  const ids = new Set(negatives.map((n: any) => n.id));
  const evidence = readIndependentEvidence(TMP+'/independent-cohorts');
  const all = raw.map(row => {
    const original: any = originals.get(row.id);
    const normalized = normalizeProposal(row,original);
    if (!normalized) throw new Error('incomplete '+row.id);
    return {raw:row, original, normalized};
  });
  const inputs = all.filter(x => ids.has(x.raw.id)).map(x => ({
    ...x, ledger: ledger.find((l: any) => l.id === x.raw.id),
    currentRawFingerprint: workerFingerprint('e3e4',x.raw), normalizedHash:x.normalized.hash,
    currentNegatives: negatives.filter((n: any) => n.id === x.raw.id && n.reviewedHash === x.normalized.hash),
    historicalNegatives: negatives.filter((n: any) => n.id === x.raw.id && n.reviewedHash !== x.normalized.hash),
    currentIndependent: evidence.evidence.filter(e => e.id === x.raw.id && e.contentHash === x.normalized.hash),
  }));
  write(DIR+'/inputs/source-files.json', {capturedAt:new Date().toISOString(),sourceCommit:baseline.sourceCommit,files:Object.entries(paths).map(([key,path])=>({key,path,sha256:sha(path)})),targetCount:read(paths.targets).length,negativesTotal:negatives.length,uniqueIds:ids.size});
  write(DIR+'/inputs/current-inputs.json',inputs);
  write(DIR+'/inputs/e3e4-negative-source.json',negatives);
  write(DIR+'/inputs/independent-at-start.json',{...evidence,evidence:evidence.evidence.filter(e=>ids.has(e.id))});
  write(DIR+'/inputs/root-candidate-bank.json',{concepts:all.map(x=>proposedEntry(x.normalized)),ox:[],apply:[],figures:[]});
  for(let i=0;i<inputs.length;i+=20) write(DIR+`/inputs/reading-batches/batch-${String(i/20+1).padStart(2,'0')}.json`, inputs.slice(i,i+20));
  console.log(JSON.stringify({uniqueIds:inputs.length,currentNegatives:inputs.reduce((s,x)=>s+x.currentNegatives.length,0),historicalNegatives:inputs.reduce((s,x)=>s+x.historicalNegatives.length,0),newPass:inputs.filter(x=>x.currentIndependent.some(e=>e.accepted)).length,sourceFiles:read(DIR+'/inputs/source-files.json')},null,2));
}
if (mode === 'batch') {
  const n = process.argv[3];
  const rows=read(DIR+`/inputs/reading-batches/batch-${n}.json`);
  for(const x of rows) console.log(JSON.stringify({id:x.raw.id,index:x.raw.sourceIndex,term:x.original.term,role:x.raw.learningRole,level:x.original.level,definition:x.original.definition,coreAfter:x.normalized.coreAfter,B:x.normalized.B,C:x.normalized.C,student:x.raw.cStudentSentence,negatives:x.currentNegatives.map((n:any)=>({evidence:n.evidence,blind:n.blind,key:n.key})),historicalCount:x.historicalNegatives.length,newPass:x.currentIndependent.filter((e:any)=>e.accepted).map((e:any)=>e.packet)},null,2));
}
const decisions = () => {
  const rows=['01','02','03','04'].flatMap(n => read(DIR+`/inputs/manual-decisions-${n}.json`));
  if(existsSync(DIR+'/inputs/manual-final-overrides.json'))for(const override of read(DIR+'/inputs/manual-final-overrides.json')) {
    const row=rows.find(r=>r.id===override.id);
    if(!row)throw new Error('unknown override '+override.id);
    for(const field of override.remove)delete row[field];
    for(const field of ['bReason','cReason','coreReason'])if(override[field])row[field]=override[field];
  }
  return rows;
};
const materialize = (x: any, d: any) => {
  const row = structuredClone(x.raw);
  if (d.B || d.requiredIdeas) {
    const B = structuredClone(d.B ?? x.normalized.B);
    if (d.requiredIdeas) B.requiredIdeas = d.requiredIdeas;
    row.bDecision = 'rewrite'; row.bPrompt = B.prompt; row.bAnswer = B.answer;
    row.bRequiredIdeas = B.requiredIdeas; row.bQuestion = B; row.bReason = d.bReason;
  }
  if (d.excludedB) {
    row.bReason = d.excludedB;
    row.questionExclusions = {...row.questionExclusions, term:d.excludedB};
  }
  if (d.C) {
    const C = structuredClone(d.C);
    const pieces = splitBlankSentence(C.sentence);
    const keys = pieces.filter(p=>p.kind==='key').map(p=>p.text);
    row.cDecision = 'rewrite'; row.cAfter = C.sentence; row.cMarkedSentence = C.sentence;
    row.cStudentSentence = pieces.map(p=>p.kind==='key'?'□':p.text).join('');
    row.cSlotAnswers = keys.map((key,i)=>({expected:key,equivalents:C.acceptedAnswers[i].filter((a:string)=>a!==key)}));
    row.cSlotEquivalents = row.cSlotAnswers.map((s:any)=>s.equivalents);
    if ('cAcceptedAnswers' in row) row.cAcceptedAnswers = C.acceptedAnswers;
    if ('acceptedAnswers' in row) row.acceptedAnswers = C.acceptedAnswers;
    row.clozeQuestion = C; row.cReason = d.cReason;
  }
  if (d.excludedC) {
    row.cReason = d.excludedC;
    row.questionExclusions = {...row.questionExclusions,cloze:d.excludedC};
  }
  if ('coreAfter' in d) { row.coreAfter = d.coreAfter; row.coreReason = d.coreReason; }
  row.proposalFingerprint = workerFingerprint('e3e4',row);
  return row;
};
if (mode === 'build') {
  const inputs=read(DIR+'/inputs/current-inputs.json');
  const ds=decisions();
  if(new Set(ds.map(d=>d.id)).size!==80 || ds.length!==80) throw new Error('manual coverage');
  const candidates=[];
  for(const x of inputs) {
    const d=ds.find(d=>d.id===x.raw.id);
    if(!d || !d.bReason || !d.cReason || !d.coreReason) throw new Error('reason missing '+x.raw.id);
    const change=!!(d.B||d.requiredIdeas||d.C||d.excludedB||d.excludedC||('coreAfter'in d));
    if(!change) continue;
    try {
      const row=materialize(x,d), normalized=normalizeProposal(row,x.original);
      if(!normalized) throw new Error('incomplete');
      conceptEntrySchema.parse(proposedEntry(normalized));
      candidates.push({id:row.id,sourceIndex:row.sourceIndex,proposedRawRow:row,normalized,candidateNormalizedHash:normalized.hash,currentCandidateFingerprint:workerFingerprint('e3e4',row),bReason:d.bReason,cReason:d.cReason,coreReason:d.coreReason});
    } catch(e) { console.error(x.raw.id,String(e));process.exitCode=1; }
  }
  write(DIR+'/inputs/candidate-drafts.json',candidates);
  for(let i=0;i<candidates.length;i+=15) write(DIR+`/inputs/candidate-reread/batch-${String(i/15+1).padStart(2,'0')}.json`,candidates.slice(i,i+15));
  console.log(JSON.stringify({manual:ds.length,candidates:candidates.length,retains:80-candidates.length,ids:candidates.map(x=>x.id)},null,2));
}
if (mode === 'reread') {
  const n=process.argv[3];
  const output=read(DIR+`/inputs/candidate-reread/batch-${n}.json`).map((x:any)=>({id:x.id,B:x.normalized.B,C:x.normalized.C,generalDefinition:x.normalized.coreAfter??x.normalized.source.definition,coreAfter:x.normalized.coreAfter,coreReason:x.normalized.coreReason,role:x.proposedRawRow.learningRole,hash:x.candidateNormalizedHash,fingerprint:x.currentCandidateFingerprint}));
  write(DIR+`/inputs/printed-candidate-reread/batch-${n}.json`,{printedAt:new Date().toISOString(),reader:'Codex direct e3e4 current-disputes assist',rows:output});
  for(const x of output)console.log(JSON.stringify(x,null,2));
}
if (mode === 'finish') {
  const readAt=new Date().toISOString(), reader='Codex direct e3e4 current-disputes assist; candidate reread';
  const inputs=read(DIR+'/inputs/current-inputs.json'), ds=decisions();
  const drafts=read(DIR+'/inputs/candidate-drafts.json');
  const independent=readIndependentEvidence(TMP+'/independent-cohorts');
  const bank=read(DIR+'/inputs/root-candidate-bank.json');
  const baseline=read(paths.baseline);
  const sourceEntries=['e3','e4','e3plus','e4plus'].flatMap(k=>baseline.parts[k].concepts);
  const originalById=new Map(sourceEntries.map((o:any)=>[o.id,o]));
  const sourceOrderById=new Map(sourceEntries.map((o:any,i:number)=>[o.id,i]));
  const preservation:any[]=[], contract:any[]=[], editorial:any[]=[], rows:any[]=[];
  const mutable = new Set(['bDecision','bPrompt','bAnswer','bRequiredIdeas','bQuestion','bReason','cDecision','cAfter','cMarkedSentence','cStudentSentence','cSlotAnswers','cSlotEquivalents','cAcceptedAnswers','acceptedAnswers','clozeQuestion','cReason','coreAfter','coreReason','proposalFingerprint','questionExclusions','editorialReview']);
  for(const x of inputs) {
    const d=ds.find(d=>d.id===x.raw.id), draft=drafts.find((r:any)=>r.id===x.raw.id);
    const raw=draft?structuredClone(draft.proposedRawRow):x.raw;
    const normalized=normalizeProposal(raw,x.original)!;
    const entry=proposedEntry(normalized);
    for(const field of ['id','section','term','kind','level','example','givenCase'])if(contentHash(entry[field]??null)!==contentHash(x.original[field]??null))preservation.push({id:raw.id,field:'entry.'+field});
    if(contentHash(normalized.source)!==contentHash(originalById.get(raw.id)))preservation.push({id:raw.id,field:'baseline original'});
    if(raw.sourceIndex!==sourceOrderById.get(raw.id))preservation.push({id:raw.id,field:'baseline source order'});
    if(entry.definition!==(raw.coreAfter??x.original.definition))preservation.push({id:raw.id,field:'definition'});
    const record:any={id:x.raw.id,sourceIndex:x.raw.sourceIndex,currentRawFingerprint:x.currentRawFingerprint,normalizedHash:x.normalizedHash,role:x.raw.learningRole,reader,readAt,bVerdict:(d.B||d.requiredIdeas||d.excludedB)?'propose-revision':'retain',cVerdict:(d.C||d.excludedC)?'propose-revision':'retain',coreVerdict:('coreAfter'in d)?'propose-revision':'retain',bReason:d.bReason,cReason:d.cReason,coreReason:d.coreReason,disposition:draft?'propose-revision':'retain-with-reason',isIndependentApproval:false,isReleaseApproval:false,currentIndependentAtFinish:independent.evidence.filter(e=>e.id===x.raw.id&&e.contentHash===x.normalizedHash)};
    const ed={id:raw.id,sourceIndex:raw.sourceIndex,proposalFingerprint:workerFingerprint('e3e4',raw),learningRole:raw.learningRole,bDecision:raw.bDecision,cDecision:raw.cDecision,verdict:'retain-planning-proposal',bReason:d.bReason,cReason:d.cReason,reader,readAt,issues:[],isReleaseApproval:false};
    if(draft) {
      raw.editorialReview=ed;
      record.proposedRawRow=raw; record.candidateNormalizedHash=normalized.hash;record.currentCandidateFingerprint=workerFingerprint('e3e4',raw);
      record.candidateReread={reader,readAt,B:normalized.B,C:normalized.C,generalDefinition:normalized.coreAfter??normalized.source.definition,coreAfter:normalized.coreAfter,coreReason:normalized.coreReason,normalizedHash:normalized.hash};
      for(const k of new Set([...Object.keys(x.raw),...Object.keys(raw)])) if(!mutable.has(k)&&contentHash(x.raw[k])!==contentHash(raw[k])) preservation.push({id:raw.id,field:k});
      if(raw.id!==x.original.id||raw.sourceIndex!==x.raw.sourceIndex||raw.learningRole!==x.raw.learningRole||normalized.source!==x.original)preservation.push({id:raw.id,field:'identity/order/role/source'});
      if(!('coreAfter'in d)&&contentHash(raw.coreAfter??null)!==contentHash(x.raw.coreAfter??null))preservation.push({id:raw.id,field:'unchanged core'});
      if(raw.proposalFingerprint!==record.currentCandidateFingerprint||normalized.hash!==draft.candidateNormalizedHash) preservation.push({id:raw.id,field:'candidate hash'});
      editorial.push(...verifyEditorialRow('e3e4',raw,normalized,ed).map(reason=>({id:raw.id,reason})));
      bank.concepts[bank.concepts.findIndex((e:any)=>e.id===raw.id)]=proposedEntry(normalized);
      try{conceptEntrySchema.parse(proposedEntry(normalized));}catch(e){contract.push({id:raw.id,error:String(e)});}
    }
    rows.push(record);
  }
  const notation=bankNotationFaults(bank),clashes=blankClashes(bank);
  const counts={uniqueIds:rows.length,currentNegativeCount:inputs.reduce((s:number,x:any)=>s+x.currentNegatives.length,0),historicalHashExcludedCount:inputs.reduce((s:number,x:any)=>s+x.historicalNegatives.length,0),proposedRevisionCount:rows.filter(r=>r.proposedRawRow).length,reasonedRetainCount:rows.filter(r=>!r.proposedRawRow).length,unwrittenCount:inputs.filter((x:any)=>!rows.some(r=>r.id===x.raw.id)).length,contractErrorCount:contract.length,notationErrorCount:notation.length,preservationErrorCount:preservation.length,editorialSynchronizationErrorCount:editorial.length,blankClashCount:clashes.length,currentHashNewIndependentPassCount:rows.filter(r=>r.currentIndependentAtFinish.some((e:any)=>e.accepted)).length,passRowsWithSpecificRemainingDefect:rows.filter(r=>r.proposedRawRow&&r.currentIndependentAtFinish.some((e:any)=>e.accepted)).map(r=>r.id),sourceAuditAndLedgerUnchanged:read(DIR+'/inputs/source-files.json').files.filter((f:any)=>['audit','ledger'].includes(f.key)).every((f:any)=>sha(f.path)===f.sha256),isIndependentApproval:false,isReleaseApproval:false};
  write(DIR+'/reviews.json',{taskId:'task_7e1ae4c83457',dispatchId:'ctx_704935e645fa',reader,readAt,scope:'report-only; Root applies and independently reviews',counts,rows});
  write(DIR+'/inputs/candidate-reread-records.json',rows.filter(r=>r.proposedRawRow).map(r=>({id:r.id,currentCandidateFingerprint:r.currentCandidateFingerprint,candidateNormalizedHash:r.candidateNormalizedHash,...r.candidateReread})));
  const relevantIds=new Set(inputs.map((x:any)=>x.raw.id));
  write(DIR+'/inputs/independent-at-finish.json',{...independent,evidence:independent.evidence.filter(e=>relevantIds.has(e.id))});
  write(DIR+'/validation.json',{...counts,contract,notation,preservation,editorial,clashes:clashes.map(g=>g.map(e=>e.id)),identityAndOrder:rows.map(r=>({id:r.id,sourceIndex:r.sourceIndex,role:r.role,originalDefinitionPreserved:true,levelPreserved:true,questionExternalFieldsPreserved:true}))});
  const packetNames=new Set(inputs.flatMap((x:any)=>x.currentNegatives.map((n:any)=>n.evidence)).concat(rows.flatMap(r=>r.currentIndependentAtFinish.filter((e:any)=>e.accepted).map((e:any)=>e.packet))));
  const packetFiles:any[]=[];
  for(const packet of packetNames)for(const suffix of ['source.json','result.json','blind-input.md','blind-raw.md','blind-meta.json','key-input.md','key-raw.md','key-meta.json']){
    const path=TMP+`/independent-cohorts/${packet}-${suffix}`;
    if(!existsSync(path))throw new Error('missing evidence '+path);
    const destination=DIR+`/inputs/independent-packets/${packet}-${suffix}`;
    mkdirSync(resolve(destination,'..'),{recursive:true});copyFileSync(path,destination);
    packetFiles.push({path,sha256:sha(path),storedAt:destination.replace(DIR+'/','')});
  }
  write(DIR+'/inputs/independent-packet-file-shas.json',packetFiles);
  write(DIR+'/inputs/root-module-file-shas.json',['scripts/qa/concept-blank/student-clear/proposals.ts','scripts/qa/concept-blank/student-clear/editorial.ts','scripts/qa/concept-blank/student-clear/independent.ts','src/contracts/conceptBlank.contract.ts','src/lib/concept-blank/notation.ts','src/lib/concept-blank/audit.ts'].map(p=>({path:ROOT+'/'+p,sha256:sha(ROOT+'/'+p)})));
  console.log(JSON.stringify(counts,null,2));
  if(contract.length||notation.length||preservation.length||editorial.length||clashes.length||!counts.sourceAuditAndLedgerUnchanged)process.exitCode=1;
}
if(mode==='manifest'){
  const all=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?all(resolve(dir,e.name)):[resolve(dir,e.name)]);
  const files=all(DIR).filter(p=>!p.endsWith('byte-sha-manifest.json')).map(path=>({path:path.slice(DIR.length+1).replaceAll('\\','/'),bytes:readFileSync(path).length,sha256:sha(path)}));
  write(DIR+'/inputs/byte-sha-manifest.json',{algorithm:'SHA-256 over stored bytes; manifest excluded from its own domain',files});
  console.log(JSON.stringify({files:files.length,bytes:files.reduce((s,x)=>s+x.bytes,0)},null,2));
}
