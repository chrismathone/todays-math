import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const prefix=path.resolve('.qa-artifacts/exam-resume-20261008/angle-presentation-code-audit-20261020-r1');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const hash=b=>createHash('sha256').update(b).digest('hex');
const scope=read(path.join(prefix,'provided-scope.json'));
const before=Object.fromEntries(scope.files.map(f=>{const actual=hash(fs.readFileSync(f.path));assert.equal(actual,f.sha256);return [f.path,actual];}));
fs.writeFileSync(path.join(prefix,'own-utf8-probe.txt'),'각도 표기 비교: 원시 바이트 보존\n',{flag:'wx'});assert.equal(fs.readFileSync(path.join(prefix,'own-utf8-probe.txt'),'utf8'),'각도 표기 비교: 원시 바이트 보존\n');
const file=name=>scope.files.find(f=>path.basename(f.path)===name).path;
const present=await import(pathToFileURL(file('answerPresentation.mjs')));
const candidate=await import(pathToFileURL(file('candidatePack.mjs')));
const collector=await import(pathToFileURL(file('review-exam-twins.mjs')));
const compare=present.compareWrittenAnswerPresentation;
let cases=[];
function check(name,fn){fn();cases.push(name);}
function invariant(out){assert.equal(out.presentationComparisonOnly,true);assert.equal(out.relationTruthProved,false);assert.equal(out.permitsGradeOrQuestionApproval,false);assert.equal(out.generalSymbolicEquivalence,false);}
for(const value of ['0','1','27','50','115','230','359.999999','360','0.000001','27.125','27.000000']){
 for(const wrapper of [x=>x+'°',x=>'$'+x+'^\\circ$',x=>'\\('+x+'^{\\circ}\\)',x=>' '+x+' ^ {\\circ} ']){
  const x=wrapper(value);check('explicit-degree-positive:'+x,()=>{const out=compare(value+'°',x);assert.equal(out.status,'equivalent');invariant(out);assert.equal(compare(x,value+'°').status,'equivalent');});
 }
}
for(let n=0;n<=360;n++)check('integer-domain:'+n,()=>{assert.equal(present.singleAnglePart(n+'°').value,String(n));assert.equal(compare(n+'°','$'+n+'^\\circ$').status,'equivalent');});
const bad=['27','27cm','27rad','27도','27°cm','27°°','정답27°','27°이다','A=27°','α=27°','(1) 27°','27°,27°','27°;28°','2 7°','2\\,7°','２７°','²⁷°','027°','+27°','-0°','-27°','.27°','27.°','27.0000000°','1e1°','361°','360.000001°','(54/2)°','\\frac{54}{2}°','√729°','$27°','27°$','$$27°$$','$27$°','27^{\\circ}extra','27^\\circ{}','27^{°}','27\u0000°','NaN°','Infinity°',null,undefined,27,{},[],true,' '.repeat(65)+'27°'];
for(let i=0;i<bad.length;i++)check('bad-boundary:'+i,()=>{assert.throws(()=>present.singleAnglePart(bad[i]));assert.notEqual(compare('27°',bad[i]).status,'equivalent');assert.notEqual(compare(bad[i],'27°').status,'equivalent');assert.equal(candidate.independentAnswerMatches({questionType:'서술형',choices:[],answer:'$27^\\circ$'},bad[i]),false);});
for(const [a,b] of [['27°','27.000001°'],['0°','0.000001°'],['359.999999°','360°'],['115°','230°'],['27°','(1) A=27°']])check('unequal:'+a+':'+b,()=>{assert.equal(compare(a,b).status,'different');assert.equal(compare(b,a).status,'different');});
check('trailing-zero-exact',()=>assert.equal(compare('27.125°','27.125000°').status,'equivalent'));
check('missing-unit-not-inferred',()=>assert.equal(candidate.independentAnswerMatches({questionType:'서술형',answer:'27°',choices:[]},'27'),false));
check('old-exact-fallback-explicit-limit',()=>{assert.equal(compare('arbitrary prose','arbitrary prose').status,'unsupported');assert.equal(candidate.independentAnswerMatches({questionType:'서술형',answer:'arbitrary prose',choices:[]},'arbitrary prose'),true);});
// In-memory fault/control version only: remove exactly the added scalar-angle parse branch.
let oldPresentation=fs.readFileSync(file('answerPresentation.mjs'),'utf8');
const branch="  try { return [{ label: 1, terms: [{ part: singleAnglePart(source), variable: null }] }]; }\n  catch { /* Numbered/named grammars retain their own roles and bounds. */ }";
oldPresentation=oldPresentation.replaceAll('\r\n','\n');assert(oldPresentation.includes(branch));oldPresentation=oldPresentation.replace(branch,'');
oldPresentation=oldPresentation.replace("'./constantAnswers.mjs'",JSON.stringify(pathToFileURL(file('constantAnswers.mjs')).href));
const oldUrl='data:text/javascript;base64,'+Buffer.from(oldPresentation).toString('base64');
let oldCandidate=fs.readFileSync(file('candidatePack.mjs'),'utf8');
oldCandidate=oldCandidate.replace(/from\s+(["'])(\.\/[^"']+)\1/g,(_,quote,rel)=>'from '+JSON.stringify(rel==='./answerPresentation.mjs'?oldUrl:pathToFileURL(path.resolve(path.dirname(file('candidatePack.mjs')),rel)).href));
const previous=await import('data:text/javascript;base64,'+Buffer.from(oldCandidate).toString('base64'));
const manual=path.resolve('.qa-artifacts/exam-resume-20261008/gyeongsin-group10-review-20261020-r1');
const protectedFiles=[];
for(const q of [11,12])for(const rel of [`blind/solve/q${q}.json`,`verification/reports/q${q}.json`])protectedFiles.push(path.join(manual,rel));
const protectedBefore=Object.fromEntries(protectedFiles.map(f=>[f,hash(fs.readFileSync(f))]));
const actualPackage=collector.currentPackage(path.join(manual,'package'));let oldResults=[],newResults=[];
for(const binding of actualPackage.bindings){const q=binding.candidate.questionNumber;const raw=read(path.join(manual,`blind/solve/q${q}.json`));const report=read(path.join(manual,`verification/reports/q${q}.json`));
 oldResults.push({q,...previous.evaluateReview(binding,raw,report,actualPackage.manifest.gates)});
 newResults.push({q,...candidate.evaluateReview(binding,raw,report,actualPackage.manifest.gates)});
 if(q===11){
 check('q11-old-unsupported-new-equivalent',()=>{assert.equal(previous.independentAnswerMatches(binding.candidate,raw.answer),false);assert.equal(candidate.independentAnswerMatches(binding.candidate,raw.answer),true);});
 for(const name of ['missing-grade-basis','pending-grade','wrong-answer','forged-all-gates'])check(name,()=>{let r=structuredClone(report),s=structuredClone(raw),g=structuredClone(actualPackage.manifest.gates);if(name==='missing-grade-basis')delete r.curriculumSurfaces.studentSolution.basis;if(name==='pending-grade')r.curriculumSurfaces.studentSolution.status='pending';if(name==='wrong-answer')s.answer='28°';if(name==='forged-all-gates')g={sourceIdentity:'confirmed',taxonomy:'reviewed',rights:'cleared',similarity:'reviewed'};const out=candidate.evaluateReview(binding,s,r,g);assert.equal(out.overallVerified,false);assert.equal(out.loadable,false);assert.equal(out.productionWrites,false);if(name==='wrong-answer'){assert.equal(out.mathematicalVerified,false);assert.equal(out.gradeReviewed,false);}if(name==='missing-grade-basis'||name==='pending-grade')assert.equal(out.gradeReviewed,false);});
 }
}
check('actual-group10-before1-after2',()=>{assert.equal(oldResults.filter(r=>r.mathematicalVerified).length,1);assert.equal(newResults.filter(r=>r.mathematicalVerified).length,2);assert.equal(oldResults.filter(r=>r.gradeReviewed).length,1);assert.equal(newResults.filter(r=>r.gradeReviewed).length,2);});
check('actual-current-collector',()=>{const out=collector.auditCollectedPack(path.join(manual,'package'),path.join(manual,'blind'),path.join(manual,'verification'));assert.equal(out.mathematicalVerified,2);assert.equal(out.gradeReviewed,2);assert.equal(out.overallVerified,0);assert.equal(out.loadable,0);assert.equal(out.productionWrites,false);});
for(const f of scope.files)assert.equal(hash(fs.readFileSync(f.path)),before[f.path]);for(const f of protectedFiles)assert.equal(hash(fs.readFileSync(f)),protectedBefore[f]);
const result={kind:'independent-bounded-angle-presentation-audit/v1',ownCases:cases.length,cases,sourceBeforeAfterHashes:before,protectedRawReportBeforeAfterHashes:protectedBefore,oldResults,newResults,oldSimulation:'Only scalar-angle parse branch removed in memory from scoped current module; not claim of checking an unavailable historical source blob',actualCollector:{mathematicalVerified:2,gradeReviewed:2,overallVerified:0,loadable:0},limits:['decimal explicit degree grammar only, 0..360, at most six fractional digits; no missing-unit inference','existing named/numbered grammars and normalizeAnswer identical-string fallback remain prior behavior, not new unrestricted scalar acceptance','no general TeX/symbolic or relation truth proof','no new grade/rights/native/family/manual-count approval; no DB/API/root writes','six pinned source bytes checked before/after; imports may resolve existing runtime dependencies without explicit additional source reads'],status:'bounded-controls-passed'};
fs.writeFileSync(path.join(prefix,'own-code-controls-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({ownCases:cases.length,status:result.status,sourceHashes:before}));
