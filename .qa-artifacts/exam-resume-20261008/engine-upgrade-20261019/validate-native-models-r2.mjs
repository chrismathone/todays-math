import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
const first=JSON.parse(fs.readFileSync(root+'native-models-source-r1.json','utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const[p,h]of Object.entries(first.hashes))if(p!=='src/__tests__/unit/examStudyReinforcement.test.ts')assert.equal(hash(p),h,p);
const before=Object.fromEntries(Object.keys(first.hashes).map(p=>[p,hash(p)]));
const env={...process.env,AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test'};
for(const k of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV'])delete env[k];
for(const[name,args]of[
 ['native-models-tests-r2.log',['node_modules/vitest/vitest.mjs','run','src/__tests__/unit/examStudyReinforcement.test.ts','--config',root+'vitest-native-models-r1.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+root+'native-models-tests-r2.json']],
 ['native-models-types-r2.log',['node_modules/typescript/bin/tsc','--noEmit','--project',root+'tsconfig-owned-isolated-r7.json']],
 ['native-models-eslint-r2.log',['node_modules/eslint/bin/eslint.js','src/lib/examStudy/families/middle/remaining.ts','src/lib/examStudy/adapters.ts','src/lib/middle/m3.ts','src/lib/middle/m3Figures.ts','src/__tests__/unit/middleChordInverse.test.ts','src/__tests__/unit/middleM3.test.ts','src/__tests__/unit/examStudyMiddleRemaining.test.ts','src/__tests__/unit/examStudyCompletion.test.ts','src/__tests__/unit/examStudyReinforcement.test.ts']],
]){
 const log=fs.createWriteStream(root+name,{flags:'wx'});
 const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',resolve);});
 await new Promise(r=>log.end(r));for(const[p,h]of Object.entries(before))assert.equal(hash(p),h,p);
 console.log(JSON.stringify({name,status}));assert.equal(status,0,fs.readFileSync(root+name,'utf8').slice(-6000));
}
const latest=new Map();
for(const file of ['native-models-tests-r1.json','native-models-tests-r2.json'])for(const r of JSON.parse(fs.readFileSync(root+file,'utf8')).testResults)latest.set(r.name,r);
const tests=[...latest.values()].flatMap(r=>r.assertionResults);
assert.equal(tests.filter(r=>r.status==='passed').length,466);
assert(!tests.some(r=>r.status==='failed'));
fs.writeFileSync(root+'native-models-validation-r2.json',JSON.stringify({kind:'hash-bound-native-models-and-analytic-chord-validation/v2',utc:new Date().toISOString(),before,after:before,sourceUnchanged:true,
 latestFiles:latest.size,latestPassed:466,latestFailed:0,latestSkipped:0,scope:'Latest per-file composite. First broad run465pass/1outdated exact-version allowlist; only that test file updated and rerun, production bytes unchanged.',
 actualInverseChordFigures:42,nativeWrittenTupleCounts:{doubling:12,wheel:10,integerArea:12},
 previousFailedReportsPreserved:true,mathOracle:'Printed grade-appropriate relations; no raster pixels',newManualCandidates:0,newManualApprovals:0,operatingDbWrites:0,wholeGoalComplete:false},null,2)+'\n',{flag:'wx'});
