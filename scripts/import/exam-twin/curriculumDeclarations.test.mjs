import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {compareCurriculumDeclarations as compare} from './curriculumDeclarations.mjs';
import {bindCandidate,readJson,evaluateReview,sha256} from './candidatePack.mjs';
const fixture=(primary,declared)=>({curriculumReview:{officialBasis:{primaryStandardCodes:primary},standardCodes:declared}});

test('matching codes or a primary subset are consistency only, never grade approval',()=>{
  for(const candidate of [fixture(['9수01-07'],['9수01-07']),fixture([' [9수01-07] '],['9수01-07','9수01-10'])]){
    const result=compare(candidate);assert.equal(result.status,'consistent-as-declared');assert.deepEqual(result.conflicts,[]);assert.equal(result.curriculumApproved,false);assert.equal(result.permitsLoad,false);
  }
});
test('missing declarations are unmeasured, while explicit malformed declarations conflict',()=>{
  assert.equal(compare({}).comparisonPerformed,false);assert.equal(compare({}).curriculumApproved,false);
  for(const candidate of [fixture(undefined,['9수01-07']),fixture(['9수01-07'],undefined)])assert.equal(compare(candidate).status,'not-comparable-missing-declaration');
  for(const value of [[],null,'9수01-07',[null],[''],[' [] ']])assert.equal(compare(fixture(value,['9수01-07'])).status,'conflict');
});
test('contradictory explicit codes name the exact conflicting field and preserve inputs',()=>{
  const c=fixture(['9수01-07'],['9수02-12']),before=JSON.stringify(c),r=compare(c);
  assert.equal(r.status,'conflict');assert.equal(r.conflicts[0].code,'9수01-07');assert.equal(r.conflicts[0].path,'curriculumReview.officialBasis.primaryStandardCodes');assert.equal(JSON.stringify(c),before);
});
test('the actual two Gachang metadata faults are held without changing student/raw/figure bytes',()=>{
  const root='.qa-artifacts/exam-resume-20261008/gachang-first2-review-20261020-r1/';
  for(const n of [1,2]){const name=`q0${n}.json`,candidate=root+`package/private/q0${n}/candidate.json`,raw=root+'blind/solve/'+name,report=root+'verification/reports/'+name,before=[candidate,raw,report].map(p=>sha256(fs.readFileSync(p))),binding=bindCandidate(candidate),solve=readJson(raw),review=readJson(report),result=evaluateReview(binding,solve,review);
    assert.equal(binding.validation.curriculumMetadataComparison.status,'conflict');assert.equal(result.mathematicalVerified,true);assert.equal(result.gradeReviewed,false);assert(result.reasons.includes('curriculum-metadata-declarations-conflict'));assert.equal(result.loadable,false);assert.deepEqual([candidate,raw,report].map(p=>sha256(fs.readFileSync(p))),before);
  }
});
test('freezing the actual conflicting declaration rejects before a new package is written',()=>{
  const output=path.join(os.tmpdir(),'twin-curriculum-conflict-'+process.pid);
  assert(!fs.existsSync(output));const run=spawnSync(process.execPath,['scripts/import/exam-twin/review-exam-twins.mjs','freeze',output,'.qa-artifacts/exam-resume-20261008/gachang-first2-authoring-20261020-r1/gachang/q01.json'],{encoding:'utf8'});
  assert.notEqual(run.status,0);assert.match(run.stderr,/Conflicting curriculum metadata/u);assert(!fs.existsSync(output));
});
