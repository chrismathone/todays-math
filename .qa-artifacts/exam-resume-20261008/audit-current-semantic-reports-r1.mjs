/** Bind actual independent semantic reports. No answer-literal override or writer. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bindCandidate,digest,readJson,sha256,SURFACES,REVIEW_CHECKS,normalizeAnswer} from '../../scripts/import/exam-twin/candidatePack.mjs';
import {currentPackage} from '../../scripts/import/exam-twin/review-exam-twins.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const scopes=[
 {exam:'Gyeonggu',package:base+'gyeonggu-review-r1/package',blind:base+'gyeonggu-independent-r1/blind',reports:base+'gyeonggu-final-review-r1',index:base+'gyeonggu-authoring-r1/candidate-index.json',expected:22},
 {exam:'Gyeongam',package:base+'gyeongam-independent-r1/package',blind:base+'gyeongam-independent-r1/blind',reports:base+'gyeongam-final-review-r1',index:base+'gyeongam-authoring-r1/candidate-index.json',expected:18},
];
const groups=scopes.map(scope=>{
 const {bindings}=currentPackage(scope.package),index=readJson(scope.index);
 assert.equal(bindings.length,scope.expected);
 const rows=bindings.map(b=>{
  const n=b.candidate.questionNumber,tag=`q${String(n).padStart(2,'0')}`;
  const reportPath=path.join(scope.reports,'reports',tag+'.json'),solvePath=path.join(scope.blind,'solve',tag+'.json');
  const report=readJson(reportPath),solve=readJson(solvePath);
  const authoredRow=index.candidates.find(r=>r.questionNumber===n),authored=bindCandidate(path.join(path.dirname(scope.index),authoredRow.candidatePath));
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
  else assert.equal(report.evidence.answerEquivalence?.passed,true,'Independent comparison evidence missing');
  return {questionNumber:n,twinExternalId:b.candidate.twinExternalId,authoredCandidate:{path:authored.candidateFile,sha256:authored.candidateFileSha256,candidateDigest:authored.candidateDigest},packageCandidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,rawSolve:{path:solvePath,sha256:sha256(fs.readFileSync(solvePath)),solveDigest:digest(solve)},report:{path:reportPath,sha256:sha256(fs.readFileSync(reportPath)),reportDigest:digest(report)},independentMathReviewerPassed:true,independentSevenSurfaceGradeReviewerPassed:true,contentReviewPassed:REVIEW_CHECKS.every(key=>report.checks[key]===true),holds:REVIEW_CHECKS.filter(key=>!report.checks[key]),literalComparatorMatches:normalizeAnswer(solve.answer)===normalizeAnswer(b.candidate.answer),literalComparatorOverridden:false,fullVerified:false,loadable:false};
 });
 return {exam:scope.exam,reviewed:rows.length,mathReviewerPassed:rows.length,gradeReviewerPassed:rows.length,contentPassed:rows.filter(r=>r.contentReviewPassed).length,contentHeld:rows.filter(r=>!r.contentReviewPassed).length,rows};
});
const result={kind:'current-bound-independent-semantic-review-audit/v1',createdAt:new Date().toISOString(),groups,counts:{newIndependentMathReviewerPassed:40,newIndependentSevenSurfaceGradeReviewerPassed:40,newContentReviewPassed:1,newContentReviewHeld:39,newLiteralComparatorMatches:groups.flatMap(g=>g.rows).filter(r=>r.literalComparatorMatches).length,fullVerified:0,loadable:0,dbWrites:0},scope:'Actual current20+22+18 independent reviewer dimensions; literal-format collection support is separate. No automatic whole-answer semantic approval, rights, provenance or loading gate changed.'};
assert.equal(groups[0].contentPassed,1);assert.equal(groups[1].contentPassed,0);
fs.writeFileSync(base+'current-final-semantic-review-summary-r1.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result.counts));
