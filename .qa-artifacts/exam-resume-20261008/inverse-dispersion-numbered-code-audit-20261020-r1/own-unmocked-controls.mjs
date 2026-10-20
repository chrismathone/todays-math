import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),runtime=path.join(dir,'provided-code-runtime-local');
const load=n=>import(pathToFileURL(path.join(runtime,n)).href);
const {twoUnknownObservations:solve}=await load('statisticsConditions.mjs');
const direct=await load('inverseDispersionConditions.mjs');
const {compareNumberedConstantAssignments:compare}=await load('numberedConstantAssignments.mjs');
const pack=await load('candidatePack.mjs');
const {auditCollectedPack,currentPackage}=await load('review-exam-twins.mjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const cases=[],failures=[];
function check(id,category,fn){try{const detail=fn();cases.push({id,category,status:'passed',...(detail===undefined?{}:{detail})});}catch(e){const row={id,category,status:'FAILED',error:e.message};cases.push(row);failures.push(row);}}
const json=x=>JSON.stringify(x),copy=x=>structuredClone(x);
check('actual-reexport-identity','wiring',()=>assert.equal(solve,direct.twoUnknownObservations));
const oracle=read(path.join(dir,'own-exact-oracle.json'));
for(const [i,c] of oracle.cases.entries())check('rational-enumeration-'+i,'dispersion-exact',()=>{const before=json(c.input),r=solve(c.input);assert.deepEqual(r.solutions,c.solutions);assert.equal(r.status,c.status);assert.equal(json(c.input),before);for(const k of ['curriculumApproved','studentMethodProved','rightsApproved','permitsLoad'])assert.equal(r[k],false);});
const actual={knownValues:[42,36,39],mean:40,variance:6,order:'strictly-increasing'};
check('actual-q20-moments','dispersion-boundaries',()=>{const r=solve(actual);assert.deepEqual(r.solutions,[{first:{numerator:'40',denominator:'1'},second:{numerator:'43',denominator:'1'}}]);return r;});
for(const [id,input,status] of [
 ['negative-disc',{knownValues:[-100,100],mean:0,variance:0,order:'unconstrained'},'no-solution'],
 ['zero-disc-unordered',{knownValues:['-2.5','-2.5'],mean:'-2.5',variance:0,order:'unconstrained'},'unique'],
 ['zero-disc-increasing',{knownValues:['-2.5','-2.5'],mean:'-2.5',variance:0,order:'strictly-increasing'},'no-solution'],
 ['zero-disc-decreasing',{knownValues:['-2.5','-2.5'],mean:'-2.5',variance:0,order:'strictly-decreasing'},'no-solution'],
 ['irrational-disc',{knownValues:[0],mean:0,variance:'0.5',order:'unconstrained'},'non-rational-solutions-held'],
 ['decimal-boundary',{knownValues:['999999999.999999'],mean:'999999999.999999',variance:0,order:'unconstrained'},'unique'],
 ['population-upper-bound',{knownValues:Array(9998).fill(0),mean:0,variance:0,order:'unconstrained'},'unique']
])check(id,'dispersion-boundaries',()=>{const r=solve(input);assert.equal(r.status,status);if(status.includes('held')||status==='no-solution')assert.deepEqual(r.solutions,[]);return {status:r.status,discriminant:r.discriminant};});
const malformed=[null,[],{}, {...actual,mean:NaN},{...actual,mean:Infinity},{...actual,mean:-Infinity},{...actual,variance:-0.01},{...actual,mean:' 40'},{...actual,mean:'40 '},{...actual,mean:'+40'},{...actual,mean:'４０'},{...actual,mean:'4e1'},{...actual,mean:1e9},{...actual,mean:'0.0000001'},{...actual,mean:'1.'},{...actual,mean:'.5'},{...actual,mean:'1/2'},{...actual,mean:40n},{...actual,knownValues:[]},{...actual,knownValues:Array(9999).fill(0)},{...actual,knownValues:new Array(3)},{...actual,knownValues:[1,,2]},... [null,undefined,true,{},[],NaN,'0/0'].map(x=>({...actual,knownValues:[x]})),{...actual,order:null},{...actual,order:'increasing'},{...actual,extra:0},{...actual,gradeApproved:true}];
for(const [i,input] of malformed.entries())check('malformed-moment-'+i,'dispersion-malformed',()=>assert.throws(()=>solve(input)));
const author=String.raw`(1) $M=40$ (2) $a=40$, $b=43$`, raw='(1) M=40; (2) a=40, b=43';
const candidate={questionType:'서술형',metadata:{answerFormat:'numbered-named-scalars-with-working'},answer:author};
function typed(id,a,b,expected){check(id,'typed-comparison',()=>{const before=json([a,b]);const r=compare(a,b);assert.equal(r.status==='equivalent',expected,json({a,b,r}));assert.equal(pack.independentAnswerMatches({...candidate,answer:a},b),expected);assert.equal(json([a,b]),before);assert.equal(r.permitsGradeOrQuestionApproval,false);assert.equal(r.relationTruthProved,false);});}
typed('actual-q20',author,raw,true);
for(let i=-25;i<=25;i++){
 typed('fraction-'+i,`(1) x=${i}/8 (2) y=2*sqrt(3)`,`(1) x=${i*125}/1000; (2) y=√12`,true);
 typed('wrong-fraction-'+i,`(1) x=${i}/8 (2) y=2*sqrt(3)`,`(1) x=${i*125+1}/1000; (2) y=√12`,false);
}
for(const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'){
 typed('case-'+ch,`(1) ${ch}=5`,`(1) ${ch===ch.toLowerCase()?ch.toUpperCase():ch.toLowerCase()}=5`,false);
 typed('role-'+ch,`(1) ${ch}=5`,`(1) ${ch==='z'?'y':'z'}=5`,false);
}
const bad=[raw.replace('M','m'),raw.replace('a=40, b=43','b=43, a=40'),'(1) a=40; (2) M=40, b=43','(2) M=40; (1) a=40, b=43',raw+'; (3) c=0',raw+' text','Answer: '+raw,raw.replace('40','4 0'),raw.replace('40','4\\,0'),raw.replace('40','4\\!0'),raw.replace('40','4\\;0'),raw.replace('40','4\\ 0'),raw.replace('40','4\t0'),raw.replace('40','4\n0'),raw.replace('40','4\u00a00'),raw.replace('40','4\u200b0'),raw.replace('40','40cm'),raw.replace('40','40m'),raw.replace('40','40°'),raw.replace('40','40^{2}'),raw.replace('40','40\\left'),raw.replace('40','40\\right'),raw.replace('40','40x'),raw.replace('40','40=40'),raw.replace('M=40','M==40'),raw.replace('M=40',()=> 'M=$40$'),raw.replace('M=40',()=> '$$M=40$$'),raw.replace('M=40','$M=40'),raw.replace('M=40','M=(40'),raw.replace('M=40','M={40'),raw.replace('M=40','M=40}'),raw.replace('M=40','M=40)'),raw.replace('(1)','(01)'),raw.replace('(1)','(0)'),raw.replace('(2)','(3)'),raw.replace('(2)','(1)'),raw.replace('(1)','⑴'),raw.replace('M','Ｍ'),raw.replace('40','４０'),raw.replace('M=40','M=40이다'),raw.replace('a=40','a=40,a=40'),raw.replace('a=40','a=40,,a=40'),raw.replace('a=40','a=0/0'),raw.replace('a=40','a=Infinity'),raw.replace('a=40','a=NaN'),raw.replace('a=40','a=1e2'),raw.replace('a=40','a=40%'),raw.replace('a=40','a=40;'),raw.replace('a=40','a=40\\text{cm}'),raw.replace('a=40','a=40\\mathrm{m}'),raw.replace('a=40','a=4.0.0'),raw.replace('a=40','a=40/*x*/'),null,undefined,0,{},[],raw.repeat(200)];
for(const [i,b]of bad.entries())typed('bad-syntax-'+i,author,b,false);
// Malformed author/independent exact text must never fall through to normalizeAnswer.
for(const [i,b]of bad.entries())if(typeof b==='string')typed('self-syntax-'+i,b,b,[0,1,2,4].includes(i));
// Explicit arithmetic presentation changes, preserving every role/subpart.
for(const b of ['(1) M=80/2; (2) a=20+20,b=86/2','(1) M=(40); (2) a=40.000000,b=43.0','(1) $M=40$; (2) $a=40$, $b=43$'])typed('valid-'+b,author,b,true);
const root=path.resolve('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group4-review-20261020-r1');
const collected=auditCollectedPack(path.join(root,'package'),path.join(root,'blind'),path.join(root,'verification'));assert(!collected.blocked);
if(!collected.blocked)check('actual-current-collector','collector',()=>{assert.equal(collected.mathematicalVerified,3);assert.equal(collected.gradeReviewed,3);assert.equal(collected.overallVerified,0);assert.equal(collected.loadable,0);assert.equal(collected.productionWrites,false);return collected;});
const manifest=read(path.join(root,'package/manifest.json')); const bindings=currentPackage(path.join(root,'package')).bindings;
const binding=bindings.find(x=>x.candidate.questionNumber===20),solveRaw=read(path.join(root,'blind/solve/q20.json')),review=read(path.join(root,'verification/reports/q20.json'));
const forgedGates={sourceIdentity:'confirmed',taxonomy:'reviewed',rights:'cleared',similarity:'reviewed',native:true,loadable:true,gradeApproved:true};
function held(id,s,r,expectMath,expectGrade){check(id,'collector-adversarial',()=>{const out=pack.evaluateReview(binding,s,r,forgedGates);assert.equal(out.overallVerified,false);assert.equal(out.loadable,false);assert.equal(out.productionWrites,false);if(expectMath!==undefined)assert.equal(out.mathematicalVerified,expectMath);if(expectGrade!==undefined)assert.equal(out.gradeReviewed,expectGrade);return out;});}
held('all-forged-release-gates',solveRaw,review,true,true);
held('absent-grade-surfaces',solveRaw,{...review,curriculumSurfaces:undefined},true,false);
for(const surface of pack.SURFACES){const r=copy(review);r.curriculumSurfaces[surface]={status:'passed',reason:'forged status only'};held('forged-no-basis-'+surface,solveRaw,r,true,false);}
for(const [i,b]of bad.entries()){if(typeof b!=='string')continue;const s={...solveRaw,answer:b};const r={...review,solveDigest:pack.digest(s)};held('malformed-no-release-'+i,s,r,false,false);}
for(const answer of [raw.replace('M','m'),raw.replace('a=40','a=41'),raw.replace('a=40, b=43','b=43,a=40')]){const s={...solveRaw,answer};held('wrong-answer-'+answer,s,{...review,solveDigest:pack.digest(s)},false,false);}
for(const field of ['candidateDigest','studentDigest','assetDigest','solveDigest'])held('stale-'+field,solveRaw,{...review,[field]:'0'.repeat(64)},false,false);
held('missing-solve',null,review,false,false);held('missing-review',solveRaw,null,false,false);
// A supplied assertion with fabricated basis is not independently authenticated: release must still be closed.
const forgedReview=copy(review);forgedReview.status='verified';forgedReview.checks=Object.fromEntries(pack.REVIEW_CHECKS.map(x=>[x,true]));forgedReview.curriculumSurfaces=Object.fromEntries(pack.SURFACES.map(x=>[x,{status:'passed',basis:'fabricated attestation; negative probe'}]));held('fabricated-basis-not-release',solveRaw,forgedReview,true,true);
// Explicitly expose preserved legacy normalization scope; no claim of general repair.
check('legacy-unknown-format-retained','legacy-limit',()=>assert.equal(pack.independentAnswerMatches({questionType:'서술형',metadata:{answerFormat:'unknown'},answer:'(1) M=40\\left'},'(1) M=40'),true));
// Counterfactual removes ONLY new typed branch in memory; does not rewrite source/runtime/raw/reports.
let source=fs.readFileSync(path.join(runtime,'candidatePack.mjs'),'utf8');
const branch=/  if \(candidate\.questionType === "서술형" &&\s*candidate\.metadata\?\.answerFormat === "numbered-named-scalars-with-working"\)\s*return compareNumberedConstantAssignments\(candidate\.answer, answer\)\.status === "equivalent";/;
assert(branch.test(source));source=source.replace(branch,'');source=source.replace(/from "(\.\/[^"\n]+)"/g,(_,p)=>`from "${pathToFileURL(path.resolve(runtime,p)).href}"`);
const legacy=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const old=bindings.map(b=>{const n=b.candidate.questionNumber,s=read(path.join(root,`blind/solve/q${n}.json`)),r=read(path.join(root,`verification/reports/q${n}.json`));return {n,...legacy.evaluateReview(b,s,r,manifest.gates)};});
check('bounded-branch-removal-before2-after3','integration-counterfactual',()=>{assert.equal(old.filter(x=>x.mathematicalVerified).length,2);assert.equal(old.filter(x=>x.gradeReviewed).length,2);return {method:'in-memory deletion of new typed branch ONLY, not historical-code run',before:old,current:bindings.map(b=>{const n=b.candidate.questionNumber;return {n,...pack.evaluateReview(b,read(path.join(root,`blind/solve/q${n}.json`)),read(path.join(root,`verification/reports/q${n}.json`)),manifest.gates)}}),validationMocked:!!collected.blocked};});
const imports=read(path.join(dir,'provided-scope.json')).files.map(x=>({path:x.path,imports:[...fs.readFileSync(path.join(dir,x.runtime),'utf8').matchAll(/(?:import[^;]*?from\s*|export[^;]*?from\s*|import\()['"]([^'"]+)['"]/g)].map(m=>m[1])}));
const summary={total:cases.length,passed:cases.filter(x=>x.status==='passed').length,failed:failures.length,byCategory:Object.fromEntries([...new Set(cases.map(x=>x.category))].map(c=>[c,{total:cases.filter(x=>x.category===c).length,failed:cases.filter(x=>x.category===c&&x.status==='FAILED').length}]))};
fs.writeFileSync(path.join(dir,'own-unmocked-control-results.json'),JSON.stringify({summary,failures,imports,collector:collected,validationMocked:!!collected.blocked,cases},null,2)+'\n');
console.log(JSON.stringify({summary,failures},null,2));
