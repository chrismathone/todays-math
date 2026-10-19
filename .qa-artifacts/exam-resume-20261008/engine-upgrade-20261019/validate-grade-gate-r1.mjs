import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const output='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
fs.mkdirSync(output+'grade-gate-r1');
const tests=fs.readdirSync('src/__tests__/unit').filter((f)=>/^examStudy.*\.test\.tsx?$/.test(f)).map((f)=>'src/__tests__/unit/'+f);
const code=fs.readdirSync('src/lib/examStudy',{recursive:true,withFileTypes:true}).filter((e)=>e.isFile()&&e.name.endsWith('.ts')).map((e)=>(e.parentPath+'/'+e.name).replaceAll('\\','/'));
const paths=[...code,...tests,'src/lib/engine/deriveFormats.ts','src/lib/figure/renderFigureSpec.ts','src/lib/engine/authoredImage.ts'];
const hashes=()=>Object.fromEntries(paths.map((p)=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before=hashes();
const config=JSON.parse(fs.readFileSync(output+'tsconfig-owned-isolated-r3.json','utf8'));
config.files.push('../../../src/__tests__/unit/examStudyCurriculumEligibility.test.ts','../../../src/__tests__/unit/examStudyCompletion.test.ts','../../../src/__tests__/unit/examStudyMiddleRemaining.test.ts');
fs.writeFileSync(output+'tsconfig-owned-isolated-r4.json',JSON.stringify(config,null,2)+'\n',{flag:'wx'});
const env={...process.env};
for(const k of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV']) delete env[k];
env.AUTH_URL=env.NEXTAUTH_URL='http://localhost';
env.DATABASE_URL=env.DIRECT_URL='postgresql://test:test@127.0.0.1:1/test';
const commands=[
  ['grade-gate-tests-r1.log',['node_modules/vitest/vitest.mjs','run',...tests,'--config',output+'vitest-grade-gate-r1.mts','--maxWorkers=1','--reporter=json','--reporter=default','--outputFile.json='+output+'grade-gate-tests-r1.json']],
  ['grade-gate-types-r1.log',['node_modules/typescript/bin/tsc','--noEmit','--project',output+'tsconfig-owned-isolated-r4.json']],
  ['grade-gate-eslint-r1.log',['node_modules/eslint/bin/eslint.js','src/lib/examStudy/curriculumEligibility.ts','src/lib/examStudy/evidence.ts','src/lib/examStudy/generate.ts','src/lib/examStudy/registry.ts','src/__tests__/unit/examStudyCurriculumEligibility.test.ts','src/__tests__/unit/examStudyCompletion.test.ts','src/__tests__/unit/examStudyMiddleRemaining.test.ts']],
];
console.log(JSON.stringify({testFiles:tests.length,hashedFiles:paths.length,realMiddleRenderEnabled:true,repositoryEnvDisabled:true}));
for(const [name,args] of commands){
  const log=fs.createWriteStream(output+name,{flags:'wx'});
  const status=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});
    child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
    child.on('error',reject);child.on('close',resolve);
  });
  await new Promise((resolve)=>log.end(resolve));
  assert.deepEqual(hashes(),before,'Source changed during validation');
  console.log(JSON.stringify({name,status}));
  assert.equal(status,0,fs.readFileSync(output+name,'utf8').slice(-6500));
}
fs.writeFileSync(output+'grade-gate-validation-r1.json',JSON.stringify({kind:'hash-bound-grade-eligibility-validation/v1',utc:new Date().toISOString(),before,after:hashes(),sourceUnchanged:true,tests,realMiddleRenderEnabled:true,repositoryEnvLoaded:false,operatingDbWrites:0,fullGoalComplete:false},null,2)+'\n',{flag:'wx'});
