import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const e='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/',hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const code=['scripts/import/exam-twin/vectorReplay.mjs','scripts/import/exam-twin/replay-vector-figures.mjs','scripts/import/exam-twin/vectorReplay.test.mjs','scripts/import/exam-twin/candidatePack.mjs','scripts/import/exam-twin/candidatePack.test.mjs'];
const tests=fs.readdirSync('scripts/import/exam-twin').filter(n=>n.endsWith('.test.mjs')).map(n=>'scripts/import/exam-twin/'+n).sort();
const paths=[...new Set([...code,...tests,'scripts/import/exam-twin/candidatePack.mjs'])],before=Object.fromEntries(paths.map(p=>[p,hash(p)]));
const jobs=[['vector-replay-tests-r3.tap',['--test',...tests]],['vector-replay-lint-r3.log',['node_modules/eslint/bin/eslint.js',...code]]],outcomes=[];
for(const[name,args]of jobs){const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(e+name,(r.stdout??'')+(r.stderr??''),{flag:'wx'});outcomes.push({name,status:r.status});for(const[p,h]of Object.entries(before))assert.equal(hash(p),h,p);assert.equal(r.status,0,(r.stdout??'')+(r.stderr??''));console.log(JSON.stringify({name,status:r.status}));}
const tap=fs.readFileSync(e+'vector-replay-tests-r3.tap','utf8'),count=k=>Number(tap.match(new RegExp('^# '+k+' (\\d+)$','m'))?.[1]);assert.equal(count('fail'),0);assert.equal(count('skipped'),0);
fs.writeFileSync(e+'vector-replay-validation-r3.json',JSON.stringify({utc:new Date().toISOString(),before,after:before,sourceUnchanged:true,files:tests.length,tests,passed:count('pass'),failed:count('fail'),skipped:count('skipped'),outcomes,actualVectorReplay:{path:'.qa-artifacts/exam-resume-20261008/vector-render-replay-cli-20261020-r4/replay-manifest.json',sha256:hash('.qa-artifacts/exam-resume-20261008/vector-render-replay-cli-20261020-r4/replay-manifest.json')},newManualQuestions:0,newFigures:0,approval:false,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({files:tests.length,passed:count('pass'),lintPassed:true}));
