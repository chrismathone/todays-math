/** Bind actual independent semantic reports. No answer-literal override or writer. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bindCandidate,digest,readJson,sha256,SURFACES,REVIEW_CHECKS,normalizeAnswer} from '../../scripts/import/exam-twin/candidatePack.mjs';
import {currentPackage} from '../../scripts/import/exam-twin/review-exam-twins.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const scopes=[
 {exam:'Gyeongsang-stat',package:base+'gyeongsang-stat-review-r1/package',blind:base+'gyeongsang-stat-review-r1/blind',reports:base+'gyeongsang-stat-final-review-r1',index:base+'gyeongsang-stat-authoring-r1/candidate-index-r4.json',expected:7},
 {exam:'Gyeongsan',package:base+'gyeongsan-independent-r1/package',blind:base+'gyeongsan-independent-r1/blind',reports:base+'gyeongsan-final-review-r1',index:base+'gyeongsan-authoring-r1/author-index-all25.json',expected:24,excludeSuperseded:[22]},
 {exam:'Gyeonggu',package:base+'gyeonggu-review-r1/package',blind:base+'gyeonggu-independent-r1/blind',reports:base+'gyeonggu-final-review-r1',index:base+'gyeonggu-authoring-r1/candidate-index.json',expected:22},
 {exam:'Gyeongam',package:base+'gyeongam-independent-r1/package',blind:base+'gyeongam-independent-r1/blind',reports:base+'gyeongam-final-review-r1',index:base+'gyeongam-authoring-r1/candidate-index.json',expected:18},
];
const groups=scopes.map(scope=>{
 const {bindings}=currentPackage(scope.package),index=readJson(scope.index);
 assert.equal(bindings.length,scope.expected);
 const rows=bindings.filter(b=>!(scope.excludeSuperseded??[]).includes(b.candidate.questionNumber)).map(b=>{
  const n=b.candidate.questionNumber,tag=`q${String(n).padStart(2,'0')}`;
  const reportPath=path.join(scope.reports,'reports',tag+'.json'),solvePath=path.join(scope.blind,'solve',tag+'.json');
  const report=readJson(reportPath),solve=readJson(solvePath);
  const authoredRow=(index.candidates??index.questions).find(r=>r.questionNumber===n),authored=bindCandidate(path.join(path.dirname(scope.index),authoredRow.candidatePath));
  assert.equal(report.twinExternalId,b.candidate.twinExternalId);assert.equal(report.method,'independent-solve-then-review');
  assert(solve.solverId && report.verifierId && solve.solverId!==b.candidate.authorId && report.verifierId!==b.candidate.authorId);
  for(const key of ['studentDigest','candidateDigest','assetDigest'])assert.equal(report[key],b[key]);
  assert.equal(solve.studentDigest,b.studentDigest);assert.equal(report.solveDigest,digest(solve));assert.equal(solve.status,'solved');
  assert.equal(authored.studentDigest,b.studentDigest);assert.equal(authored.assetDigest,b.assetDigest);
  for(const key of ['content','choices','answer','solution','metadata','variantDelta'])assert.deepEqual(authored.candidate[key],b.candidate[key]);
  assert.equal(b.validation.surfaceKeywordViolations.length,0);
  for(const key of REVIEW_CHECKS)assert(typeof report.checks[key]==='boolean' || report.checks[key]===null,'Unknown check encoding: '+key);
  for(const surface of SURFACES) {
   const audit=report.curriculumSurfaces[surface];assert.equal(audit.status,'passed');assert(audit.basis || audit.evidence);
  }
  const mathKeys=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent'];
  assert(mathKeys.every(key=>report.checks[key]===true));
  assert(report.checks.curriculumAppropriate && report.checks.allStudentSurfacesInScope);
  const mathEvidence=report.evidence.answerCorrect;
  if(mathEvidence)assert(mathEvidence.basis || mathEvidence.comparisons || mathEvidence.calculationEvidence);
  else if(report.evidence.answerEquivalence)assert.equal(report.evidence.answerEquivalence.passed,true,'Independent comparison did not pass');
  else {
   const comparison=report.evidence.answerComparison;
   assert.equal(comparison?.semanticEqual,true,'Independent comparison evidence missing');
   assert(comparison.unitMeaningChecked===true || comparison.unitAndTargetOrderChecked===true,'Answer roles/units unchecked');
   assert(report.evidence.newSolutionIndividuallyRead===true || typeof report.evidence.mathAndNewSolution==='string','New solution review evidence missing');
   const binding=report.evidence.bindingRecord??report.evidence.binding;
   for(const key of ['studentDigest','candidateDigest','assetDigest'])assert.equal(binding[key],b[key]);
   assert.equal(binding.solveDigest,digest(solve));assert.equal(binding.rawSolveSha256,sha256(fs.readFileSync(solvePath)));
  }
  return {questionNumber:n,twinExternalId:b.candidate.twinExternalId,authoredCandidate:{path:authored.candidateFile,sha256:authored.candidateFileSha256,candidateDigest:authored.candidateDigest},packageCandidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,rawSolve:{path:solvePath,sha256:sha256(fs.readFileSync(solvePath)),solveDigest:digest(solve)},report:{path:reportPath,sha256:sha256(fs.readFileSync(reportPath)),reportDigest:digest(report)},independentMathReviewerPassed:true,independentSevenSurfaceGradeReviewerPassed:true,contentReviewPassed:REVIEW_CHECKS.every(key=>report.checks[key]===true),holds:REVIEW_CHECKS.filter(key=>!report.checks[key]),literalComparatorMatches:normalizeAnswer(solve.answer)===normalizeAnswer(b.candidate.answer),literalComparatorOverridden:false,fullVerified:false,loadable:false};
 });
 return {exam:scope.exam,reviewed:rows.length,mathReviewerPassed:rows.length,gradeReviewerPassed:rows.length,contentPassed:rows.filter(r=>r.contentReviewPassed).length,contentHeld:rows.filter(r=>!r.contentReviewPassed).length,rows};
});
const rows=groups.flatMap(g=>g.rows);
const result={kind:'current-bound-independent-semantic-review-audit/v2',createdAt:new Date().toISOString(),groups,counts:{newIndependentMathReviewerPassed:rows.length,newIndependentSevenSurfaceGradeReviewerPassed:rows.length,newContentReviewPassed:rows.filter(r=>r.contentReviewPassed).length,newContentReviewHeld:rows.filter(r=>!r.contentReviewPassed).length,newLiteralComparatorMatches:rows.filter(r=>r.literalComparatorMatches).length,fullVerified:0,loadable:0,dbWrites:0},supersededReviewExcluded:[{exam:'Gyeongsan',questionNumber:22,id:'exam-twin-gyeongsan-2025-2-mid-author-r1-q22',reason:'Current r2 needs its own fresh solve and review; r1 wrong-choice equivalence hold and report are preserved.'}],scope:'70 currently selected independently reviewed GG22/GA18/GS23/stat7; first BUM20 is separately bound. Literal-format collection support is separate. No automatic whole-answer semantic approval, rights, provenance or loading gate changed.'};
assert.equal(rows.length,70);
assert.equal(groups[0].contentPassed,0);assert.equal(groups[1].contentPassed,2);assert.equal(groups[2].contentPassed,1);assert.equal(groups[3].contentPassed,0);
fs.writeFileSync(base+'current-final-semantic-review-summary-r2.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result.counts));
