import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {normalizeProposal,proposedEntry,contentHash} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import {workerFingerprint,verifyEditorialRow} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/editorial';
import {splitBlankSentence} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/contracts/conceptBlank.contract';
import {bankNotationFaults} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/notation';
import {blankClashes} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/audit';
const repo='C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006';const relativeRoot='docs/planning/tracks/reports/concept-student-clear-20261006/e5e6';const root=repo+'/'+relativeRoot,out=root+'/evidence/root-disputes-20261007';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const audit=read(root+'/audit.json'),rows=audit.rows,ledger=read(root+'/codex-final-editorial.json').rows;
const source=read('D:/tmp/concept-student-clear-20261006/e5e6.json'),baseline=read('D:/tmp/concept-student-clear-20261006/baseline.json');
const originals=new Map(Object.values(baseline.parts).flatMap((b:any)=>b.concepts.map((e:any)=>[e.id,e])));
const frozen=JSON.parse(execFileSync('git',['show','ad78cd2b75d03708ef8bfef704f101d7d4304c72:'+relativeRoot+'/audit.json'],{cwd:repo,encoding:'utf8',maxBuffer:60000000}));
const targetRows=read(out+'/after-actualrows-and-normalized.json').targets;const targetMap=new Map(targetRows.map((t:any)=>[t.id,t]));
const sorted=(v:any):any=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
const proof=new Map<string,any>();const issues:any[]=[];const entries:any[]=[];const currentHashes:any[]=[];const changedPayload:any[]=[];const changedRows:any[]=[];
function matching(v:any,id:string,fp:string):any[]{if(!v||typeof v!=='object')return[];const a=v.id===id&&v.proposalFingerprint===fp?[v]:[];for(const c of Object.values(v))if(c&&typeof c==='object')a.push(...matching(c,id,fp));return a;}
assert.equal(rows.length,2621);assert.equal(ledger.length,2621);assert.equal(source.entries.length,2621);assert.equal(sha('D:/tmp/concept-student-clear-20261006/e5e6.json'),audit.sourceSha256);assert.deepEqual(rows,read(root+'/partial-audit.json').rows);
for(let i=0;i<rows.length;i++){
 const r=rows[i],l=ledger[i],old=frozen.rows[i];
 try{
  assert.equal(r.id,source.entries[i].id);assert.equal(r.sourceIndex,i);assert.deepEqual(r.source,source.entries[i]);assert.equal(r.sourceFingerprint,contentHash(sorted(r.source)));assert.equal(r.sourceFingerprint,old.sourceFingerprint);assert.equal(r.source.level,old.source.level);assert.equal(r.requiredDiagramPaths===undefined?null:JSON.stringify(r.requiredDiagramPaths),old.requiredDiagramPaths===undefined?null:JSON.stringify(old.requiredDiagramPaths));
  assert.equal(workerFingerprint('e5e6',r),r.proposalFingerprint);const p=normalizeProposal(r,originals.get(r.id) as any)!;assert.ok(p);assert.deepEqual(verifyEditorialRow('e5e6',r,p,l),[]);
  assert.deepEqual(r.codexFinalEditorial,l);
  const file=resolve(root,l.inputEvidence);if(!proof.has(file))proof.set(file,read(file));if(targetMap.has(r.id))assert.equal(sha(file),l.inputSha256);
  assert.ok(matching(proof.get(file),r.id,r.proposalFingerprint).some(node=>node.bQuestion!==undefined&&node.clozeQuestion!==undefined&&workerFingerprint('e5e6',node)===r.proposalFingerprint||Object.hasOwn(node,'B')&&Object.hasOwn(node,'C')&&contentHash(node.B??{excluded:node.exclusions?.term})===contentHash(p.B)&&contentHash(node.C??{excluded:node.exclusions?.cloze})===contentHash(p.C)&&(node.coreAfter??null)===(r.coreAfter??null)&&node.learningRole===r.learningRole),r.id+': actual captured B/C payload');
  if('sentence'in p.C){assert.equal(r.cStudentSentence,splitBlankSentence(p.C.sentence).map(x=>x.kind==='key'?'□':x.text).join(''));assert.deepEqual(r.cSlotAnswers.map((s:any)=>s.key),splitBlankSentence(p.C.sentence).filter(x=>x.kind==='key').map(x=>x.text));}
  const t:any=targetMap.get(r.id);if(t)assert.deepEqual(p,t.normalized);else assert.deepEqual(r,old);
  const oldNormalized=normalizeProposal(old,originals.get(r.id) as any)!;if(p.hash!==oldNormalized.hash)changedPayload.push(r.id);if(JSON.stringify(r)!==JSON.stringify(old))changedRows.push(r.id);
  currentHashes.push({id:r.id,sourceIndex:i,normalizedHash:p.hash,proposalFingerprint:r.proposalFingerprint});entries.push(proposedEntry(p));
 }catch(e){issues.push({id:r.id,error:String(e)});}
}
const notation=bankNotationFaults({concepts:entries,ox:[],apply:[],figures:[]} as any),clashes=blankClashes({concepts:entries,ox:[],apply:[],figures:[]} as any).map(g=>g.map(r=>r.id));
const preservedFiles=read(out+'/before-files-manifest.json').filter((f:any)=>!['audit.json','partial-audit.json','codex-final-editorial.json'].includes(f.file));const alteredFrozenFiles=preservedFiles.filter((f:any)=>sha(root+'/'+f.file)!==f.sha256);
const protectedComparisons=['e6-2-1-1-xc11','e6-2-1-1-xc12'].map(id=>{const r=rows.find((r:any)=>r.id===id),o=frozen.rows.find((r:any)=>r.id===id);return {id,unchanged:JSON.stringify(r)===JSON.stringify(o),sentence:r.clozeQuestion.sentence};});
assert.equal(changedPayload.length,153);assert.equal(changedRows.length,235);assert.equal(alteredFrozenFiles.length,0);assert.ok(protectedComparisons.every(r=>r.unchanged));
const counts={parts:Object.fromEntries([...new Set(rows.map((r:any)=>r.part))].map(part=>[part,rows.filter((r:any)=>r.part===part).length])),bDecisions:Object.fromEntries(['revise','exclude','keep'].map(x=>[x,rows.filter((r:any)=>r.bDecision===x).length])),cDecisions:Object.fromEntries(['keep','revise','exclude'].map(x=>[x,rows.filter((r:any)=>r.cDecision===x).length])),coreAfter:rows.filter((r:any)=>r.coreAfter).length,exampleNeeded:rows.filter((r:any)=>r.exampleNeeded).length};
const result={validatedAt:new Date().toISOString(),rows:rows.length,entries:entries.length,ledgerRows:ledger.length,proofFiles:proof.size,sourceOrderAndOriginalsPreserved:issues.length===0,sourceAndProposalAndEditorialFingerprintsChecked:true,actualNormalizedPayloadMatchesReread:true,partialRowsMatch:true,issues,notation,clashes,counts,currentMetadataCountsMatch:JSON.stringify(counts)===JSON.stringify(audit.counts),frozenFilesChecked:preservedFiles.length,alteredFrozenFiles,protectedComparisons,changedNormalizedHashIds:changedPayload,changedAuditRowIds:changedRows,independentApproval:false,independentPendingTargetCount:235,releaseReady:false};
writeFileSync(out+'/full-validation.json',JSON.stringify(result,null,2)+'\n');writeFileSync(out+'/full-2621-current-hashes.json',JSON.stringify(currentHashes,null,2)+'\n');console.log(JSON.stringify({...result,changedNormalizedHashIds:changedPayload.length,changedAuditRowIds:changedRows.length}));if(issues.length||notation.length||clashes.length||!result.currentMetadataCountsMatch)process.exitCode=1;
