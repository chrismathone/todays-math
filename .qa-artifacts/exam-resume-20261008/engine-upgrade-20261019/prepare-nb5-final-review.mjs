import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { newOutputPath, readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const raw=base+'nobyeon-independent-20261019-r2/';
const report=readJson(raw+'proof-summary.json');
const rawCommit=execFileSync('git',['rev-parse','c51c84ce5'],{encoding:'utf8'}).trim();
execFileSync('git',['merge-base','--is-ancestor',rawCommit,'HEAD']);
assert.equal(report.authorAnswerExposureBeforeSeal,false);
assert.deepEqual(report.solved,[1,2,4,6,8]);
const output=newOutputPath(base+'nobyeon-final-review-20261019-r2');
fs.mkdirSync(output);
fs.cpSync(base+'nobyeon-review-r1/package',path.join(output,'package'),{recursive:true,errorOnExist:true,force:false});
fs.cpSync(raw+'blind',path.join(output,'blind'),{recursive:true,errorOnExist:true,force:false});
fs.mkdirSync(path.join(output,'blind/solve'));
const solves=[];
for(const proof of report.proofFiles){
 const source=path.join(raw,proof.path);
 const bytes=fs.readFileSync(source);
 assert.equal(sha256(bytes),proof.sha256);
 const target=path.join(output,'blind/solve',path.basename(proof.path));
 fs.writeFileSync(target,bytes,{flag:'wx'});
 solves.push({original:source,copy:target,sha256:proof.sha256});
}
fs.writeFileSync(path.join(output,'pre-exposure-seal-receipt.json'),JSON.stringify({
 rawCommit, rawCommitPrefix:'c51c84ce5', fullShaVerifiedAgainstGit:true,
 originalProofSummary:{path:raw+'proof-summary.json',sha256:sha256(fs.readFileSync(raw+'proof-summary.json'))},
 createdAt:new Date().toISOString(),solves,authorExposureAllowedOnlyAfterRawCommit:true,
 copiedOriginalRawBytesUnchanged:true,sourcePackageUnchanged:true,mathOrGradeApproval:false,loadable:0,
},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({freshRawSolvesCopied:solves.length,reviewRoot:output,loadable:0}));
