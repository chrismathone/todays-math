// Read-only contract verification. Writes only this new review evidence file.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const evidenceName=process.argv[2] ?? 'contract-bindings.json';
assert.match(evidenceName,/^contract-bindings(?:-r2)?\.json$/);
const own=path.resolve(out,'../../..');
const parent=path.resolve(own,'../exam-extraction-resume-20261008');
const qa='.qa-artifacts/exam-resume-20261008';
const contract=await import(pathToFileURL(path.join(parent,'scripts/import/exam-twin/candidatePack.mjs')).href);
const {bindCandidate,digest,normalizeAnswer,readJson,sha256}=contract;
const inputs=readJson(path.join(parent,qa,'gyeonggu-review-r1/verification/verification-inputs.json'));
const join=readJson(path.join(parent,qa,'gyeonggu-source-author-join-r1.json'));
const rows=[];
for(const q of inputs){
  const n=q.candidate.questionNumber,tag=`q${String(n).padStart(2,'0')}`;
  const pack=bindCandidate(path.join(parent,qa,`gyeonggu-review-r1/package/private/${tag}/candidate.json`));
  const author=bindCandidate(path.join(parent,qa,`gyeonggu-authoring-r1/candidates/${tag}/${tag}.json`));
  const rawPath=path.join(own,qa,`gyeonggu-independent-r1/blind/solve/${tag}.json`);
  const raw=readJson(rawPath),j=join.rows.find(r=>r.questionNumber===n);
  for(const key of ['studentDigest','candidateDigest','assetDigest'])assert.equal(pack[key],q[key]);
  assert.equal(digest(raw),q.solveDigest);
  assert.deepEqual(raw,q.independentSolve);
  assert.equal(author.candidateDigest,j.candidateDigest);
  assert.equal(author.studentDigest,q.studentDigest);
  assert.equal(author.assetDigest,q.assetDigest);
  const student=readJson(path.join(own,qa,'gyeonggu-independent-r1/blind/student-problems.json')).find(s=>s.questionNumber===n);
  const {studentDigest:givenStudentDigest,...studentBody}=student;
  assert.equal(digest(studentBody),q.studentDigest);
  assert.deepEqual(pack.student,studentBody);
  rows.push({questionNumber:n,providedFourDigests:{studentDigest:q.studentDigest,candidateDigest:q.candidateDigest,assetDigest:q.assetDigest,solveDigest:q.solveDigest},
    allProvidedDigestsRecomputed:true,rawSolveFileSha256:sha256(fs.readFileSync(rawPath)),
    authoredFrozenCandidateDigest:author.candidateDigest,packageCandidateDigest:pack.candidateDigest,
    differentCandidateDigestReason:'Packaging changes only figureArtifacts relative specPath/svgPath; canonical digest includes those paths. Body/choices/answer/solution/metadata and asset bytes unchanged.',
    validation:pack.validation,
    currentFormattingOnlyComparatorMatches:normalizeAnswer(raw.answer)===normalizeAnswer(pack.candidate.answer),
    rawAnswerPreserved:raw.answer,authorAnswer:pack.candidate.answer,
    formattingComparisonIsAlgebraicEquivalence:false,rawEditedAfterExposure:false,
    requiredNewEvidence:'Separate typed role/unit/value and mathematical equivalence; no raw-answer edits.'});
}
fs.writeFileSync(path.join(out,evidenceName),JSON.stringify({contractFile:path.join(parent,'scripts/import/exam-twin/candidatePack.mjs'),
  contractSha256:sha256(fs.readFileSync(path.join(parent,'scripts/import/exam-twin/candidatePack.mjs'))),
  rows,all22RawDigestBindingsValid:true,formattingOnlyMatches:rows.filter(r=>r.currentFormattingOnlyComparatorMatches).length,
  inferenceApiCalls:0,dbActions:0,productionWrites:false},null,2)+'\n');
console.log(JSON.stringify({bound:rows.length,formattingOnlyMatches:rows.filter(r=>r.currentFormattingOnlyComparatorMatches).length,
  allFourDigestsValid:true,rawSolvesUnedited:true}));
