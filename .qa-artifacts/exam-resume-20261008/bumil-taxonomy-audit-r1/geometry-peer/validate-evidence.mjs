import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const parent='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const root=process.cwd();
const folder=path.resolve(root,'.qa-artifacts/exam-resume-20261008/bumil-taxonomy-audit-r1/geometry-peer');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const {bindCandidate,digest}=await import(pathToFileURL(`${parent}/scripts/import/exam-twin/candidatePack.mjs`).href);
const binding=read(path.join(folder,'input-bindings.json'));
const repo=read(path.join(folder,'repository-evidence.json'));
const rules=read(path.join(folder,'rule-evidence.json'));
const preserve=read(path.join(folder,'preservation-manifest.json'));
const sourceTaxonomy=read(path.join(folder,'source-taxonomy-links.json'));
const freshEvidence=read(path.join(folder,'fresh-bank-evidence.json'));
assert.deepEqual(binding.scope,[5,10,18]);
for(const entry of preserve.entries)assert.equal(sha(entry.file),entry.sha256,`frozen bytes changed: ${entry.file}`);
assert.equal(preserve.ownPriorFilesChecked,61);
assert.equal(repo.units.length,5);assert.equal(repo.registryEntries.length,62);assert.equal(repo.probes.length,14);
assert.equal(sha(sourceTaxonomy.path),sourceTaxonomy.sha256);
assert.equal(sha(freshEvidence.path),freshEvidence.sha256);
assert.equal(sha(freshEvidence.addendum3.path),freshEvidence.addendum3.sha256);
const oldBank=read(binding.snapshot.bank.path),freshBank=read(freshEvidence.path);
const byId=(a,b)=>a.id.localeCompare(b.id);
const byFamily=(a,b)=>(a.unit_id+'|'+a.family_key).localeCompare(b.unit_id+'|'+b.family_key);
assert.deepEqual([...oldBank.units].sort(byId),[...freshBank.units].sort(byId));
assert.deepEqual([...oldBank.liveFamilies].sort(byFamily),[...freshBank.liveFamilies].sort(byFamily));
assert.equal(freshBank.protectedRowCount,82);assert.equal(freshBank.unlocked,0);assert.equal(freshBank.productionWrites,0);
assert.equal(freshBank.identityMismatches,0);assert.equal(freshBank.correctionMismatches,0);
assert.deepEqual(sourceTaxonomy.selected.map(q=>q.n).sort((a,b)=>a-b),[5,10,18]);
assert(repo.files.every(f=>f.allThreeCheckoutsByteIdentical));
for(const rule of rules.records){
 assert.equal(sha(rule.path),rule.fileSha256);
 const lines=fs.readFileSync(rule.path,'utf8').split(/\r?\n/);
 assert.equal(lines.slice(rule.lines1Based[0]-1,rule.lines1Based[1]).join('\n'),rule.excerpt);
 assert.equal(createHash('sha256').update(rule.excerpt).digest('hex'),rule.excerptSha256);
}
const decisions=[];
for(const q of [5,10,18]){
 const nn=String(q).padStart(2,'0');
 const sidecar=read(path.join(folder,`q${nn}.classification.json`));
 const entry=binding.selected.find(e=>e.questionNumber===q);
 const b=bindCandidate(`${parent}/.qa-artifacts/exam-resume-20261008/bumil-review-r${entry.round}/package/private/q${nn}/candidate.json`);
 for(const key of ['studentDigest','candidateDigest','assetDigest'])assert.equal(sidecar.binding[key],b[key]);
 const review=read(entry.review.path);
 assert.equal(digest(review),sidecar.binding.reviewCanonicalDigest);assert.equal(sha(entry.review.path),sidecar.binding.reviewRawSha256);
 assert.equal(digest(read(entry.solve.path)),sidecar.binding.solveDigest);
 assert.equal(sidecar.binding.inputBindingsSha256,sha(path.join(folder,'input-bindings.json')));
 assert.equal(sidecar.evidenceFiles.repositorySha256,sha(path.join(folder,'repository-evidence.json')));
 assert.equal(sidecar.evidenceFiles.rulesSha256,sha(path.join(folder,'rule-evidence.json')));
 assert.equal(sidecar.evidenceFiles.exactCalculationsSha256,sha(path.join(folder,'exact-calculations.json')));
 assert.equal(sidecar.evidenceFiles.sourceTaxonomyLinksSha256,sha(path.join(folder,'source-taxonomy-links.json')));
 assert.equal(sidecar.evidenceFiles.freshParentBankSha256,sha(path.join(folder,'fresh-bank-evidence.json')));
 assert.equal(sidecar.snapshotScope.bank.path,binding.snapshot.bank.path);
 assert.equal(sidecar.snapshotScope.additionalFreshParentBank.conclusionsChanged,false);
 const originalTaxonomy=sourceTaxonomy.selected.find(s=>s.n===q);
 assert.equal(originalTaxonomy.sourceContentSha256,sidecar.binding.sourceContentSha256);
 assert.equal(originalTaxonomy.sourceExternalId,sidecar.binding.sourceExternalId);
 assert.equal(sidecar.status,'pending');assert.equal(sidecar.proposedFamilyKey,null);assert.equal(sidecar.fullUnitFamilyMatchSupported,false);
 assert.equal(sidecar.boundary.finalApproval,false);assert.equal(sidecar.boundary.loadable,false);assert.equal(sidecar.boundary.DBAccess,false);
 const unit=repo.units.find(u=>u.snapshotRow.id===sidecar.unitProposal.unitId);
 assert(unit);assert.equal(unit.snapshotRow.section,sidecar.unitProposal.section);
 for(const c of sidecar.familyComparisons){
  const row=repo.registryEntries.find(r=>r.familyKey===c.familyKey);
  assert(row);assert.equal(row.snapshotUnitId,c.unitId);assert.equal(row.snapshotLiveCount,c.snapshotLiveCount);
  const all=Object.values(c.fullMatchDimensions).every(v=>v===true);
  assert.equal(c.fullNewCandidateSupported,all);assert.equal(all,false);
  assert(rules.records.find(r=>r.id===c.ruleEvidenceId));assert(c.unsupportedPart);
 }
 assert(sidecar.familyDecision.reopenCriteria.length>=2);
 assert.equal(sidecar.difficultyAndFormat.problemTypeLabelFromNativeContract,true);
 assert.equal(sidecar.difficultyAndFormat.choiceCount,5);assert.equal(sidecar.difficultyAndFormat.score,4);
 assert.equal(sidecar.newSolutionPurpose.newBlindSolveClaimed,false);
 if(q===10){assert.equal(entry.round,5);assert(sidecar.twinExternalId.includes('author-r2'));}
 decisions.push({q,status:sidecar.status,unitProposal:sidecar.unitProposal.unitId,exactFamily:null});
}
const namedSidecars=fs.readdirSync(folder).filter(n=>n.endsWith('.classification.json')).sort();
assert.deepEqual(namedSidecars,['q05.classification.json','q10.classification.json','q18.classification.json']);
assert.equal(binding.q07.status,'unchanged hold; not audited/authored/released');
console.log(JSON.stringify({supportedFullClassifications:0,heldFullClassifications:3,decisions,frozenFilesUnchanged:preserve.entries.length,priorOwnFilesUnchanged:preserve.ownPriorFilesChecked,exactBindingsAndRuleExcerptsPassed:true,freshParentSnapshotIdentical:{units:22,families:302,capturedAt:freshBank.capturedAt},noFinalApproval:true},null,2));
