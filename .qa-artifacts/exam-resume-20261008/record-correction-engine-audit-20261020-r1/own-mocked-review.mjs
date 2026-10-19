import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const p='.qa-artifacts/exam-resume-20261008/record-correction-engine-audit-20261020-r1/';
const read=x=>JSON.parse(fs.readFileSync(x,'utf8').replace(/^\uFEFF/,''));
const scope=read(p+'scope-input.json');
const mod=await import(pathToFileURL(scope.files.find(x=>x.path.endsWith('\\candidatePack.mjs')).path).href);
const notation=await import(pathToFileURL(scope.files.find(x=>x.path.endsWith('\\authoredMathNotation.mjs')).path).href);
const results=[];
for(const [group,q] of [['nobyeon-sem1-group13-review-20261020-r1','03'],['nobyeon-sem1-group11-review-20261020-r3','19']]){
 const v='.qa-artifacts/exam-resume-20261008/'+group+'/verification/'; const i=read(v+'verification-inputs.json')[0], r=read(v+'reports/q'+q+'.json');
 const fields=[['stem',i.candidate.content],...i.candidate.choices.map((x,n)=>['choice'+(n+1),x]),['answer',i.candidate.answer],['solution',i.candidate.solution]];
 const warnings=fields.flatMap(([surface,text])=>notation.unescapedMathCommandWarnings(text).map(w=>({surface,...w})));
 assert.equal(warnings.length,0);
 // Explicit mock: no validateCandidate/solver_rules/private package reads.
 const binding={...i,validation:{surfaceKeywordViolations:[],metadataAnswerFormatMismatch:false,studentMathNotationWarnings:warnings}};
 const result=mod.evaluateReview(binding,i.independentSolve,r,{});
 assert.equal(result.mathematicalVerified,true);assert.equal(result.gradeReviewed,true);assert.equal(result.loadable,false);assert.equal(result.overallVerified,false);assert(result.reasons.includes('review-unitFamilyFit-not-passed'));
 const oldGrade=structuredClone(r);delete oldGrade.curriculumSurfaces.stem.basis;delete oldGrade.curriculumSurfaces.stem.evidence;
 const badGrade=mod.evaluateReview(binding,i.independentSolve,oldGrade,{});assert.equal(badGrade.gradeReviewed,false);assert(badGrade.reasons.includes('curriculum-stem-basis-missing'));
 const forged=structuredClone(i.independentSolve);forged.answer=q==='03'?'①':forged.answer.replace('=27','=28');
 const boundWrong={...r,solveDigest:mod.digest(forged)};const wrong=mod.evaluateReview(binding,forged,boundWrong,{});assert.equal(wrong.mathematicalVerified,false);assert.equal(wrong.gradeReviewed,false);assert(wrong.reasons.includes('independent-answer-mismatch'));
 const warnBinding=structuredClone(binding);warnBinding.validation.studentMathNotationWarnings=notation.unescapedMathCommandWarnings('$sqrt2$');const warningResult=mod.evaluateReview(warnBinding,i.independentSolve,r,{});assert.equal(warningResult.mathematicalVerified,false);assert.equal(warningResult.gradeReviewed,false);
 results.push({question:q,mockedBoundary:'explicit validation only; no actual package/CLI/DB',current:result,missingBasis:badGrade,wrongAnswer:wrong,lostCommand:warningResult,actualCurrentSurfaceNotationWarnings:warnings});
}
const after=scope.files.map(f=>{const actual=createHash('sha256').update(fs.readFileSync(f.path)).digest('hex');assert.equal(actual,f.sha256,f.path);return{path:f.path,sha256:actual};});
fs.writeFileSync(p+'own-source-hashes-after.json',JSON.stringify(after,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(p+'own-mocked-review-results.json',JSON.stringify(results,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({currentReports:results.map(x=>({q:x.question,math:x.current.mathematicalVerified,grade:x.current.gradeReviewed,loadable:x.current.loadable})),sourceFilesUnchanged:after.length,negativeMockControls:6}));
