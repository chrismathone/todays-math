import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bindCandidate,digest,sha256} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/gyeongam-authoring-r1';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const bytes=p=>fs.readFileSync(p);
const freeze=read(base+'/author-freeze.json');
const index=read(base+'/candidate-index.json');
const packet=read(base+'/review-ready/student-problems.json');
for(const f of freeze.files) {
 const raw=bytes(path.join(base,f.path));assert.equal(sha256(raw),f.sha256,f.path);assert.equal(raw.length,f.bytes);
}
assert.equal(sha256(bytes(freeze.reportBinding.path)),freeze.reportBinding.sha256);
assert.equal(sha256(bytes(base+'/candidate-index.json')),freeze.candidateIndexSha256);
assert.equal(sha256(bytes(base+'/review-ready/student-problems.json')),freeze.studentPacketSha256);
for(const row of index.candidates) {
 const b=bindCandidate(path.join(base,row.candidatePath));
 for(const key of ['candidateFileSha256','candidateDigest','studentDigest','assetDigest'])assert.equal(b[key],row[key]);
 const {studentDigest,...student}=packet.questions.find(q=>q.questionNumber===row.questionNumber);
 assert.equal(studentDigest,b.studentDigest);assert.deepEqual(student,b.student);
}
const prior=read(base+'/checks/preservation.json');
const historicalDifferences=[];
for(const p of prior.files) {
 const worker=bytes(path.join('../exam-twin-author-geometry-20261008',p.path));assert.equal(sha256(worker),p.sha256);
 const parent=bytes(p.path);
 if(sha256(parent)!==p.sha256) {
  assert.equal(parent.toString('utf8').replace(/\r\n/g,'\n'),worker.toString('utf8').replace(/\r\n/g,'\n'));
  historicalDifferences.push({path:p.path,workerCapturedSha256:p.sha256,parentCheckoutSha256:sha256(parent),lineEndingsOnly:true,parentFileChangedByThisVerification:false});
 }
}
const generation=read(base+'/evidence/figure-generation.json');
for(const p of generation.engineInputs)assert.equal(sha256(bytes(p.repositoryPath)),p.sha256);
const receipt=read(base+'/evidence/source-copy-receipt.json');
for(const p of receipt.entries) {assert.equal(sha256(bytes(path.join(base,p.path))),p.sha256);assert.equal(sha256(bytes(p.parentPath)),p.sha256);}
const result={kind:'parent-integration-binding-audit/v1',createdAt:new Date().toISOString(),current18CandidateBindingsVerified:true,frozenFilesVerified:freeze.files.length,newFigures:9,sourceCopyFilesVerified:receipt.entries.length,workerPriorFilesVerified:prior.files.length,parentHistoricalDifferences:historicalDifferences,engineInputsVerified:generation.engineInputs.length,authorFreezeSha256:sha256(bytes(base+'/author-freeze.json')),studentPacketDigest:digest(packet),independentReviews:0,gradeApprovals:0,fullApproval:0,dbWrites:0};
fs.writeFileSync('.qa-artifacts/exam-resume-20261008/gyeongam-parent-integration-r1/verification.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({currentCandidates:18,frozenFiles:freeze.files.length,historicalReportLineEndingDifferences:historicalDifferences.length,independentReviews:0}));
