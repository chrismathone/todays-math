/** Preserve sealed raw bytes, bind the new r2 candidate, then expose for final review. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readJson,sha256,digest} from '../../scripts/import/exam-twin/candidatePack.mjs';
import {currentPackage} from '../../scripts/import/exam-twin/review-exam-twins.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const raw=base+'gyeongsan-q22-review-r2/',out=base+'gyeongsan-q22-bound-final-r2-attempt3/';
const packet=base+'gyeongsan-q22-review-r2/package';
const {manifest,bindings}=currentPackage(packet);assert.equal(bindings.length,1);
const binding=bindings[0],hashes=readJson(raw+'raw-output-hashes.json');
for(const key of ['rawSolve','exactProof','freshCode','studentInput','studentFigure']) {
 const row=hashes[key];assert.equal(sha256(fs.readFileSync(raw+row.path)),row.sha256);
 const blob=spawnSync('git',['show','383a5f7634ce3dc8979afd35cc9e058dc0d4c4fa:'+raw+row.path],{encoding:null});
 assert.equal(blob.status,0);assert.equal(sha256(blob.stdout),row.sha256,'Raw commit is the pre-exposure byte baseline');
}
const solve=readJson(raw+'solve/q22.json');
assert.equal(solve.studentDigest,binding.studentDigest);assert.equal(solve.status,'solved');
assert.notEqual(solve.solverId,binding.candidate.authorId);
assert.equal(solve.evidence.priorExposureToThisR2AuthorAnswersOrPrivateFacts,false);
assert.equal(solve.evidence.newHelperTestTargetAccess,false);
fs.mkdirSync(out,{recursive:false});fs.cpSync(raw+'blind',out+'blind',{recursive:true,errorOnExist:true,force:false});
fs.mkdirSync(out+'blind/solve',{recursive:true});fs.copyFileSync(raw+'solve/q22.json',out+'blind/solve/q22.json',fs.constants.COPYFILE_EXCL);
assert.equal(sha256(fs.readFileSync(out+'blind/solve/q22.json')),hashes.rawSolve.sha256);
const child=spawnSync(process.execPath,['scripts/import/exam-twin/review-exam-twins.mjs','verify-pack',packet,out+'blind',out+'review'],{encoding:'utf8'});
assert.equal(child.status,0,child.stderr);
const sourceContext=readJson(base+'gyeongsan-q22-repair-r2/source-context-r1.json');
assert.equal(sha256(fs.readFileSync(sourceContext.resolvedSnapshotPath)),sourceContext.resolvedSnapshotSha256);
const sourcePacket=readJson(sourceContext.resolvedSnapshotPath);
assert.equal(sourcePacket.originalCorrectChoiceAndSolutionWithheld,true);
const original=sourcePacket.questions.find(q=>q.sourceQuestionId===sourceContext.sourceExternalId && q.number===22);
assert(original,'Source-only row22 not found');
const sourcePath=out+'source-question-only.json';fs.writeFileSync(sourcePath,JSON.stringify(original,null,2)+'\n',{flag:'wx'});
fs.mkdirSync(out+'source-images');
for(const image of original.images??[]) {
 const sourceImage=path.resolve(path.dirname(sourceContext.resolvedSnapshotPath),image.file);
 assert.equal(sha256(fs.readFileSync(sourceImage)),image.sha256);
 fs.copyFileSync(sourceImage,out+'source-images/'+path.basename(image.file),fs.constants.COPYFILE_EXCL);
}
const receipt={kind:'current-r2-blind-solve-binding/v1',createdAt:new Date().toISOString(),rawCommit:'383a5f7634ce3dc8979afd35cc9e058dc0d4c4fa',workerCheckpoint:'940c2407345e5c3e0c6c0f42a552c638e7ffe587',packageDigest:manifest.packageDigest,twinExternalId:binding.candidate.twinExternalId,candidateFileSha256:binding.candidateFileSha256,candidateDigest:binding.candidateDigest,studentDigest:binding.studentDigest,assetDigest:binding.assetDigest,rawSolveSha256:hashes.rawSolve.sha256,solveDigest:digest(solve),solverId:solve.solverId,authorId:binding.candidate.authorId,rawBytesCopiedUnchanged:true,originalRawSolveUnedited:true,sourceQuestionCanonicalDigest:digest(original),sourcePacketSha256:sourceContext.resolvedSnapshotSha256,fullGradeMathContentReportStillRequired:true,rights:'held',native:'pending',loadable:false,dbWrites:0};
fs.writeFileSync(out+'binding-receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({rawSolveBoundBeforeExposure:true,finalReviewQuestions:1,fullApproval:false,loadable:false}));
