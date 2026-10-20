import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {independentAnswerMatches,bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const e='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/',b='.qa-artifacts/exam-resume-20261008/',baseline='0f27a21d457fa715fff75cbb830a0814e8bea035',source='scripts/import/exam-twin/candidatePack.mjs';
const r=spawnSync('git',['show',baseline+':'+source],{encoding:'utf8',maxBuffer:2*1024*1024});assert.equal(r.status,0);fs.writeFileSync(e+'current151-parity-baseline-candidatePack.mjs.snapshot',r.stdout,{flag:'wx'});
const importable=r.stdout.replace(/from (["'])(\.[^"']+)\1/g,(_,quote,target)=>'from '+JSON.stringify(pathToFileURL(path.resolve(path.dirname(source),target)).href));
const modulePath=e+'current151-parity-baseline-importable.mjs';fs.writeFileSync(modulePath,importable,{flag:'wx'});const prior=await import(pathToFileURL(path.resolve(modulePath)).href);
const selected=readJson(b+'current-authored-batches-v37.json').groups.flatMap(g=>g.candidates),byId=new Map(selected.map(row=>[row.twinExternalId,row])),old=readJson(e+'angle-length-current138-parity-r4.json'),pairs=[...old.rows.map(r=>({id:r.id,raw:r.raw}))],covered=new Set(pairs.map(r=>r.id));
assert.equal(covered.size,138);for(const row of selected)if(!covered.has(row.twinExternalId)){assert(row.review.solve);pairs.push({id:row.twinExternalId,raw:row.review.solve});covered.add(row.twinExternalId);}
assert.equal(covered.size,151);const rows=[];
for(const pair of pairs){const candidate=bindCandidate(byId.get(pair.id).candidate.path).candidate;assert.equal(sha256(fs.readFileSync(pair.raw.path)),pair.raw.sha256);const raw=readJson(pair.raw.path),before=prior.independentAnswerMatches(candidate,raw.answer),after=independentAnswerMatches(candidate,raw.answer);assert.equal(before,after,pair.id);rows.push({...pair,before,after});}
fs.writeFileSync(e+'current151-answer-parity-r1.json',JSON.stringify({utc:new Date().toISOString(),baselineGitCommit:baseline,baselineSourceSha256:sha256(Buffer.from(r.stdout)),relativeDependenciesResolvedToUnchangedCurrentModules:true,currentSelected:151,actualRawComparisons:rows.length,changedComparisons:0,rows,rawsOrCandidatesRewritten:false,mathOrGradeApproval:false,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({selected:151,rawComparisons:rows.length,changed:0}));
