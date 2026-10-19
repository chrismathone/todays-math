import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
const tests=['middleChordInverse','middleM3','examStudyCoreLegacy','examStudyCurriculumEligibility','examStudyIntegration','examStudyRoutes'].map(s=>'src/__tests__/unit/'+s+'.test.ts');
const paths=['src/lib/middle/m3.ts','src/lib/middle/m3Figures.ts','src/lib/examStudy/adapters.ts','src/lib/examStudy/curriculumEligibility.ts','src/lib/examStudy/generate.ts','src/lib/engine/deriveFormats.ts','src/lib/figure/renderFigureSpec.ts',...tests];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before=hashes(), env={...process.env,INVERSE_CHORD_EVIDENCE_DIR:process.cwd()+'/'+root+'inverse-chord-r2/svg',AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test'};
for(const k of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV'])delete env[k];
fs.mkdirSync(root+'inverse-chord-r2');
const config=JSON.parse(fs.readFileSync(root+'tsconfig-owned-isolated-r4.json','utf8'));
config.files.push('../../../src/__tests__/unit/middleChordInverse.test.ts','../../../src/__tests__/unit/middleM3.test.ts');
fs.writeFileSync(root+'tsconfig-owned-isolated-r6.json',JSON.stringify(config,null,2)+'\n',{flag:'wx'});
for(const [name,args]of [
 ['inverse-chord-tests-r2.log',['node_modules/vitest/vitest.mjs','run',...tests,'--config',root+'vitest-grade-gate-r1.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+root+'inverse-chord-tests-r2.json']],
 ['inverse-chord-types-r2.log',['node_modules/typescript/bin/tsc','--noEmit','--project',root+'tsconfig-owned-isolated-r6.json']],
 ['inverse-chord-eslint-r2.log',['node_modules/eslint/bin/eslint.js',...paths.filter(p=>p==='src/lib/examStudy/adapters.ts'||p==='src/lib/middle/m3.ts'||p==='src/lib/middle/m3Figures.ts'||/middle(?:M3|ChordInverse)\.test/.test(p))]],
]){
 const log=fs.createWriteStream(root+name,{flags:'wx'});
 const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',resolve);});
 await new Promise(r=>log.end(r));assert.deepEqual(hashes(),before,'Executable bytes changed during checks');
 console.log(JSON.stringify({name,status}));assert.equal(status,0,fs.readFileSync(root+name,'utf8').slice(-6500));
}
const report={kind:'hash-bound-native-inverse-chord-validation/v1',utc:new Date().toISOString(),before,after:hashes(),sourceUnchanged:true,tests,
 actualFigureTuples:fs.readdirSync(root+'inverse-chord-r2/svg').length,mathOracle:'Printed angle/target and equal-chord/triangle-angle relations; no raster pixel oracle',newManualCandidates:0,newManualApprovals:0,dbWrites:0};
assert.equal(report.actualFigureTuples,42);
fs.writeFileSync(root+'inverse-chord-validation-r2.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
