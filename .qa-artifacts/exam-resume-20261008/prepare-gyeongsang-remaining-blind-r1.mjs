import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {bindCandidate} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const indexPath=base+'gyeongsang-remaining-authoring-r1/candidate-index.json';
const index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
assert.equal(index.candidates.length,15);
const files=index.candidates.map(row=>{
 const file=path.join(path.dirname(indexPath),row.candidateFile),b=bindCandidate(file);
 for(const key of ['candidateFileSha256','candidateDigest','studentDigest','assetDigest'])assert.equal(row[key],b[key]);
 return file;
});
const root=base+'gyeongsang-remaining-review-r1/';
for(const args of [['freeze',root+'package',...files],['blind',root+'package',root+'blind']]) {
 const result=spawnSync(process.execPath,['scripts/import/exam-twin/review-exam-twins.mjs',...args],{encoding:'utf8'});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');assert.equal(result.status,0);
}
