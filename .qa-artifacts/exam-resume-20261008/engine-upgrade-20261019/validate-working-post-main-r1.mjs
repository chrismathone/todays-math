import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {bindCandidate,digest,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',working=readJson(e+'working-candidates-20261020-r18.json'),canonical=readJson(b+'current-authored-batches-v39.json');
const ref=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
for(const r of canonical.groups.flatMap(g=>g.candidates)){
 const x=bindCandidate(r.candidate.path);assert.equal(x.candidateFileSha256,r.candidate.sha256);
 for(const k of ['studentDigest','candidateDigest','assetDigest'])assert.equal(x[k],r[k]);
 assert.equal(digest(x.candidate.metadata),r.metadataDigest);assert.equal(digest(x.candidate.sourceReference),r.sourceReferenceDigest);assert.deepEqual(x.validation.studentMathNotationWarnings,[]);
}
for(const r of working.current){const x=bindCandidate(r.candidate);assert.equal(x.candidateFileSha256,r.sha256);assert.deepEqual(x.validation.studentMathNotationWarnings,[]);}
for(const r of working.codeFiles)assert.equal(ref(r.path).sha256,r.sha256);
const tests=fs.readdirSync('scripts/import/exam-twin').filter(p=>p.endsWith('.test.mjs')).map(p=>'scripts/import/exam-twin/'+p),jobs=[
 ['working-post-main-node-r1.tap',['--test',...tests]],
 ['working-post-main-vitest-r1.log',['node_modules/vitest/vitest.mjs','run','--config',e+'vitest-working-post-main-r1.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+e+'working-post-main-vitest-r1.json']],
 ['working-post-main-lint-r1.log',['node_modules/eslint/bin/eslint.js',...working.codeFiles.map(r=>r.path)]]
],results=[];
for(const[name,args]of jobs){const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024});fs.writeFileSync(e+name,r.stdout+r.stderr,{flag:'wx'});results.push({log:ref(e+name),status:r.status});console.log(JSON.stringify({name,status:r.status}));}
const failed=results.filter(r=>r.status!==0),v=readJson(e+'working-post-main-vitest-r1.json'),receipt={utc:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),main:spawnSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).stdout.trim(),canonicalSelected:157,additionalDrafts:3,current160CandidateBindingsRetained:true,independentRawSealed:3,fullNewReviewsPending:true,nodeFiles:tests.length,nodeSummary:fs.readFileSync(e+jobs[0][0],'utf8').slice(-250),vitestActualFiles:v.testResults.length,vitestActualPassed:v.numPassedTests,vitestFailed:v.numFailedTests,results,code:working.codeFiles,dbWrites:0,loadable:0,wholeGoalComplete:false};
fs.writeFileSync(e+'working-post-main-validation-r1.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});assert.deepEqual(failed,[]);assert.equal(v.numFailedTests,0);for(const r of working.codeFiles)assert.equal(ref(r.path).sha256,r.sha256);console.log(JSON.stringify(receipt));
