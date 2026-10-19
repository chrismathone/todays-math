import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const e='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/';
const worker='C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008/.qa-artifacts/exam-resume-20261008/inverse-root-table-engine-audit-20261019-r1/';
const old=JSON.parse(fs.readFileSync(worker+'scope-input.json','utf8')),current=JSON.parse(fs.readFileSync(worker+'scope-input-r2.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const oldMap=new Map(old.files.map(x=>[x.path,x.sha256]));
for(const f of current.files){assert.equal(hash(f.path),f.sha256,f.path);if(!f.path.endsWith('/releaseEligibility.ts')&&!f.path.endsWith('\\releaseEligibility.ts'))assert.equal(f.sha256,oldMap.get(f.path),f.path);}
const file='src/lib/examStudy/releaseEligibility.ts',source=fs.readFileSync(file,'utf8'),previous=source.replace(' | typeof INVERSE_ROOT_TABLE_REVIEW','');assert.notEqual(previous,source);assert.equal(sha(Buffer.from(previous)),old.files.find(x=>x.path.endsWith('releaseEligibility.ts')).sha256);
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.ESNext}}).outputText;assert.equal(compile(source),compile(previous));
const tests=JSON.parse(fs.readFileSync(e+'inverse-root-table-tests-r1.json','utf8'));assert.equal(tests.numFailedTests,0);assert.equal(tests.numPassedTests,257);
const changed=['src/contracts/examStudy.contract.ts','src/lib/examStudy/requirements.ts','src/lib/examStudy/releaseEligibility.ts','src/lib/examStudy/families/middle/index.ts','src/lib/examStudy/families/middle/inverseRootTable.ts','src/__tests__/unit/examStudyInverseRootTable.test.ts'];
const paths=[...new Set([...Object.keys(JSON.parse(fs.readFileSync(e+'prepush-r15-receipt.json','utf8')).currentCombinedSourceHashes),...current.files.map(f=>f.path),...changed])],before=Object.fromEntries(paths.map(p=>[p,hash(p)]));
const env={...process.env,AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost',DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test'};
for(const k of ['STUDIO_ENGINE_URL','VERCEL','VERCEL_ENV'])delete env[k];
const jobs=[['inverse-root-table-types-r2.log',['node_modules/typescript/bin/tsc','--noEmit','--project',e+'tsconfig-owned-isolated-r14.json']],['inverse-root-table-lint-r2.log',['node_modules/eslint/bin/eslint.js',...changed]]];const outcomes=[];
for(const[name,args]of jobs){const log=fs.createWriteStream(e+name,{flags:'wx'}),status=await new Promise((resolve,reject)=>{const proc=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});console.log(JSON.stringify({name,pid:proc.pid}));proc.stdout.pipe(log,{end:false});proc.stderr.pipe(log,{end:false});proc.on('error',reject);proc.on('close',resolve);});await new Promise(r=>log.end(r));outcomes.push({name,status});for(const[p,h]of Object.entries(before))assert.equal(hash(p),h,p);console.log(JSON.stringify({name,status}));assert.equal(status,0,fs.readFileSync(e+name,'utf8').slice(-8000));}
fs.writeFileSync(e+'inverse-root-table-validation-r2.json',JSON.stringify({utc:new Date().toISOString(),before,after:before,sourceUnchanged:true,files:tests.testResults.length,passed:tests.numPassedTests,failed:0,skipped:tests.numPendingTests,outcomes,firstTypeFailure:e+'inverse-root-table-types-r1.log',typeCorrectionOnly:{oldHash:sha(Buffer.from(previous)),currentHash:hash(file),emittedJsIdentical:true,emittedJsSha256:sha(Buffer.from(compile(source))),studentPayloadAndMathAndReleaseLogicUnchanged:true},testEvidence:e+'inverse-root-table-tests-r1.json',scope:'Reuse first257passingruntimechecks because only a literal return type union changed; rerun failed typecheck and previously unrun lint. No compiler target/assertion/gate relaxation.',newEngineFiniteTuples:45,newManualAuthoredProblems:0,newManualFigures:0,reviewOnly:true,publicGenerationApproved:false,gradeRightsNativeRegistrationApproved:false,repositoryEnvLoaded:false,dbMocked:true,dbWrites:0,deploy:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:tests.testResults.length,passed:tests.numPassedTests,types:true,lint:true,publicRelease:0}));
