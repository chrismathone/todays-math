import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const base='.qa-artifacts/exam-resume-20261008/',root=base+'engine-upgrade-20261019/';
const tests=[...fs.readdirSync('src/__tests__/unit').filter(f=>/^examStudy.*\.test\.tsx?$/.test(f)), 'middleM3.test.ts','middleChordInverse.test.ts'].map(f=>'src/__tests__/unit/'+f);
const engine=JSON.parse(fs.readFileSync(base+'engine-upgrades-progress-r11.json','utf8'));
const paths=[...new Set([...engine.code.map(p=>p.path),...tests,'src/lib/middle/m3.ts','src/lib/middle/m3Figures.ts'])];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before=hashes(),env={...process.env,INVERSE_CHORD_EVIDENCE_DIR:process.cwd()+'/'+root+'native-models-r1/inverse-chord-svg',AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test'};
for(const k of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV'])delete env[k];
fs.mkdirSync(root+'native-models-r1');
fs.writeFileSync(root+'vitest-native-models-r1.mts',fs.readFileSync(root+'vitest-grade-gate-r1.mts','utf8').replaceAll('grade-gate-r1','native-models-r1'),{flag:'wx'});
const config=JSON.parse(fs.readFileSync(root+'tsconfig-owned-isolated-r4.json','utf8'));
config.files.push('../../../src/__tests__/unit/middleChordInverse.test.ts','../../../src/__tests__/unit/middleM3.test.ts');
fs.writeFileSync(root+'tsconfig-owned-isolated-r7.json',JSON.stringify(config,null,2)+'\n',{flag:'wx'});
for(const[name,args]of[
 ['native-models-tests-r1.log',['node_modules/vitest/vitest.mjs','run',...tests,'--config',root+'vitest-native-models-r1.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+root+'native-models-tests-r1.json']],
 ['native-models-types-r1.log',['node_modules/typescript/bin/tsc','--noEmit','--project',root+'tsconfig-owned-isolated-r7.json']],
 ['native-models-eslint-r1.log',['node_modules/eslint/bin/eslint.js','src/lib/examStudy/families/middle/remaining.ts','src/lib/examStudy/adapters.ts','src/lib/middle/m3.ts','src/lib/middle/m3Figures.ts',...tests.filter(p=>/middle(?:M3|ChordInverse)|examStudy(?:Completion|MiddleRemaining)/.test(p))]],
]){
 const log=fs.createWriteStream(root+name,{flags:'wx'});
 const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',resolve);});
 await new Promise(r=>log.end(r));assert.deepEqual(hashes(),before,'Source changed during checks');
 console.log(JSON.stringify({name,status}));assert.equal(status,0,fs.readFileSync(root+name,'utf8').slice(-7000));
}
const report={kind:'hash-bound-native-models-and-analytic-chord-validation/v1',utc:new Date().toISOString(),before,after:hashes(),sourceUnchanged:true,tests,
 actualInverseChordFigures:fs.readdirSync(root+'native-models-r1/inverse-chord-svg').length,
 nativeWrittenTupleCounts:{doubling:12,wheel:10,integerArea:12},
 previousPrecisionFailuresPreserved:true,mathOracle:'Printed conditions and grade-appropriate relations; no pixels/author facts as answer oracle',
 newManualCandidates:0,newManualApprovals:0,operatingDbWrites:0,wholeGoalComplete:false};
assert.equal(report.actualInverseChordFigures,42);
fs.writeFileSync(root+'native-models-validation-r1.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
