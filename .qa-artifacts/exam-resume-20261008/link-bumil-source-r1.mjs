/** Link verified original identity/content to immutable current twin evidence. No approval. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { bindCandidate, readJson, sha256 } from "../../scripts/import/exam-twin/candidatePack.mjs";
const root = ".qa-artifacts/exam-resume-20261008";
const firstPath = `${root}/bumil-authoring-r1/source-identity/source-review.json`;
const remainingPath = `${root}/bumil-source-audit-r2/source-review.json`;
const first = readJson(firstPath);
const remaining = readJson(remainingPath);
const current = readJson(`${root}/bumil-final-review-summary-r1.json`);
const fileRef = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
assert.equal(first.exam_id, remaining.exam_id);
assert.equal(remaining.observed_identity.year, 2025);
assert.equal(remaining.observed_identity.grade, 3);
const original = new Map(first.question_reviews.map((q) => [q.question_number, { ...q, question_type: q.partial_credit_printed ? "서술형" : q.choices?.length === 5 ? "객관식" : null, originalSourceReview: fileRef(firstPath) }]));
for (const q of remaining.question_reviews) {
  assert(!original.has(q.question_number), "Source review scopes overlap");
  assert.equal(q.status, "confirmed");
  assert.equal(q.source_identity_status, "confirmed");
  const normalizedPath = `${root}/bumil-source-audit-r2/${q.normalized_question_file}`;
  assert.equal(sha256(fs.readFileSync(normalizedPath)), q.normalized_question_sha256);
  original.set(q.question_number, { ...q, ...readJson(normalizedPath), originalSourceReview: fileRef(remainingPath), normalizedSource: fileRef(normalizedPath), fullSourceComparison: fileRef(`${root}/bumil-source-audit-r2/${q.evidence_file}`) });
}
assert.deepEqual([...original.keys()].sort((a, b) => a - b), Array.from({ length: 21 }, (_, i) => i + 1));
const questions = current.questions.map((q) => {
  const authored = bindCandidate(q.currentCandidate.path);
  assert.equal(authored.candidateFileSha256, q.currentCandidate.sha256);
  const c = authored.candidate;
  const source = original.get(q.n);
  assert.equal(c.sourceReference.examId, remaining.exam_id);
  assert.equal(c.sourceReference.externalId, `${remaining.exam_id}-${q.n}`);
  assert.equal(c.sourceReference.questionNumber, q.n);
  const scoreChanged = source.score !== c.score;
  const formatChanged = source.question_type !== c.questionType;
  return {
    n: q.n, twinExternalId: q.twinExternalId,
    candidate: q.currentCandidate, studentDigest: q.studentDigest,
    candidateDigest: q.candidateDigest, assetDigest: q.assetDigest,
    independentReport: q.reportFile,
    sourceExternalId: c.sourceReference.externalId,
    originalSourceReview: source.originalSourceReview,
    ...(source.normalizedSource ? { normalizedSource: source.normalizedSource, fullSourceComparison: source.fullSourceComparison } : {}),
    originalSourceIdentity: remaining.observed_identity,
    originalSourceScore: source.score, originalSourceQuestionType: source.question_type,
    newScore: c.score, newQuestionType: c.questionType,
    scoreChanged, formatChanged,
    declaredVariantDelta: c.variantDelta,
    methodClarification: [10, 19].includes(q.n) ? fileRef(`${root}/bumil-authoring-r2/variant-method-links-r2.json`) : null,
    sourceContentAndIdentity: "confirmed-in-bounded-original-question-comparison",
    sourceCustodyExportPublisherRights: "pending",
    differenceReview: scoreChanged || formatChanged ? "separate-original/new-score-format-review-required; previous-report-not-edited" : "unchanged-original/new-score-format",
    gateEffect: "Metadata join only. Frozen package gates remain historical; no mathematical/grade/report reuse for changed content, rights/native approval or writer",
    overallVerified: false, loadable: false,
  };
});
const result = {
  kind: "current-twin-original-source-join/v1", createdAt: new Date().toISOString(),
  sourceQuestionCount: original.size, currentTwinCount: questions.length,
  originalExamScore: [...original.values()].reduce((sum, q) => sum + q.score, 0),
  currentAuthoredScore: questions.reduce((sum, q) => sum + q.newScore, 0),
  scoreFormatChanged: questions.filter((q) => q.scoreChanged || q.formatChanged).map((q) => ({ n: q.n, scoreBefore: q.originalSourceScore, scoreAfter: q.newScore, formatBefore: q.originalSourceQuestionType, formatAfter: q.newQuestionType })),
  preservedSourceWithoutCandidate: { n: 7, sourceIdentityConfirmed: true, curriculumStatus: "preauthor-hold; independent adjudication underway", oldHoldEvidence: fileRef(`${root}/bumil-authoring-r1/CURRICULUM-HOLD-q07.md`) },
  noPaperScoreForcedTo100: true,
  questions,
  currentFrozenProof: fileRef(`${root}/bumil-final-review-summary-r1.json`),
  priorSourceVerificationsNeverApproveNewTwins: true,
  sourceQuestionScopeEntireSelectedPaper21: true,
  selectedFileEquivalenceNotGlobalNInventoryCertification: true,
  overallVerified: 0, loadable: 0, productionWrites: 0,
};
fs.writeFileSync(`${root}/bumil-source-twin-join-r1.json`, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ sourceQuestions: result.sourceQuestionCount, currentTwins: result.currentTwinCount, originalScore: result.originalExamScore, currentDraftScore: result.currentAuthoredScore, changed: result.scoreFormatChanged, finalOrLoadable: 0, writes: 0 }));
