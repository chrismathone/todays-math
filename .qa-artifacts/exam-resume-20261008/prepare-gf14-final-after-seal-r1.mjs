/** Expose only the 14 solved GF candidates; original15 and pendingq18 stay frozen. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readJson,sha256} from '../../scripts/import/exam-twin/candidatePack.mjs';
import {currentPackage} from '../../scripts/import/exam-twin/review-exam-twins.mjs';
const base='.qa-artifacts/exam-resume-20261008/',scope=base+'gyeongsang-remaining-review-r1/';
const {bindings}=currentPackage(scope+'package');assert.equal(bindings.length,15);
const selected=bindings.filter(b=>b.candidate.questionNumber!==18);assert.equal(selected.length,14);
assert.equal(readJson(scope+'blind/solve/q18.json').status,'pending');
for(const b of bindings) {
 const tag='q'+String(b.candidate.questionNumber).padStart(2,'0')+'.json';
 const solvePath=scope+'blind/solve/'+tag,solve=readJson(solvePath);
 assert.equal(solve.studentDigest,b.studentDigest);assert.notEqual(solve.solverId,b.candidate.authorId);
 assert.equal(solve.status,b.candidate.questionNumber===18?'pending':'solved');
 const committed=spawnSync('git',['show','ebc4e14137ba351cf4b4f1f65cafd536271a821b:'+solvePath],{encoding:null});
 assert.equal(committed.status,0);assert.equal(sha256(committed.stdout),sha256(fs.readFileSync(solvePath)));
}
const out=base+'gyeongsang-remaining-final14-r1/';
for(const args of [['freeze',out+'package',...selected.map(b=>b.candidateFile)],['blind',out+'package',out+'blind']]) {
 const r=spawnSync(process.execPath,['scripts/import/exam-twin/review-exam-twins.mjs',...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
}
fs.mkdirSync(out+'blind/solve',{recursive:true});
for(const b of selected) {
 const name='q'+String(b.candidate.questionNumber).padStart(2,'0')+'.json';
 fs.copyFileSync(scope+'blind/solve/'+name,out+'blind/solve/'+name,fs.constants.COPYFILE_EXCL);
}
const r=spawnSync(process.execPath,['scripts/import/exam-twin/review-exam-twins.mjs','verify-pack',out+'package',out+'blind',out+'review'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
fs.writeFileSync(out+'selection-receipt.json',JSON.stringify({kind:'solved-subset-final-review-exposure/v1',createdAt:new Date().toISOString(),rawCommit:'ebc4e14137ba351cf4b4f1f65cafd536271a821b',originalBlindScopeParents:15,newFinalReviewParents:14,selectedNumbers:selected.map(b=>b.candidate.questionNumber),excludedPending:{questionNumber:18,reason:'material complexity/grade method not cleared',originalRawSolvePreserved:true,authorPrivateNotExposedByThisPackage:true},rawSolveBytesUnchanged:true,originalAll15PackageAndBlindUnchanged:true,approvalsTransferred:false,fullVerified:0,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({postSealFinalReview:14,q18PendingExcluded:true,fullVerified:0}));
