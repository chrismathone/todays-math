import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {stripTypeScriptTypes} from 'node:module';import {createHash} from 'node:crypto';
const p='.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r1/';
const read=x=>JSON.parse(fs.readFileSync(x,'utf8').replace(/^\uFEFF/,''));const scope=read(p+'scope-input.json');
const pick=name=>{const f=scope.files.find(x=>x.path.endsWith('\\'+name));assert(f);const b=fs.readFileSync(f.path);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);return{...f,text:b.toString('utf8')};};
const source=pick('inverseMinimum.ts'),support=pick('support.ts');
const originalLine='const answer = `\\\\sqrt{${s}}-\\\\sqrt{${r}}`;';assert(source.text.includes(originalLine));
// Controlled in-memory fault only: no root file or actual draft is changed.
const changed=source.text.replace(originalLine,'const answer = "0";');assert.notEqual(changed,source.text);
const helper=new vm.SourceTextModule(stripTypeScriptTypes(support.text,{mode:'transform'}));await helper.link(()=>{throw Error('unexpected helper import');});await helper.evaluate();
const kernel=new vm.SourceTextModule(stripTypeScriptTypes(changed,{mode:'transform'}));await kernel.link(spec=>{assert.equal(spec,'./support');return helper;});await kernel.evaluate();
const family=kernel.namespace.inverseMinimum;const bad=family.generate(0,0);const verdict=family.verify(bad);
const oracle=read('.qa-artifacts/exam-resume-20261008/inverse-minimum-proposal-20261020-r1/own-calculations24.json').rows[0];
assert.equal(bad.content,oracle.exactStudentPayload.content);assert.equal(bad.answer,'0');assert.notEqual(bad.answer,oracle.answer);assert.equal(verdict.valid,true);
const result={kind:'controlled-in-memory-coupling-demonstration',productionSourceChanged:false,actualR1OutputsChanged:false,sourceSha256:source.sha256,sourceFault:'replace shared make answer expression with constant 0 in memory only',printedContentUnchanged:true,independentExpected:oracle.answer,faultySharedAnswer:bad.answer,currentVerifierAgainstFaultySharedMake:verdict,finding:'Same faulty make answer is used by generate and verifier; canonical solution also incorporates this shared wrong answer, so exact template equality does not independently reject it.',limit:'Counterfactual fault injection, not a claim that current production answer is wrong. Actual unchanged24 remain independently correct.'};
fs.writeFileSync(p+'own-r1-coupling-control-result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
