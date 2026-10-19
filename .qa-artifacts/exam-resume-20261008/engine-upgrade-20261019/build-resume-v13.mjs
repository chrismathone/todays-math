import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bindCandidate, readJson, digest, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
import { summarizeReviewedBatch } from '../../../scripts/import/exam-twin/summarize-reviewed-batch.mjs';

const base = '.qa-artifacts/exam-resume-20261008/';
const root = base + 'nobyeon-final-review-20261019-r2/';
const engine = base + 'engine-upgrade-20261019/';
const ev = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
const write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
const old = readJson(base + 'current-authored-batches-v12.json');
const nb = old.groups.find((g) => g.exam === 'Nobyeon-first5');
const selectionPath = root + 'current-selection.json';
write(selectionPath, { questions: nb.candidates.map((c) => ({ n: c.questionNumber, id: c.twinExternalId, candidate: c.candidate.path, sha256: c.candidate.sha256 })) });
const reviewed = summarizeReviewedBatch(selectionPath, [root]);
assert.equal(reviewed.counts.mathematicalVerified, 5);
assert.equal(reviewed.counts.gradeReviewed, 5);
assert.equal(reviewed.counts.contentReviewHeld, 5);
const summaryPath = root + 'current-author-summary-parent-r1.json';
write(summaryPath, reviewed);
for (const group of old.groups) for (const c of group.candidates) {
  const b = bindCandidate(c.candidate.path);
  assert.equal(b.candidateFileSha256, c.candidate.sha256);
  for (const key of ['studentDigest', 'assetDigest', 'candidateDigest']) assert.equal(b[key], c[key]);
  if (group.exam === 'Nobyeon-first5') {
    const r = reviewed.questions.find((q) => q.twinExternalId === c.twinExternalId);
    assert(r && r.authorCandidateDigest === c.candidateDigest);
    c.independentReviewStatus = 'math and seven-surface grade reviewed; content/classification pending; not loadable';
    c.independentReview = { summary: ev(summaryPath), report: r.reportFile, solve: r.independentSolveFile,
      frozenCandidateDigest: r.candidateDigest, studentDigest: r.studentDigest, assetDigest: r.assetDigest,
      solveDigest: r.solveDigest, mathematicalVerified: r.mathematicalVerified, gradeReviewed: r.gradeReviewed,
      reasons: r.reasons, overallVerified: false, loadable: false };
  }
}
const counts = { ...old.counts,
  preExposureRawSolvesBoundToCurrentCandidates: 111, preExposureRawSolvesIncludingSupersededR1: 112,
  independentMathReviewed: 96, independentFullGradeReviewed: 96,
  contentReviewPassed: 15, contentReviewHeld: 81,
  awaitingCollectedIndependentReview: 15, currentRawSolved: 110, currentRawPending: 1,
  awaitingFirstSealedBlindSolve: 0 };
const createdAt = new Date().toISOString();
const native = readJson(base + 'engine-upgrades-progress-r4.json');
const r5 = { ...native, kind: 'exam-engine-upgrades-progress/v5', version: 5, createdAt,
  previous: ev(base + 'engine-upgrades-progress-r4.json'),
  code: [...native.code.map((x) => ev(x.path)), ev('scripts/db/problem-actual-format.ts'), ev('scripts/qa/capture-exam-family-snapshot.mjs')],
  delta: 'Sealed choice+value answers are checked against the real selected option with exact scalar and explicit dimension conversion; no raw proof edits. OS-independent classifier version path fixed without release hash/backfill changes.',
  validations: { ...native.validations, vitest: { files: 29, passed: 423, evidence: ev(engine + 'vitest-integration-r1.json') },
    nodePassed: 42, nodeDelta: 'One marked-answer regression with wrong value, wrong choice, unit/domain and malformed-expression controls',
    collectedNB5: ev(root + 'collected-parent-r1.json') },
  liveClassification: ev(engine + 'live-family-snapshot-r1.json'),
  candidateReviewCountsRecomputed: true, currentCounts: counts,
  workerOwnership: 'Root engine/metadata writer and one reused source worker. Two unused algebra/geometry checkouts archived and removed; branches preserved.',
  cleanup: ev(engine + 'unused-worktree-cleanup.json'), wholeEngineComplete: false,
};
const enginePath = base + 'engine-upgrades-progress-r5.json'; write(enginePath, r5);
const currentPath = base + 'current-authored-batches-v13.json';
write(currentPath, { ...old, version: 13, createdAt, previous: ev(base + 'current-authored-batches-v12.json'), counts,
  latestIndependentNB5: ev(summaryPath), liveClassification: r5.liveClassification,
  note: 'All111 current author/student/asset/candidate hashes revalidated; fresh raw commit c51c84ce5 precedes stage2 7bd67c0d0. Legacy raw5 not reused. No candidate bytes or assignments changed.' });
const ledgerPath = base + 'status-ledger-v13.json';
const previous = readJson(base + 'status-ledger-v12.json');
write(ledgerPath, { ...previous, kind: 'execution-status-ledger/v13', version: 13, createdAt,
  previousLedger: ev(base + 'status-ledger-v12.json'), counts, currentIndex: ev(currentPath),
  engine: ev(enginePath), countsBasis: '111 exact current candidates retained. Fresh NB5 independently solved and then reviewed against author/current assets. Formal math/grade +5; content held+5; full/loadable0.',
  independentNB5: { rawCommit: 'c51c84ce57debd1287f5a1d7708f0c4d709ba01b', reviewCommit: '7bd67c0d0a710a394c4a5314207af73bc49a36f5', seal: ev(root + 'pre-exposure-seal-receipt-r2.json'), summary: ev(summaryPath), newMathReviewed: 5, newGradeReviewed: 5, contentHeld: 5 },
  liveClassification: r5.liveClassification, wholeGoalComplete: false });
const prevContinuation = readJson(base + 'continuation-index-v12.json');
write(base + 'continuation-index-v13.json', { ...prevContinuation, kind: 'exam-continuation-index/v13', version: 13, createdAt,
  previousIndex: ev(base + 'continuation-index-v12.json'), statusLedger: ev(ledgerPath), currentCandidateIndex: ev(currentPath),
  progressReport: 'docs/planning/tracks/reports/exam-twin-checkpoint-v13-20261019.md', counts, engine: ev(enginePath),
  nextActions: ['Collect current fresh semester1 source extraction by the single existing worker; preserve local question-only bytes and explicit identity holds', 'Resolve remaining15 final independent reviews and current-family semantic mappings; do not infer from titles/counts', 'Continue useful engine upgrades against latest main; preserve rights/grade/source/native gates', 'Fetch main+feature, integrate and validate before fast-forward feature checkpoint pushes'], wholeGoalComplete: false });
console.log(JSON.stringify({ counts, currentIdsDigest: digest(old.groups.flatMap((g) => g.candidates.map((c) => c.twinExternalId)).sort()), nativeEngineComplete: false }));
