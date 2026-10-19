import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
const prior=JSON.parse(fs.readFileSync(root+'root-table-source-before-r1.json','utf8')).before;
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const[p,h]of Object.entries(prior))if(p!=='src/__tests__/unit/middleM3Root.test.ts')assert.equal(hash(p),h,p);
const before=Object.fromEntries(Object.keys(prior).map(p=>[p,hash(p)]));
const env={...process.env,AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test'};
for(const k of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV'])delete env[k];
// Catalog checks run alone after the independent worker stopped its heavy audit.
for(const[name,args]of[
 ['root-table-tests-r2.log',['node_modules/vitest/vitest.mjs','run','src/__tests__/unit/middleM3Root.test.ts','src/__tests__/unit/examStudyCoreLegacy.test.ts','--config',root+'vitest-grade-gate-r1.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+root+'root-table-tests-r2.json']],
 ['root-table-types-r2.log',['node_modules/typescript/bin/tsc','--noEmit','--project',root+'tsconfig-owned-isolated-r8.json']],
 ['root-table-eslint-r2.log',['node_modules/eslint/bin/eslint.js','src/lib/middle/m3Root.ts','src/lib/examStudy/adapters.ts','src/__tests__/unit/examStudyReinforcement.test.ts','src/__tests__/unit/middleM3Root.test.ts','src/__tests__/unit/middleRootTableApproximation.test.ts']],
]){
 const log=fs.createWriteStream(root+name,{flags:'wx'});
 const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});console.log(JSON.stringify({name,childPid:child.pid}));child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',resolve);});
 await new Promise(r=>log.end(r));for(const[p,h]of Object.entries(before))assert.equal(hash(p),h,p);
 console.log(JSON.stringify({name,status}));assert.equal(status,0,fs.readFileSync(root+name,'utf8').slice(-6000));
}
const latest=new Map();for(const file of ['root-table-tests-r1.json','root-table-tests-r2.json'])for(const r of JSON.parse(fs.readFileSync(root+file,'utf8')).testResults)latest.set(r.name,r);
const tests=[...latest.values()].flatMap(r=>r.assertionResults);assert(!tests.some(r=>r.status==='failed'));
fs.writeFileSync(root+'root-table-validation-r2.json',JSON.stringify({kind:'hash-bound-root-table-approximation-validation/v2',utc:new Date().toISOString(),before,after:before,sourceUnchanged:true,
 latestFiles:latest.size,latestPassed:tests.filter(r=>r.status==='passed').length,latestFailed:0,latestSkipped:tests.filter(r=>r.status==='skipped').length,
 scope:'Latest per-file composite; r1 parser fixture and catalog timeout preserved. Only the old printed-phrase parser changed, numerical assertions and20s timeout unchanged. Two failed files rerun after independent audit CPU/memory load ended.',
 finiteRootTableTuples:1800,integerSquaredRoundingOracle:true,priorFalseEqualities:1756,oldTestPassWasNotSufficient:true,
 sourceCodeChangedAfterMathTests:false,repositoryEnvLoaded:false,operatingDbWrites:0,newManualCandidates:0,newCandidateApprovals:0,wholeGoalComplete:false},null,2)+'\n',{flag:'wx'});
