import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bindCandidate, digest, readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const engine = base + 'engine-upgrade-20261019/';
const ev = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
const write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
const createdAt = new Date().toISOString();
const old = readJson(base + 'current-authored-batches-v13.json');
const rows = old.groups.flatMap((g) => g.candidates);
for (const c of rows) {
  const b = bindCandidate(c.candidate.path);
  assert.equal(b.candidateFileSha256, c.candidate.sha256);
  for (const k of ['studentDigest', 'assetDigest', 'candidateDigest']) assert.equal(b[k], c[k]);
}
const path = base + 'gangbuk-authoring-r1/q01.json';
const b = bindCandidate(path), c = b.candidate;
assert(!rows.some((r) => r.twinExternalId === c.twinExternalId));
const counts = { ...old.counts, authoredCurrentCandidates: 112,
  awaitingCollectedIndependentReview: 16, awaitingFirstSealedBlindSolve: 1 };
const source2 = ev(base + 'fresh-source-extraction-20261019-r2/aggregate-receipt.json');
const source3 = ev(base + 'fresh-source-extraction-20261019-r3/aggregate-receipt.json');
const s2 = readJson(source2.path), s3 = readJson(source3.path);
assert.equal(s2.previousParentObservations, 314); assert.equal(s2.actualNewParents, 68);
assert.equal(s3.previousParentObservations, 382); assert.equal(s3.actualNewParents, 61);
const freshExtraction = { evidence: [source2, source3], priorParentObservations: 314,
  newParentObservations: 129, totalParentObservations: 443, componentsApproved: 0,
  newTwinsApproved: 0, wholePairsCertified: 0 };
const priorEngine = readJson(base + 'engine-upgrades-progress-r5.json');
const enginePath = base + 'engine-upgrades-progress-r6.json';
write(enginePath, { ...priorEngine, kind: 'exam-engine-upgrades-progress/v6', version: 6, createdAt,
  previous: ev(base + 'engine-upgrades-progress-r5.json'),
  code: [...priorEngine.code.map((x) => ev(x.path)), ev('scripts/import/exam-twin/source_region_ownership.py'), ev('scripts/import/exam-twin/extract-fresh-sources-20261019.py')],
  sourceSupportDelta: 'Explicit same-page/column region overlap flags expose potential shared-context/misrouting. New extractor records affected question ownership per item. Existing regions are not repaired or approved automatically.',
  validations: { ...priorEngine.validations, pythonRegionTests: 4,
    capturedRegionAudit: ev(engine + 'source-region-audit-r1.json'), actualNewExtractorExecution: source3,
    authoredInverseTargetDryRun: ev(base + 'gangbuk-review-r1/package/manifest.json') },
  freshExtraction, currentCounts: counts,
  manualInverseTargetExample: { candidate: ev(path), authorCalculation: ev(base + 'gangbuk-authoring-r1/author-calculations.json'), visual: ev(base + 'gangbuk-authoring-r1/visual-review-r1.json'), independentApproval: false, generalizedProductionTemplateImplemented: false },
  wholeEngineComplete: false, operationalLoads: 0, dbWrites: 0 });
const newRow = { questionNumber: c.questionNumber, twinExternalId: c.twinExternalId, authorId: c.authorId,
  candidate: ev(path), studentDigest: b.studentDigest, assetDigest: b.assetDigest,
  candidateDigest: b.candidateDigest, metadataDigest: digest(c.metadata), sourceReferenceDigest: digest(c.sourceReference),
  score: c.score, questionType: c.questionType, figureInstances: 0, searchMetadata: c.metadata,
  variantDelta: c.variantDelta, independentReviewStatus: 'new author-only inverse target candidate; blind input prepared, all independent reviews pending' };
const indexPath = base + 'current-authored-batches-v14.json';
write(indexPath, { ...old, version: 14, createdAt, previous: ev(base + 'current-authored-batches-v13.json'),
  groups: [...old.groups, { exam: 'Gangbuk-first', index: ev(base + 'gangbuk-authoring-r1/candidate-index.json'), authored: 1, pointTotal: 3, figureInstances: 0, candidates: [newRow] }],
  counts, currentIdsDigest: digest([...rows.map((r) => r.twinExternalId), c.twinExternalId].sort()),
  note: 'Prior111 exact bindings revalidated. New Gangbuk inverse-input candidate+answer+solution authored, not independently approved. Existing source/raw/math/grade/rights holds preserved.' });
const previousLedger = readJson(base + 'status-ledger-v13.json');
const ledgerPath = base + 'status-ledger-v14.json';
write(ledgerPath, { ...previousLedger, kind: 'execution-status-ledger/v14', version: 14, createdAt,
  previousLedger: ev(base + 'status-ledger-v13.json'), currentIndex: ev(indexPath), counts,
  engine: ev(enginePath), freshExtraction,
  countsBasis: '112 current author candidates; formal96 math/grade unchanged. New1 awaits first blind solve; GF14 new verifier raw work in progress is not added as final review.',
  sourceOwnershipHolds: ev(engine + 'source-region-audit-r1.json'), wholeGoalComplete: false });
const previous = readJson(base + 'continuation-index-v13.json');
write(base + 'continuation-index-v14.json', { ...previous, kind: 'exam-continuation-index/v14', version: 14, createdAt,
  previousIndex: ev(base + 'continuation-index-v13.json'), statusLedger: ev(ledgerPath), currentCandidateIndex: ev(indexPath),
  counts, freshExtraction, engine: ev(enginePath), progressReport: 'docs/planning/tracks/reports/exam-twin-checkpoint-v14-20261019.md',
  nextActions: ['Seal fresh GF14 blind proofs and then perform current-author/grade/content review; q18 remains held', 'Independently solve and review new Gangbuk inverse-input candidate with no author-answer exposure', 'Continue remaining2025+ sources, isolating overlap/shared-context and source-identity holds', 'Continue useful native engine improvements, current-family semantic mapping and feature checkpoint pushes'], wholeGoalComplete: false });
console.log(JSON.stringify({ counts, parentObservations: 443, oldCandidatesRevalidated: rows.length, dbWrites: 0 }));
