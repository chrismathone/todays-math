import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {bindCandidate,digest,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const e='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/',b='.qa-artifacts/exam-resume-20261008/';
const index=readJson(b+'current-authored-batches-v37.json'),oldAudit=readJson(e+'current151-binding-audit-r1.json');
const rows=index.groups.flatMap(g=>g.candidates),seen=new Set();let figures=0,reports=0;
for(const row of rows){
 const x=bindCandidate(row.candidate.path),saved=oldAudit.rows.find(r=>r.id===row.twinExternalId);
 assert(saved);assert.equal(x.candidateFileSha256,row.candidate.sha256);
 for(const k of ['studentDigest','candidateDigest','assetDigest'])assert.equal(x[k],saved[k]);
 assert.equal(digest(x.candidate.metadata),row.metadataDigest);assert.equal(digest(x.candidate.sourceReference),row.sourceReferenceDigest);
 assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);
 const exact=digest({content:x.candidate.content,choices:x.candidate.choices,score:x.candidate.score,assets:x.assets.map(a=>a.svgSha256)});
 assert(!seen.has(exact));seen.add(exact);figures+=x.assets.length;
 for(const key of ['report','verificationManifest','blindManifest','solve','seal']){const ref=row.review?.[key];if(ref?.path&&ref.sha256){assert.equal(sha256(fs.readFileSync(ref.path)),ref.sha256,ref.path);reports++;}}
}
assert.equal(rows.length,151);assert.equal(figures,107);
for(const r of readJson(b+'engine-upgrades-progress-r29.json').code)assert.equal(sha256(fs.readFileSync(r.path)),r.sha256,r.path);
const tests=fs.readdirSync('scripts/import/exam-twin').filter(p=>p.endsWith('.test.mjs')).map(p=>'scripts/import/exam-twin/'+p);
const jobs=[['v37-post-main-node-r1.tap',['--test',...tests]],['v37-post-main-vitest-r1.log',['node_modules/vitest/vitest.mjs','run','src/__tests__/unit/examStudyInverseTangentRectangle.test.ts','src/__tests__/unit/examStudyInverseMinimum.test.ts','src/__tests__/unit/examStudyContract.test.ts','src/__tests__/unit/lockProblemRows.test.ts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+e+'v37-post-main-vitest-r1.json']]];
const env={...process.env,DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost'};
const results=[];
for(const[name,args]of jobs){const r=spawnSync(process.execPath,args,{env,encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(e+name,r.stdout+r.stderr,{flag:'wx'});assert.equal(r.status,0,(r.stdout+r.stderr).slice(-5000));results.push({log:e+name,status:r.status});}
const v=readJson(e+'v37-post-main-vitest-r1.json');assert.equal(v.numFailedTests,0);
const receipt={utc:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),main:spawnSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).stdout.trim(),currentCandidates:151,figures:107,boundReviewFilesChecked:reports,allCurrentCandidateAndEngineHashesMatch:true,exactStudentDuplicates:0,nodeTestFiles:tests.length,nodeSummary:fs.readFileSync(e+jobs[0][0],'utf8').slice(-260),vitestFiles:v.testResults.length,vitestPassed:v.numPassedTests,results,dbWrites:0,loadable:0,wholeGoalComplete:false};
fs.writeFileSync(e+'v37-post-main-validation-r1.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
