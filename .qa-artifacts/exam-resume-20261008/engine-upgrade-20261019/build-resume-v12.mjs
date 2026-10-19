import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bindCandidate, digest, readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const ev = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
const write = (path, value) => fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const priorPath = base + 'current-authored-batches-v11.json';
const index = readJson(priorPath);
const oldRows = index.groups.flatMap((g) => g.candidates);
assert.equal(oldRows.length, 106);
for (const row of oldRows) {
  const b = bindCandidate(row.candidate.path);
  assert.equal(b.candidateFileSha256, row.candidate.sha256);
  for (const key of ['studentDigest', 'assetDigest', 'candidateDigest']) assert.equal(b[key], row[key]);
}
const nbPath = base + 'nobyeon-authoring-r1/candidate-index-draft.json';
const nb = readJson(nbPath);
const ids = new Set(oldRows.map((row) => row.twinExternalId));
const added = nb.rows.map((row) => {
  const b = bindCandidate(row.candidate);
  assert(!ids.has(b.candidate.twinExternalId)); ids.add(b.candidate.twinExternalId);
  return {
    questionNumber: b.candidate.questionNumber, twinExternalId: b.candidate.twinExternalId, authorId: b.candidate.authorId,
    candidate: ev(row.candidate), studentDigest: b.studentDigest, assetDigest: b.assetDigest, candidateDigest: b.candidateDigest,
    metadataDigest: digest(b.candidate.metadata), sourceReferenceDigest: digest(b.candidate.sourceReference),
    score: b.candidate.score, questionType: b.candidate.questionType, figureInstances: b.assets.length,
    searchMetadata: b.candidate.metadata, variantDelta: b.candidate.variantDelta,
    independentReviewStatus: 'fresh blind solve dispatched; no new approval inferred',
  };
});
assert.equal(added.length, 5);
const createdAt = new Date().toISOString();
const counts = { ...index.counts,
  authoredCurrentCandidates: 111,
  currentFigureInstances: index.counts.currentFigureInstances + added.reduce((n,r) => n + r.figureInstances, 0),
  awaitingCollectedIndependentReview: 20, awaitingFirstSealedBlindSolve: 5,
};
assert.equal(counts.currentFigureInstances, 88);
const nextIndex = { ...index, kind:'current-authored-multiple-exam-index/v6', version:12, createdAt,
  previous:ev(priorPath), groups:[...index.groups,{exam:'Nobyeon-first5',index:ev(nbPath),authored:5,
    pointTotal:added.reduce((n,r)=>n+r.score,0),figureInstances:4,candidates:added}],counts,
  currentIdsDigest:digest([...ids].sort()), currentIdsDigestMethod:'lexically sorted exact current IDs',
  noPreviousSelectionOverridden:true,
  legacyNobyeonRawFiles:'Five ignored Claude raw solves are preserved; their independence/sealing/final-review provenance is not established by this snapshot and they are not counted as approvals.',
  note:'Original106 candidate/student/asset hashes revalidated; NB5 actual authored files added. New native asset previews are not new questions/figures or independent approvals.',
};
const indexPath=base+'current-authored-batches-v12.json';write(indexPath,nextIndex);
const ledger={kind:'execution-status-ledger/v12',version:12,createdAt,
  previousLedger:ev(base+'status-ledger-v11.json'),counts,currentIndex:ev(indexPath),
  countsBasis:'106 exact prior author bindings revalidated + 5 previously authored NB5; prior formal91 math/grade15 content-pass76 content-held unchanged. No raw solve counted as final review.',
  engine:ev(base+'engine-upgrades-progress-r4.json'),
  sourceReconnection:ev(base+'source-reconnection-20261019/run-receipt-r1.json'),
  freshExtraction:{evidence:ev(base+'fresh-source-extraction-20261019-r1/aggregate-receipt.json'),newParentObservations:61,totalParentObservations:314,componentsApproved:0,newTwins:0,wholePairsCertified:0},
  latestClosure:ev(base+'engine-upgrade-20261019/past-exam-closure-current.json'),
  unusedWorktreeCleanup:ev(base+'engine-upgrade-20261019/unused-worktree-cleanup.json'),
  original82AndPermanentExclusionPreserved:true,dbWrites:0,loadable:0,wholeGoalComplete:false,
  automaticContinuationControllerChanged:false,execution:'manual user-requested resume; one root and one independent Codex worker',
  independentNB5:{blind:ev(base+'nobyeon-review-r1/blind/blind-manifest.json'),status:'fresh solve dispatched; seal before author exposure',newMathOrGradeApprovals:0},
};
const ledgerPath=base+'status-ledger-v12.json';write(ledgerPath,ledger);
write(base+'continuation-index-v12.json',{kind:'exam-continuation-index/v12',version:12,createdAt,
  previousIndex:ev(base+'continuation-index-v11.json'),statusLedger:ev(ledgerPath),currentCandidateIndex:ev(indexPath),
  progressReport:'docs/planning/tracks/reports/exam-engine-native-upgrade-20261019.md',counts,
  sourceAccess:{nDriveAvailable:true,latestRead:ledger.sourceReconnection,allSourcesExtracted:false},
  freshExtraction:ledger.freshExtraction,engine:ledger.engine,latestClosure:ledger.latestClosure,cleanup:ledger.unusedWorktreeCleanup,
  sourceQueue:'Preserved initial continuation-index.json and original20261003 inventory; newly successful fresh aggregate receipts exclude repeat extraction jobs.',
  nextActions:['Seal fresh NB5 blind solves before author exposure, then math/seven-surface/content/family review','Continue per-item HWP/PDF correspondence of new61; isolate DGI identity and q3/q4 choice/figure/score holds','Review remaining28+ engine gaps against integrated latestmain and implement useful scoped upgrades','Fetch main+feature and validate before each fast-forward checkpoint push'],
  restrictions:['No DB apply/delete/reload/unlock/deploy','Protected82, three correction ledgers and permanent exclusion unchanged','N/originals/old proof bytes/shared dependencies preserved','Rights/similarity/source identity and curriculum never auto-approved','No active or unpreserved worktree cleanup'],
  wholeGoalComplete:false,
});
console.log(JSON.stringify({authored:counts.authoredCurrentCandidates,figures:counts.currentFigureInstances,math:counts.independentMathReviewed,grade:counts.independentFullGradeReviewed,contentPassed:counts.contentReviewPassed,awaitingReview:counts.awaitingCollectedIndependentReview,loadable:0,dbWrites:0}));
