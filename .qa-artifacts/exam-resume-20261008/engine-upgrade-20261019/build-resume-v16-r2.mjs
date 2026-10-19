/** Rebuilt NEW script; preserve the interrupted all-NUL v16 draft separately. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bindCandidate, digest, readJson, sha256, assertRawSolveReadable } from '../../../scripts/import/exam-twin/candidatePack.mjs';
import { summarizeReviewedBatch } from '../../../scripts/import/exam-twin/summarize-reviewed-batch.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const engine = base + 'engine-upgrade-20261019/';
const ev = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
const write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' });
const createdAt = new Date().toISOString();
const old = readJson(base + 'current-authored-batches-v15.json');
const previousRows = old.groups.flatMap((g) => g.candidates);
assert.equal(previousRows.length, 112);
for (const c of previousRows) {
  const b = bindCandidate(c.candidate.path);
  assert.equal(b.candidateFileSha256, c.candidate.sha256);
  for (const k of ['studentDigest', 'assetDigest', 'candidateDigest']) assert.equal(b[k], c[k]);
}
const sourceReceipts = [1,2,3,4,5,6].map((n) => ev(base + `fresh-source-extraction-20261019-r${n}/aggregate-receipt.json`));
const sourceIds = new Set(); let total = 253;
for (const source of sourceReceipts) {
  const s = readJson(source.path);
  assert.equal(s.previousParentObservations, total);
  for (const row of s.entries.filter((e) => e.status === 'parsed-quarantined')) {
    assert(!sourceIds.has(row.examId)); sourceIds.add(row.examId);
  }
  total += s.actualNewParents;
  for (const p of s.preservation) assert.equal(p.beforeSha256, p.afterSha256);
}
assert.equal(total, 634);
const freshExtraction = { evidence: sourceReceipts, oldParentObservations: 253, newFreshParentObservations: total - 253,
  totalParentObservations: total, newFreshExams: sourceIds.size, freshComponentsApproved: 0, wholePairsCertified: 0,
  countScope: 'Parser parent observations, not unique content-certified exams or verified twins',
  latestReviewerObservation: ev(base + 'fresh-source-extraction-20261019-r6/reviewer-observations-r1.json') };
const scopes = [
  { candidate: base + 'gyeongsin-authoring-r2/q01.json', root: base + 'gyeongsin-review-20261019-r2' },
  { candidate: base + 'gyeongsin-authoring-group2-r1/q02.json', root: base + 'gyeongsin-group2-review-20261019-r1' },
  { candidate: base + 'gyeongsin-authoring-group3-r2/q04.json', root: base + 'gyeongsin-group3-review-20261019-r2' },
];
const candidates = [], summaries = [];
let newMath = 0, newGrade = 0, newContentPass = 0, newHeld = 0, newCollected = 0;
for (const scope of scopes) {
  const b = bindCandidate(scope.candidate), c = b.candidate;
  const selection = scope.root + '/current-selection-parent.json';
  write(selection, { questions: [{ n: c.questionNumber, id: c.twinExternalId, candidate: scope.candidate, sha256: b.candidateFileSha256 }] });
  const summary = summarizeReviewedBatch(selection, [scope.root]);
  assert.equal(summary.counts.authored, 1);
  assert.equal(summary.counts.independentSolvesBound, 1);
  const summaryFile = scope.root + '/current-author-summary-parent.json'; write(summaryFile, summary);
  summaries.push(ev(summaryFile));
  newMath += summary.counts.mathematicalVerified; newGrade += summary.counts.gradeReviewed;
  newContentPass += summary.counts.contentReviewPassed; newHeld += summary.counts.contentReviewHeld;
  const r = summary.questions[0];
  newCollected += Number(r.mathematicalVerified && r.gradeReviewed);
  const raw = readJson(r.independentSolveFile.path);
  assert.equal(raw.status, 'solved'); assert.equal(raw.studentDigest, b.studentDigest);
  assertRawSolveReadable(raw, c.questionType);
  candidates.push({ questionNumber: c.questionNumber, twinExternalId: c.twinExternalId, authorId: c.authorId,
    candidate: ev(scope.candidate), studentDigest: b.studentDigest, assetDigest: b.assetDigest, candidateDigest: b.candidateDigest,
    metadataDigest: digest(c.metadata), sourceReferenceDigest: digest(c.sourceReference), score: c.score, questionType: c.questionType,
    figureInstances: c.figureArtifacts.length, searchMetadata: c.metadata, variantDelta: c.variantDelta,
    independentReview: { summary: ev(summaryFile), report: r.reportFile, solve: r.independentSolveFile,
      frozenCandidateDigest: r.candidateDigest, solveDigest: r.solveDigest, studentDigest: r.studentDigest, assetDigest: r.assetDigest,
      mathematicalVerified: r.mathematicalVerified, gradeReviewed: r.gradeReviewed, reasons: r.reasons, overallVerified: false, loadable: false },
    independentReviewStatus: 'Current fresh proof and report collected; unresolved assignment/source/rights/native gates remain separate' });
}
const all = [...previousRows, ...candidates];
assert.equal(all.length, 115); assert.equal(new Set(all.map((c) => c.twinExternalId)).size, all.length);
const figures = candidates.reduce((sum, c) => sum + c.figureInstances, 0);
const counts = { ...old.counts, authoredCurrentCandidates: all.length,
  currentFigureInstances: old.counts.currentFigureInstances + figures,
  preExposureRawSolvesBoundToCurrentCandidates: old.counts.preExposureRawSolvesBoundToCurrentCandidates + candidates.length,
  currentRawSolved: old.counts.currentRawSolved + candidates.length,
  independentMathReviewed: old.counts.independentMathReviewed + newMath,
  independentFullGradeReviewed: old.counts.independentFullGradeReviewed + newGrade,
  contentReviewPassed: old.counts.contentReviewPassed + newContentPass,
  contentReviewHeld: old.counts.contentReviewHeld + newHeld,
  awaitingCollectedIndependentReview: old.counts.awaitingCollectedIndependentReview + candidates.length - newCollected,
  fullVerified: 0, loadable: 0, dbWrites: 0 };
const groupIndex = base + 'gyeongsin-current-selection-v1.json';
write(groupIndex, { questions: candidates.map((c) => ({ n: c.questionNumber, id: c.twinExternalId, candidate: c.candidate.path, sha256: c.candidate.sha256 })) });
const indexFile = base + 'current-authored-batches-v16.json';
write(indexFile, { ...old, version: 16, createdAt, previous: ev(base + 'current-authored-batches-v15.json'),
  groups: [...old.groups, { exam: 'Gyeongsin-first', index: ev(groupIndex), authored: candidates.length,
    pointTotal: candidates.reduce((sum, c) => sum + c.score, 0), figureInstances: figures, candidates }], counts,
  currentIdsDigest: digest(all.map((c) => c.twinExternalId).sort()), latestIndependentSummaries: summaries,
  note: 'Prior112 current author files/digests revalidated. Three new Gyeongsin inverse-target twins selected by actual current IDs/hashes. q01/q04 r1 drafts preserved and superseded by r2. q18 and all remaining gates stay held.' });
const oldEngine = readJson(base + 'engine-upgrades-progress-r7.json');
const codePaths = [...new Set([...oldEngine.code.map((c) => c.path), 'scripts/import/exam-twin/rebind-identical-review.mjs'])];
const engineFile = base + 'engine-upgrades-progress-r8.json';
write(engineFile, { ...oldEngine, kind: 'exam-engine-upgrades-progress/v8', version: 8, createdAt,
  previous: ev(base + 'engine-upgrades-progress-r7.json'), code: codePaths.map((p) => ({ ...ev(p), normalizedLfSourceSha256: sha256(fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n')) })),
  newAuthoredProblems: candidates.length, newImagegenRasters: 0, currentCounts: counts, freshExtraction,
  checkpointDelta: 'Three inverse target examples and strict byte-identical review-lineage rebinding. No new production template registration or release.',
  newOfflineSupports: [...oldEngine.newOfflineSupports, 'Rebind nested freeze provenance to current author files only when entire private candidate/assets/Git proof/report bytes match; all holds retained'],
  items: [...oldEngine.items, { id: 'U31', area: 'Identical-payload review lineage preservation', productionStatus: 'implemented-offline-bounded-support',
    change: 'Strict CLI/API;17 regressions;actual14-item demonstrations. Changed metadata/answers/solutions/assets require NEW review; no writer/release bypass.' }],
  validations: { ...oldEngine.validations, nodePassed: 68, pythonRegionTests: 4, rebindIntegration: ev(engine + 'rebind-integration-r1.json'),
    rebindDemo: ev(base + 'rebind-identical-review-demo-20261019-r1/demo-report.json'), latestCollectedReviews: summaries,
    latestMainIntegration: ev(engine + 'integration-checkpoint-r2.json'), restartTextAudit: ev(engine + 'recovery-r1/text-audit.json') },
  sourceComponentObservations: [1,2,4].map((n) => ev(base + `gyeongsin-source-component-review-20261019-r1/q${String(n).padStart(2,'0')}-component-review.json`)),
  sourceGradeMethodHold: ev(base + 'gyeongsin-source-component-review-20261019-r1/q03-method-hold-linked.json'),
  latestClosure: ev(engine + 'past-exam-closure-r2.json'),
  inverseTargetExamples: candidates.map((c) => ({ candidate: c.candidate, review: c.independentReview, generalizedProductionTemplateImplemented: false })),
  manualInverseTargetExample: { ...oldEngine.manualInverseTargetExample, independentApproval: false, independentMathAndGradeCollected: true, allDimensionApproval: false },
  wholeEngineComplete: false, wholeExtractionComplete: false, operationalLoads: 0, dbWrites: 0 });
const ledgerFile = base + 'status-ledger-v16.json';
write(ledgerFile, { ...readJson(base + 'status-ledger-v15.json'), kind: 'execution-status-ledger/v16', version: 16, createdAt,
  previousLedger: ev(base + 'status-ledger-v15.json'), currentIndex: ev(indexFile), counts, engine: ev(engineFile), freshExtraction,
  countsBasis: 'Exact current IDs/raw hashes/reports. Superseded drafts and repeated GF14 copies are never counted as new questions or reviews.',
  latestIndependentReviews: summaries, latestClosure: ev(engine + 'past-exam-closure-r2.json'), wholeGoalComplete: false });
write(base + 'continuation-index-v16.json', { ...readJson(base + 'continuation-index-v15.json'), kind: 'exam-continuation-index/v16', version: 16, createdAt,
  previousIndex: ev(base + 'continuation-index-v15.json'), statusLedger: ev(ledgerFile), currentCandidateIndex: ev(indexFile), counts,
  engine: ev(engineFile), freshExtraction, progressReport: 'docs/planning/tracks/reports/exam-twin-checkpoint-v16-20261019.md',
  nextActions: ['Continue2025+ component correspondence and substantive within-grade twins; never certify unreviewed source regions',
    'Resolve semantic family recommendations in new reviewed versions; preserve year/custody/rights/similarity/native holds',
    'Keep q18 curricular/complexity hold and source q03 no-confirmed-in-grade-method hold',
    'Reuse one Codex review checkout; preserve branches/evidence before unused-checkout removal',
    'Continue deterministic engine improvements; fetch/integrate/validate immediately before feature pushes'], wholeGoalComplete: false });
console.log(JSON.stringify({ counts, parentObservations: total, freshExams: sourceIds.size, selectedNewCandidates: candidates.length }));
