import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const e='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const {files,tests}=JSON.parse(fs.readFileSync(e+'inverse-tangent-validation-scope-r2.json','utf8'));
const before=Object.fromEntries([...new Set([...files,...tests])].map(p=>[p,hash(p)]));
fs.writeFileSync(e+'inverse-tangent-source-before-r2.json',JSON.stringify({utc:new Date().toISOString(),before},null,2)+'\n',{flag:'wx'});
const allowed=new Set(files.map(p=>path.resolve(p).toLowerCase()));
const prior=JSON.parse(fs.readFileSync('.qa-artifacts/exam-resume-20261008/engine-upgrades-progress-r25.json','utf8'));
for(const f of prior.code)if(!allowed.has(path.resolve(f.path).toLowerCase()))assert.equal(hash(f.path),f.sha256,f.path);
const env={...process.env,DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost'};
for(const key of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV','FIGURE_ENGINE_PATH'])delete env[key];
const jobs=[['inverse-tangent-tests-r2.log',['node_modules/vitest/vitest.mjs','run',...tests,'--config',e+'vitest-inverse-tangent-rectangle-r2.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+e+'inverse-tangent-tests-r2.json']],['inverse-tangent-types-r2.log',['node_modules/typescript/bin/tsc','--noEmit','--project',e+'tsconfig-inverse-tangent-rectangle-r1.json']],['inverse-tangent-lint-r2.log',['node_modules/eslint/bin/eslint.js',...files]]];
const outcomes=[];
for(const[name,args]of jobs){
 const log=fs.createWriteStream(e+name,{flags:'wx'});
 const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',resolve);});
 await new Promise(r=>log.end(r));outcomes.push({name,status});for(const[p,h]of Object.entries(before))assert.equal(hash(p),h,p);
 assert.equal(status,0,fs.readFileSync(e+name,'utf8').slice(-7000));console.log(JSON.stringify({name,status}));
}
const run=JSON.parse(fs.readFileSync(e+'inverse-tangent-tests-r2.json','utf8'));assert.equal(run.numFailedTests,0);assert.equal(run.numPendingTests,0);
fs.writeFileSync(e+'inverse-tangent-validation-r2.json',JSON.stringify({utc:new Date().toISOString(),before,after:before,sourcesUnchanged:true,files:run.testResults.length,passed:run.numPassedTests,failed:0,skipped:0,outcomes,typesPassed:true,lintPassed:true,publicReleaseHeld:true,newManualQuestions:0,newAuthoredFigures:0,dbWrites:0,sharedDependenciesChanged:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:run.testResults.length,passed:run.numPassedTests,typesPassed:true,lintPassed:true}));
