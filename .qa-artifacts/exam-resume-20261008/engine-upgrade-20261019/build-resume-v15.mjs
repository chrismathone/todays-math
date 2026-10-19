import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bindCandidate, digest, readJson, sha256, assertRawSolveReadable } from '../../../scripts/import/exam-twin/candidatePack.mjs';
import { summarizeReviewedBatch } from '../../../scripts/import/exam-twin/summarize-reviewed-batch.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const engine = base + 'engine-upgrade-20261019/';
const ev = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
const write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
const createdAt = new Date().toISOString();
const old = readJson(base + 'current-authored-batches-v14.json');
const reviewScopes = [
  { group: 'Gyeongsang-remaining', exclude: [18], root: base + 'gyeongsang-final-review-20261019-r3/', count: 14 },
  { group: 'Gangbuk-first', exclude: [], root: base + 'gangbuk-final-review-20261019-r2/', count: 1 },
];
const summaries = [];
for (const scope of reviewScopes) {
  const rows = old.groups.find((g) => g.exam === scope.group).candidates.filter((c) => !scope.exclude.includes(c.questionNumber));
  const selection = scope.root + 'current-selection-parent.json';
  write(selection, { questions: rows.map((c) => ({ n: c.questionNumber, id: c.twinExternalId, candidate: c.candidate.path, sha256: c.candidate.sha256 })) });
  const summary = summarizeReviewedBatch(selection, [scope.root]);
  assert.equal(summary.counts.mathematicalVerified, scope.count);
  assert.equal(summary.counts.gradeReviewed, scope.count);
  assert.equal(summary.counts.contentReviewHeld, scope.count);
  const file = scope.root + 'current-author-summary-parent.json'; write(file, summary);
  summaries.push(ev(file));
  for (const c of rows) {
    const r = summary.questions.find((q) => q.twinExternalId === c.twinExternalId);
    assert.equal(r.authorCandidateDigest, c.candidateDigest);
    c.independentReview = { summary: ev(file), report: r.reportFile, solve: r.independentSolveFile,
      frozenCandidateDigest: r.candidateDigest, solveDigest: r.solveDigest, studentDigest: r.studentDigest, assetDigest: r.assetDigest,
      mathematicalVerified: r.mathematicalVerified, gradeReviewed: r.gradeReviewed, reasons: r.reasons,
      overallVerified: false, loadable: false };
    c.independentReviewStatus = 'Current independent math and full7-surface grade reviewed; classification/source/rights/native pending';
  }
}
const all = old.groups.flatMap((g) => g.candidates);
assert.equal(all.length, 112);
for (const c of all) {
  const b = bindCandidate(c.candidate.path);
  assert.equal(b.candidateFileSha256, c.candidate.sha256);
  for (const k of ['studentDigest', 'assetDigest', 'candidateDigest']) assert.equal(b[k], c[k]);
}
const pending18 = readJson(base + 'gyeongsang-remaining-review-r1/blind/solve/q18.json');
const q18 = all.find((c) => c.twinExternalId === 'exam-twin-gyeongsang-2025-2-mid-author-source-r1-q18');
assert.equal(pending18.status, 'pending'); assert.equal(pending18.studentDigest, q18.studentDigest);
const clean = readJson(base + 'gangbuk-independent-20261019-r2/solve/q01.json');
assertRawSolveReadable(clean, all.find((c) => c.twinExternalId === 'exam-twin-gangbuk-2025-1-mid-author-r1-q01').questionType);
const counts = { ...old.counts, independentMathReviewed: 111, independentFullGradeReviewed: 111,
  contentReviewPassed: 15, contentReviewHeld: 96, awaitingCollectedIndependentReview: 1,
  preExposureRawSolvesBoundToCurrentCandidates: 112, currentRawSolved: 111, currentRawPending: 1,
  awaitingFirstSealedBlindSolve: 0, historicalRawEncodingHoldVersions: 1 };
delete counts.preExposureRawSolvesIncludingSupersededR1;
const sources = [1,2,3,4].map((n) => ev(base + `fresh-source-extraction-20261019-r${n}/aggregate-receipt.json`));
let total = 253;
const sourceIds = new Set();
for (const source of sources) {
  const s = readJson(source.path); assert.equal(s.previousParentObservations, total);
  for (const e of s.entries.filter((e) => e.status === 'parsed-quarantined')) { assert(!sourceIds.has(e.examId)); sourceIds.add(e.examId); }
  total += s.actualNewParents;
  for (const p of s.preservation) assert.equal(p.beforeSha256, p.afterSha256);
}
assert.equal(total, 506);
const freshExtraction = { evidence: sources, oldParentObservations: 253, newFreshParentObservations: 253,
  totalParentObservations: total, newFreshExams: sourceIds.size, freshComponentsApproved: 0, wholePairsCertified: 0,
  countScope: 'Parser parent observations, not unique certified exams or verified twins' };
const previousEngine = readJson(base + 'engine-upgrades-progress-r6.json');
const addedCode = ['scripts/import/exam-twin/answerPresentation.mjs','scripts/import/exam-twin/constantAnswers.mjs','scripts/import/exam-twin/candidatePack.mjs','scripts/import/exam-twin/review-exam-twins.mjs','scripts/import/exam-twin/prepare-sealed-review.mjs'];
const codePaths = [...new Set([...previousEngine.code.map((c) => c.path), ...addedCode])];
const enginePath = base + 'engine-upgrades-progress-r7.json';
write(enginePath, { ...previousEngine, kind: 'exam-engine-upgrades-progress/v7', version: 7, createdAt,
  previous: ev(base + 'engine-upgrades-progress-r6.json'), code: codePaths.map((p) => ({ ...ev(p), normalizedLfSourceSha256: sha256(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n')) })),
  answerReport: ev('docs/planning/tracks/reports/exam-engine-answer-presentation-20261019.md'),
  items: previousEngine.items.map((item) => item.id === 'U29' ? { ...item, productionStatus: 'partially-implemented-offline-review-support', change: 'Bounded exact choice/numbered-role/unit/x-coefficient comparison without raw edits. Unsupported forms held. No grade or geometry proof from presentation.' } : item),
  newOfflineSupports: ['Git commit/current/blind proof byte binding before answer-exposing output','Readable MC mark and damaged-character checks in exposure and collection paths','Failed encoded raw preserved; fresh unexposed actor solved same student version in reused checkout'],
  validations: { ...previousEngine.validations, nodePassed: 51, pythonRegionTests: 4,
    priorCurrent110ReadabilityAndBytes: ev(engine + 'current-readable-proof-audit-r1.json'),
    actualEncodingCounterexample: ev(engine + 'encoding-recovery-guard-r1.json'),
    cleanGangbukGitBoundExposure: ev(base + 'gangbuk-final-review-20261019-r2/verification/sealed-raw-commit.json'),
    latestCollectedReviews: summaries },
  currentCounts: counts, freshExtraction, wholeEngineComplete: false, operationalLoads: 0, dbWrites: 0 });
const indexPath = base + 'current-authored-batches-v15.json';
write(indexPath, { ...old, version: 15, createdAt, previous: ev(base + 'current-authored-batches-v14.json'), counts,
  latestIndependentSummaries: summaries, note: 'All112 current authored bindings revalidated. Fresh GF14 and clean Gangbuk r2 reports selected. Earlier damaged Gangbuk raw/review preserved and excluded; q18 grade/complexity hold remains.' });
const ledgerPath = base + 'status-ledger-v15.json';
write(ledgerPath, { ...readJson(base + 'status-ledger-v14.json'), kind: 'execution-status-ledger/v15', version: 15, createdAt,
  previousLedger: ev(base + 'status-ledger-v14.json'), currentIndex: ev(indexPath), counts, engine: ev(enginePath), freshExtraction,
  countsBasis: 'Current112 exact IDs;111 formal independent math/grade, q18 pending. Failed/superseded/repeated proof versions are preserved without inflating current counts. Legacy including-superseded aggregate intentionally omitted.',
  latestIndependentReviews: summaries, encodingRecovery: ev(engine + 'encoding-recovery-guard-r1.json'), wholeGoalComplete: false });
write(base + 'continuation-index-v15.json', { ...readJson(base + 'continuation-index-v14.json'), kind: 'exam-continuation-index/v15', version: 15, createdAt,
  previousIndex: ev(base + 'continuation-index-v14.json'), statusLedger: ev(ledgerPath), currentCandidateIndex: ev(indexPath), counts,
  engine: ev(enginePath), freshExtraction, progressReport: 'docs/planning/tracks/reports/exam-twin-checkpoint-v15-20261019.md',
  nextActions: ['Keep q18 curricular/complexity hold; resolve current-family semantic and source/right/similarity/native gates separately', 'Continue unparsed2025+ original sources and actual component/region/identity correspondence', 'Audit remaining engine gaps against latestmain, implement useful deterministic constraints/templates/metadata/rendering/reproducibility support', 'Use new pre-exposure Git/readability gate for every fresh solve; fetch+integrate+validate before feature pushes'], wholeGoalComplete: false });
console.log(JSON.stringify({ counts, parentObservations: total, freshExams: sourceIds.size, newSummaries: summaries.length }));
