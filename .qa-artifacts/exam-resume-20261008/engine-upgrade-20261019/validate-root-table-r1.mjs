import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
const tests=['middleM3Root','middleRootTableApproximation','examStudyReinforcement','examStudyCoreLegacy','examStudyIntegration','examStudyRoutes','examStudyCurriculumEligibility'].map(n=>'src/__tests__/unit/'+n+'.test.ts');
const previous=JSON.parse(fs.readFileSync(root+'native-models-validation-r2.json','utf8'));
const paths=[...new Set([...Object.keys(previous.before),...tests,'src/lib/middle/m3Root.ts'])];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before=hashes(),env={...process.env,AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test'};
for(const k of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV'])delete env[k];
const config=JSON.parse(fs.readFileSync(root+'tsconfig-owned-isolated-r7.json','utf8'));
config.files.push('../../../src/__tests__/unit/middleRootTableApproximation.test.ts','../../../src/__tests__/unit/middleM3Root.test.ts');
fs.writeFileSync(root+'tsconfig-owned-isolated-r8.json',JSON.stringify(config,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'root-table-source-before-r1.json',JSON.stringify({utc:new Date().toISOString(),before},null,2)+'\n',{flag:'wx'});
for(const[name,args]of[
 ['root-table-tests-r1.log',['node_modules/vitest/vitest.mjs','run',...tests,'--config',root+'vitest-grade-gate-r1.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+root+'root-table-tests-r1.json']],
 ['root-table-types-r1.log',['node_modules/typescript/bin/tsc','--noEmit','--project',root+'tsconfig-owned-isolated-r8.json']],
 ['root-table-eslint-r1.log',['node_modules/eslint/bin/eslint.js','src/lib/middle/m3Root.ts','src/lib/examStudy/adapters.ts','src/__tests__/unit/examStudyReinforcement.test.ts','src/__tests__/unit/middleRootTableApproximation.test.ts']],
]){
 const log=fs.createWriteStream(root+name,{flags:'wx'});
 const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',resolve);});
 await new Promise(r=>log.end(r));assert.deepEqual(hashes(),before,'Executable bytes changed during checks');
 console.log(JSON.stringify({name,status}));assert.equal(status,0,fs.readFileSync(root+name,'utf8').slice(-6500));
}
const run=JSON.parse(fs.readFileSync(root+'root-table-tests-r1.json','utf8'));assert.equal(run.numFailedTests,0);
fs.writeFileSync(root+'root-table-validation-r1.json',JSON.stringify({kind:'hash-bound-root-table-approximation-validation/v1',utc:new Date().toISOString(),before,after:hashes(),sourceUnchanged:true,tests,
 passed:run.numPassedTests,failed:0,pending:run.numPendingTests,finiteRootTableTuples:1800,integerSquaredRoundingOracle:true,priorFalseEqualities:1756,oldTestPassWasNotSufficient:true,repositoryEnvLoaded:false,operatingDbWrites:0,newManualCandidates:0,newCandidateApprovals:0,wholeGoalComplete:false},null,2)+'\n',{flag:'wx'});
