import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {sha256,bindCandidate,readJson,digest} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const e='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/',b='.qa-artifacts/exam-resume-20261008/';
const names=['statisticsConditions.mjs','inverseDispersionConditions.mjs','inverseDispersionConditions.test.mjs','candidatePack.mjs','numberedConstantAssignments.mjs','numberedConstantAssignments.test.mjs'],files=names.map(n=>'scripts/import/exam-twin/'+n),hash=p=>sha256(fs.readFileSync(p)),before=Object.fromEntries(files.map(p=>[p,hash(p)]));
const allowed=new Set(files),prior=readJson(b+'engine-upgrades-progress-r29.json');for(const f of prior.code)if(!allowed.has(f.path))assert.equal(hash(f.path),f.sha256,f.path);
const tests=fs.readdirSync('scripts/import/exam-twin').filter(n=>n.endsWith('.test.mjs')).map(n=>'scripts/import/exam-twin/'+n),results=[];
for(const[name,args]of [['inverse-dispersion-numbered-tests-r1.tap',['--test',...tests]],['inverse-dispersion-numbered-lint-r1.log',['node_modules/eslint/bin/eslint.js',...files]]]){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(e+name,r.stdout+r.stderr,{flag:'wx'});assert.equal(r.status,0,(r.stdout+r.stderr).slice(-5000));results.push({log:e+name,status:r.status});for(const[p,h]of Object.entries(before))assert.equal(hash(p),h);
}
for(const row of readJson(b+'current-authored-batches-v37.json').groups.flatMap(g=>g.candidates)){
 const x=bindCandidate(row.candidate.path);assert.equal(x.candidateFileSha256,row.candidate.sha256);for(const k of ['studentDigest','assetDigest','candidateDigest'])assert.equal(x[k],row[k]);assert.equal(digest(x.candidate.metadata),row.metadataDigest);
}
const old=readJson(b+'nobyeon-sem2-group4-review-20261020-r1/collected-parent-r1.json'),now=readJson(b+'nobyeon-sem2-group4-review-20261020-r1/collected-parent-r2.json');assert.equal(old.mathematicalVerified,2);assert.equal(now.mathematicalVerified,3);assert.equal(now.gradeReviewed,3);assert.equal(now.loadable,0);
fs.writeFileSync(e+'inverse-dispersion-numbered-validation-r1.json',JSON.stringify({utc:new Date().toISOString(),files,before,after:before,sourceHashesUnchangedDuringValidation:true,nodeTestFiles:tests.length,nodeSummary:fs.readFileSync(e+'inverse-dispersion-numbered-tests-r1.tap','utf8').slice(-250),lintPassed:true,results,old151CandidateBindingsUnchanged:true,currentQ20OriginalRawReportAndCandidateUnchanged:true,newReviewCollection:3,previousReviewCollection:2,independentCodeAuditPending:true,newPublicGeneratorFamily:false,dbWrites:0,loadable:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({nodeTestFiles:tests.length,lintPassed:true,currentBatchMathGrade:3,independentCodeAuditPending:true,dbWrites:0}));
