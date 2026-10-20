import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const e='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/',git=(...a)=>{const x=spawnSync('git',a,{encoding:'utf8'});assert.equal(x.status,0,x.stderr);return x.stdout.trim();},head=git('rev-parse','HEAD'),main=git('rev-parse','origin/main');git('merge-base','--is-ancestor',main,head);
const code=readJson(e+'working-candidates-20261020-r18.json').codeFiles;
for(const r of code)assert.equal(sha256(fs.readFileSync(r.path)),r.sha256);
const tests=fs.readdirSync('scripts/import/exam-twin').filter(p=>p.endsWith('.test.mjs')).map(p=>'scripts/import/exam-twin/'+p),units=['courseListAnswers','examStudyContract','examStudyInverseMinimum','examStudyInverseTangentRectangle','lockProblemRows'].map(p=>'src/__tests__/unit/'+p+'.test.ts'),jobs=[
 ['working-post-main-node-r2.tap',['--test',...tests]],
 ['working-post-main-vitest-r2.log',['node_modules/vitest/vitest.mjs','run',...units,'--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+e+'working-post-main-vitest-r2.json']]
];
for(const[name,args]of jobs){const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(e+name,r.stdout+r.stderr,{flag:'wx'});console.log(JSON.stringify({name,status:r.status}));assert.equal(r.status,0,(r.stdout+r.stderr).slice(-4000));}
const v=readJson(e+'working-post-main-vitest-r2.json');assert.equal(v.numFailedTests,0);for(const r of code)assert.equal(sha256(fs.readFileSync(r.path)),r.sha256);assert.equal(git('rev-parse','HEAD'),head);
const receipt={utc:new Date().toISOString(),head,main,mainIsAncestorOfTestedHead:true,priorBuilderIntegrationValidation:e+'working-post-main-validation-r1.json',newMainDelta:'list-answer course reader floor plus planning docs; preserve new stored text mode reader',nodeFiles:tests.length,nodeSummary:fs.readFileSync(e+'working-post-main-node-r2.tap','utf8').slice(-250),vitestFiles:v.testResults.length,vitestPassed:v.numPassedTests,vitestFailed:v.numFailedTests,code,logs:jobs.map(([p])=>({path:e+p,sha256:sha256(fs.readFileSync(e+p))})),dbWrites:0,loadable:0};fs.writeFileSync(e+'working-post-main-validation-r2.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
