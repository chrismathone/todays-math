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
const sourceReceipts = [1,2,3,4,5,6,7].map((n) => ev(base + `fresh-source-extraction-20261019-r${n}/aggregate-receipt.json`));
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
  latestReviewerObservation: ev(base + 'fresh-source-extraction-20261019-r6/reviewer-observations-r1.json'),
  latestAttempt: ev(base + 'fresh-source-extraction-20261019-r7/aggregate-receipt.json'),
  latestAttemptResult: 'N unavailable in current process; three individual file-access holds, new extraction0. Local evidence/code/review work continues.' };
const scopes = [
  { candidate: base + 'gyeongsin-authoring-r2/q01.json', root: base + 'gyeongsin-review-20261019-r2' },
  { candidate: base + 'gyeongsin-authoring-group2-r1/q02.json', root: base + 'gyeongsin-group2-review-20261019-r1' },
  { candidate: base + 'gyeongsin-authoring-group3-r4/q04.json', root: base + 'gyeongsin-group3-review-20261019-r5' },
];
const candidates = [], summaries = [];
let newMath = 0, newGrade = 0, newContentPass = 0, newHeld = 0, newCollected = 0;
for (const scope of scopes) {
  const b = bindCandidate(scope.candidate), c = b.candidate;
  const selection = scope.root + '/current-selection-parent-r2.json';
  write(selection, { questions: [{ n: c.questionNumber, id: c.twinExternalId, candidate: scope.candidate, sha256: b.candidateFileSha256 }] });
  const summary = summarizeReviewedBatch(selection, [scope.root]);
  assert.equal(summary.counts.authored, 1);
  assert.equal(summary.counts.independentSolvesBound, 1);
  const summaryFile = scope.root + '/current-author-summary-parent-r2.json'; write(summaryFile, summary);
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
const groupIndex = base + 'gyeongsin-current-selection-v2.json';
write(groupIndex, { questions: candidates.map((c) => ({ n: c.questionNumber, id: c.twinExternalId, candidate: c.candidate.path, sha256: c.candidate.sha256 })) });
const indexFile = base + 'current-authored-batches-v17.json';
write(indexFile, { ...old, version: 17, createdAt, previous: ev(base + 'current-authored-batches-v16.json'),
  groups: [...old.groups, { exam: 'Gyeongsin-first', index: ev(groupIndex), authored: candidates.length,
    pointTotal: candidates.reduce((sum, c) => sum + c.score, 0), figureInstances: figures, candidates }], counts,
  currentIdsDigest: digest(all.map((c) => c.twinExternalId).sort()), latestIndependentSummaries: summaries,
  note: 'Prior112 current author files/digests revalidated. Three new Gyeongsin inverse-target twins selected by actual current IDs/hashes. q01 selected r2; q04 selected r4. Earlier drafts/failed collectors preserved, never counted as extra items/reviews. q18 and all remaining gates stay held.' });
const transportRows = all.map((c) => {
  const b = bindCandidate(c.candidate.path);
  assert.equal(b.candidateFileSha256, c.candidate.sha256);
  for (const k of ['studentDigest','assetDigest','candidateDigest']) assert.equal(b[k], c[k]);
  return { id: c.twinExternalId, candidate: c.candidate, studentDigest: b.studentDigest, assetDigest: b.assetDigest, candidateDigest: b.candidateDigest, figureInstances: b.candidate.figureArtifacts.length };
});
write(engine + 'current115-figure-readability-r2.json', { createdAt, code: ev('scripts/import/exam-twin/candidatePack.mjs'), questions: transportRows, candidateCount: transportRows.length, figureInstances: transportRows.reduce((n,r)=>n+r.figureInstances,0), newSemanticApprovals:0, loadable:0 });
const oldEngine = readJson(base + 'engine-upgrades-progress-r7.json');
const integratedStudyCode = fs.readdirSync('src/lib/examStudy', { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.ts')).map((e) => (e.parentPath + '/' + e.name).replaceAll('\\','/'));
const codePaths = [...new Set([...oldEngine.code.map((c) => c.path), 'scripts/import/exam-twin/rebind-identical-review.mjs', 'scripts/import/exam-twin/summarize-reviewed-batch.mjs',
  'src/contracts/examStudy.contract.ts', 'src/lib/examStudyRoutes.ts', ...integratedStudyCode])];
const engineFile = base + 'engine-upgrades-progress-r9.json';
write(engineFile, { ...oldEngine, kind: 'exam-engine-upgrades-progress/v9', version: 9, createdAt,
  previous: ev(base + 'engine-upgrades-progress-r8.json'), code: codePaths.map((p) => ({ ...ev(p), normalizedLfSourceSha256: sha256(fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n')) })),
  newAuthoredProblems: candidates.length, newImagegenRasters: 0, currentCounts: counts, freshExtraction,
  checkpointDelta: 'Three inverse target manual examples, identical-payload lineage rebinding, figure transport readability, bounded numbered-length punctuation and finite classification-count choices. Preserve/reuse latest main23 authored study families; no duplicate template implementation or release.',
  integratedMainEngine: { commit: '261a5e263e4e104949d7a21673c9c9ad5850a380', authoredFamilies: 23, reviewedProfiles: 5,
    requirementIds: 50, remainingUniqueDemands: 12, remainingSchoolCourseDemands: 13,
    evidence: ev('docs/reports/math-exam-engine-upgrade-20261018/README.md'),
    remainingAudit: ev('docs/reports/math-exam-engine-remaining-20261019/README.md'),
    allStudentSurfaceCurriculumCertified: false, wholeSchoolOrCorpusCoverage: false },
  newOfflineSupports: [...oldEngine.newOfflineSupports, 'Rebind nested freeze provenance to current author files only when entire private candidate/assets/Git proof/report bytes match; all holds retained', 'Parse actual figure-spec bytes as a JSON object; fatal SVG UTF-8 and unreadable-control checks, without byte repair or semantic approval'],
  items: [...oldEngine.items, { id: 'U31', area: 'Identical-payload review lineage preservation', productionStatus: 'implemented-offline-bounded-support',
    change: 'Strict CLI/API;17 regressions;actual14-item demonstrations. Changed metadata/answers/solutions/assets require NEW review; no writer/release bypass.' },
    { id: 'U32', area: 'Figure/spec artifact readability', productionStatus: 'implemented-offline-bounded-support', change: 'NUL/nonobject/invalid-UTF8/unreadable-XML-character inputs reject before binding. Valid Korean/BOM/CRLF keep raw hashes. No XML/geometry/curriculum approval from transport checks.' },
    { id: 'U33', area: 'Shared exam-study engine integration', productionStatus: 'implemented-on-feature-reused-main', change: 'Preserve main23 authored families, strict demand planning/identity/verification/figures/API/output;785 latest regression passes,6 conditional skips. Twelve unique reviewed demands still incomplete; no universal curriculum certification.' },
    { id: 'U34', area: 'Finite count distractor domain', productionStatus: 'implemented-bounded-production-code', change: 'Read only complete printed classification collections in two exact question forms; all choices0..N integer and distinct, bad authored choices or too-small domain reject.64 actual generator samples. No full-requirement promotion.' },
    { id: 'U35', area: 'Numbered scalar length answer presentation', productionStatus: 'implemented-offline-bounded-support', change: 'Ordered scalar lengths/cm/m/decimal exact values; one interpart comma or semicolon does not erase roles/units/parts. Extra prose/terms/dimensions/ambiguous comma reject; sealed raw unchanged. Actual current q04 recollected in a new container/report.' }, { id: 'U36', area: 'Content/classification aggregate gate', productionStatus: 'implemented-offline-bounded-support', change: 'A verified report label alone cannot override failed unitFamilyFit or other required dimensions. Keep math/grade separate; retain v16 overcount and derive corrected new v17 from unchanged current reports.' }],
  validations: { ...oldEngine.validations, nodePassed: 119, pythonRegionTests: 4,
    vitest: { files: 53, passed: 785, skipped: 6, failed: 0, evidence: ev(engine + 'integration-checkpoint-r3.json') },
    numberedLengthGrammar: ev(engine + 'answer-comma-validation-r1.json'),
    contentGateRegression: ev(engine + 'content-gate-regressions-r1.tap'),
    countDomainRegressions: ev(engine + 'count-choice-regressions-r1.json'),
    rebindIntegration: ev(engine + 'rebind-integration-r1.json'),
    rebindDemo: ev(base + 'rebind-identical-review-demo-20261019-r1/demo-report.json'), latestCollectedReviews: summaries,
    latestMainIntegration: ev(engine + 'integration-checkpoint-r3.json'), restartTextAudit: ev(engine + 'recovery-r1/text-audit.json'),
    actualCurrentFigureTransport: ev(engine + 'current115-figure-readability-r2.json'),
    figureTransportTests: ev(engine + 'figure-readability-tests-r1.tap'), liveDesignGuide: ev(engine + 'typesafe-live-guide-r2.json') },
  sourceComponentObservations: [1,2,4].map((n) => ev(base + `gyeongsin-source-component-review-20261019-r1/q${String(n).padStart(2,'0')}-component-review.json`)),
  sourceGradeMethodHold: ev(base + 'gyeongsin-source-component-review-20261019-r1/q03-method-hold-linked.json'),
  latestClosure: ev(engine + 'past-exam-closure-r2.json'),
  inverseTargetExamples: candidates.map((c) => ({ candidate: c.candidate, review: c.independentReview, generalizedProductionTemplateImplemented: false })),
  manualInverseTargetExample: { ...oldEngine.manualInverseTargetExample, independentApproval: false, independentMathAndGradeCollected: true, allDimensionApproval: false },
  wholeEngineComplete: false, wholeExtractionComplete: false, operationalLoads: 0, dbWrites: 0 });
const ledgerFile = base + 'status-ledger-v17.json';
write(ledgerFile, { ...readJson(base + 'status-ledger-v15.json'), kind: 'execution-status-ledger/v17', version: 17, createdAt,
  previousLedger: ev(base + 'status-ledger-v16.json'), currentIndex: ev(indexFile), counts, engine: ev(engineFile), freshExtraction,
  countsBasis: 'Exact current IDs/raw hashes/reports. Superseded drafts and repeated GF14 copies are never counted as new questions or reviews.',
  latestIndependentReviews: summaries, latestClosure: ev(engine + 'past-exam-closure-r2.json'), wholeGoalComplete: false });
write(base + 'continuation-index-v17.json', { ...readJson(base + 'continuation-index-v15.json'), kind: 'exam-continuation-index/v17', version: 17, createdAt,
  previousIndex: ev(base + 'continuation-index-v16.json'), statusLedger: ev(ledgerFile), currentCandidateIndex: ev(indexFile), counts,
  engine: ev(engineFile), freshExtraction, progressReport: 'docs/planning/tracks/reports/exam-twin-checkpoint-v17-20261019.md',
  nextActions: ['Continue2025+ component correspondence and substantive within-grade twins; never certify unreviewed source regions',
    'Resolve semantic family recommendations in new reviewed versions; preserve year/custody/rights/similarity/native holds',
    'Keep q18 curricular/complexity hold and source q03 no-confirmed-in-grade-method hold',
    'Reuse one Codex review checkout; preserve branches/evidence before unused-checkout removal',
    'Continue deterministic engine improvements; fetch/integrate/validate immediately before feature pushes'], wholeGoalComplete: false });
console.log(JSON.stringify({ counts, parentObservations: total, freshExams: sourceIds.size, selectedNewCandidates: candidates.length }));
