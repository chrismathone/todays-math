/** Rebind current author selections and independent reports; offline ledger only. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {bindCandidate,digest,readJson,sha256} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const ev=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const createdAt=new Date().toISOString(),previous=readJson(base+'continuation-index-v9.json');
const all=readJson(base+'current-authored-batches-v9.json');
const gfIndex=base+'gyeongsang-remaining-authoring-r1/candidate-index.json',gf=readJson(gfIndex);
const freezePath=base+'gyeongsang-remaining-authoring-r1/author-freeze.json',freeze=readJson(freezePath);
for(const row of freeze.controlledFiles)assert.equal(sha256(fs.readFileSync(path.resolve(path.dirname(freezePath),row.path))),row.sha256);
const newGroup={exam:'Gyeongsang-remaining',index:ev(gfIndex),authorFreeze:ev(freezePath),authored:15,pointTotal:71,figureInstances:12,candidates:gf.candidates.map(r=>({questionNumber:r.questionNumber,twinExternalId:r.twinExternalId,candidate:{path:path.join(path.dirname(gfIndex),r.candidateFile),sha256:r.candidateFileSha256},candidateDigest:r.candidateDigest,studentDigest:r.studentDigest,assetDigest:r.assetDigest}))};
assert.equal(newGroup.candidates.length,15);all.groups.push(newGroup);
for(const group of all.groups)for(const row of group.candidates) {
 const b=bindCandidate(row.candidate.path),c=b.candidate;
 assert.equal(row.candidate.sha256,b.candidateFileSha256);
 for(const key of ['studentDigest','assetDigest','candidateDigest'])assert.equal(row[key],b[key]);
 Object.assign(row,{authorId:c.authorId,metadataDigest:digest(c.metadata),sourceReferenceDigest:digest(c.sourceReference),variantDeltaDigest:digest(c.variantDelta),variantDelta:c.variantDelta,score:c.score,questionType:c.questionType,figureInstances:b.assets.length,searchMetadata:c.metadata,sourceReference:c.sourceReference,fullVerified:false,loadable:false});
 group.figureInstances=group.candidates.reduce((s,r)=>s+r.figureInstances,0);
 group.pointTotal=group.candidates.reduce((s,r)=>s+r.score,0);
}
const semantic=readJson(base+'current-final-semantic-review-summary-r2.json');
assert.equal(semantic.counts.newIndependentMathReviewerPassed,70);assert.equal(semantic.counts.newIndependentSevenSurfaceGradeReviewerPassed,70);
for(const group of semantic.groups)for(const report of group.rows) {
 const c=all.groups.find(g=>g.exam===group.exam).candidates.find(c=>c.questionNumber===report.questionNumber);
 assert.equal(c.twinExternalId,report.twinExternalId);assert.equal(c.candidate.sha256,report.authoredCandidate.sha256);
 c.independentSemanticReview=report;c.independentReviewStatus='current bound independent math/grade report; content holds and rights/native gates separate';
}
const ids=all.groups.flatMap(g=>g.candidates.map(r=>r.twinExternalId));
assert.equal(ids.length,106);assert.equal(new Set(ids).size,106);
assert.equal(all.groups.reduce((s,g)=>s+g.figureInstances,0),84);
const counts={authoredCurrentCandidates:106,currentFigureInstances:84,recreatedStatTables:5,builtinImagegenRasters:2,preExposureRawSolvesBoundToCurrentCandidates:90,preExposureRawSolvesIncludingSupersededR1:91,independentMathReviewed:90,independentFullGradeReviewed:90,contentReviewPassed:15,contentReviewHeld:75,awaitingCollectedIndependentReview:16,fullVerified:0,loadable:0,dbWrites:0};
assert.equal(counts.contentReviewPassed,12+semantic.counts.newContentReviewPassed);assert.equal(counts.contentReviewHeld,8+semantic.counts.newContentReviewHeld);
all.kind='current-authored-multiple-exam-index/v4';all.createdAt=createdAt;all.counts=counts;all.currentIdsDigest=digest(ids);all.previous=ev(base+'current-authored-batches-v9.json');
write(base+'current-authored-batches-v10.json',all);
const source1=base+'next-three-extraction-r1-attempt2/extraction-attempt-index.json',source2=base+'next-three-extraction-r2-attempt1/extraction-attempt-index.json';
assert.equal(readJson(source1).actualParsedParents,67);assert.equal(readJson(source2).actualParsedParents,59);
const activeWork=[
 {worktree:'exam-twin-source-identity-20261008',originalSessionId:'01a1177f-954e-7343-9cfb-e803c179ed85',scope:'fresh q22-r2 student-only solve; seal before private exposure',request:'ba4eae89-eeac-4f6c-b781-734a26aca470',status:'actual work observed; not yet collected'},
 {worktree:'exam-twin-author-geometry-20261008',originalSessionId:'01a1177e-fbb2-7822-a7e2-51c40b39e38f',scope:'fresh GF15 student-only solve; q18 complexity hold separate',request:'03c81516-794f-4787-8b5a-0ab1efd45125',status:'actual student figures and code work observed; not yet collected'},
 {worktree:'exam-twin-author-algebra-20261008',originalSessionId:'01a1177d-e52b-7511-944f-c2d4edd47c82',scope:'whole new KI/KSE/NB67 source identity/components and question-only whitelist',request:'e9d34086-ee4f-4818-8514-9b35394b3ba6',status:'resumed same session after capacity interruption; prior views/dirty evidence preserved'},
 {worktree:'exam-extraction-resume-20261008',scope:'current report joins, source59 quarantine audit, metadata correction, intermediate commit/push and continued production',status:'working'}
];
const main=spawnSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).stdout.trim();
assert.equal(spawnSync('git',['merge-base','--is-ancestor',main,'HEAD']).status,0);
const report='docs/planning/tracks/reports/exam-twin-checkpoint-v10-20261008.md';
const version={...previous,kind:'execution-continuation-index/v10',version:10,createdAt,previousIndex:ev(base+'continuation-index-v9.json'),progressReport:report,progressReportSha256:sha256(fs.readFileSync(report)),counts,multipleExamCurrentIndex:ev(base+'current-authored-batches-v10.json'),currentSemanticReviewSummary:ev(base+'current-final-semantic-review-summary-r2.json'),semanticReviewClarification:'90 actually bound math/grade reports; 15 content passes and75 holds. GS22-r1 is excluded from current r2 review. Author code, raw pending work and legacy literal comparisons are not approvals.',newSourceAttempts:{entries:[ev(source1),ev(source2)],previousConfirmedContentParents:127,newQuarantinedParsedParents:126,allParsedParentObservations:253,newComponentApprovals:0,wholeIdentityAndPairApprovals:0,allNExtracted:false,authorDistributionAllowed:false},q22Repair:{...previous.q22Repair,freshIndependentSolvePending:true,currentSelectionUnchanged:true},metadataCorrection:{exam:'Gyeongsang-stat',questionNumber:13,currentId:'exam-twin-gyeongsang-2025-2-mid-author-r4-q13',status:'nonstudent deviation-definition sign correction required; frozen r4 and report preserved',studentMathAndGradePassed:true,familyAndMetadataRemainHeld:true},remoteIntegration:{ref:'origin/main',integratedSha:main,featureBackupConfirmed:ev(base+'checkpoint-push-receipt-v9.json'),currentOwnedCheckpointPush:'required after this version is committed and latest fetch/integration/checks',mainWorktreeWritten:false,forcePush:false},activeWork,snapshotScope:'106 current authored;90 math/grade;15 content pass75held;16 fresh-review pending; all rights/native/loading unapproved. Raw126 new source parents quarantined, not allN extraction or whole-engine completion.'};
delete version.statusLedger;
const ledger={kind:'execution-status-ledger/v10',version:10,createdAt,latestDirective:version.latestDirective,previousLedger:ev(base+'status-ledger-v9.json'),report:ev(report),counts,currentIndex:version.multipleExamCurrentIndex,currentSemanticReviewSummary:version.currentSemanticReviewSummary,semanticReviewClarification:version.semanticReviewClarification,newSourceAttempts:version.newSourceAttempts,q22Repair:version.q22Repair,metadataCorrection:version.metadataCorrection,engineLedger:ev(base+'engine-upgrades-progress-r3.json'),relatedTests:{corePassed:33,mainChangedEnginePassed:65,mainChangedRenderPassed:21,actualReviewCountsNotInferredFromTests:true},remoteIntegration:version.remoteIntegration,activeWork,freshBankRead:previous.freshBankRead,restrictions:previous.restrictions,continuationWatch:previous.continuationWatch,wholeGoalComplete:false,productionEngineUpgradesComplete:0};
write(base+'status-ledger-v10.json',ledger);version.statusLedger=ev(base+'status-ledger-v10.json');write(base+'continuation-index-v10.json',version);
const owner=readJson(base+'continuation-index.json');owner.version=10;owner.currentExecution={...ev(base+'continuation-index-v10.json'),version:10};owner.currentExecutionCounts=counts;
fs.writeFileSync(base+'continuation-index.json',JSON.stringify(owner,null,2)+'\n');fs.writeFileSync(base+'status-ledger.json',JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify(counts));
