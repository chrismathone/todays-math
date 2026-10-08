import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256,bindCandidate,digest,readJson} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const evidence=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const createdAt=new Date().toISOString();
const scopes=[
 {exam:'Bumil',path:base+'bumil-authoring-r2/candidate-index-r2.json',expected:20,rows:i=>i.questions,file:r=>r.candidate,relative:false},
 {exam:'Gyeonggu',path:base+'gyeonggu-authoring-r1/candidate-index.json',expected:22,rows:i=>i.candidates,file:r=>r.candidatePath,relative:true},
 {exam:'Gyeongsan',path:base+'gyeongsan-authoring-r1/author-index-all25.json',expected:24,rows:i=>i.questions.filter(r=>r.candidatePath),file:r=>r.candidatePath,relative:true},
 {exam:'Gyeongam',path:base+'gyeongam-authoring-r1/candidate-index.json',expected:18,rows:i=>i.candidates,file:r=>r.candidatePath,relative:true},
 {exam:'Gyeongsang-stat',path:base+'gyeongsang-stat-authoring-r1/candidate-index-r4.json',expected:7,rows:i=>i.candidates,file:r=>r.candidatePath,relative:true},
];
const groups=scopes.map(s=>{
 const rows=s.rows(readJson(s.path));assert.equal(rows.length,s.expected);
 const candidates=rows.map(r=>{
  const file=s.relative?path.join(path.dirname(s.path),s.file(r)):s.file(r);
  const b=bindCandidate(file),c=b.candidate;
  for(const k of ['studentDigest','assetDigest','candidateDigest','candidateFileSha256'])if(r[k])assert.equal(r[k],b[k],`${s.exam}q${c.questionNumber}:${k}`);
  if(r.sha256)assert.equal(r.sha256,b.candidateFileSha256);
  if(r.metadataDigest)assert.equal(r.metadataDigest,digest(c.metadata));
  return {questionNumber:c.questionNumber,twinExternalId:c.twinExternalId,authorId:c.authorId,candidate:evidence(file),studentDigest:b.studentDigest,assetDigest:b.assetDigest,candidateDigest:b.candidateDigest,metadataDigest:digest(c.metadata),sourceReferenceDigest:digest(c.sourceReference),variantDigest:digest(c.variant??null),score:c.score,questionType:c.questionType,figureInstances:b.assets.length,searchMetadata:c.metadata,sourceReference:c.sourceReference,independentReviewStatus:s.exam==='Bumil'?'see exact current report summary':'not yet collected',fullVerified:false,loadable:false};
 });
 return {exam:s.exam,index:evidence(s.path),authored:candidates.length,pointTotal:candidates.reduce((n,c)=>n+c.score,0),figureInstances:candidates.reduce((n,c)=>n+c.figureInstances,0),candidates};
});
const ids=groups.flatMap(g=>g.candidates.map(c=>c.twinExternalId));assert.equal(ids.length,91);assert.equal(new Set(ids).size,91);
assert.equal(groups.reduce((s,g)=>s+g.figureInstances,0),72);
const raw=readJson(base+'gyeonggu-independent-r1/raw-solves-manifest.json');assert.equal(raw.rawSolveCount,22);
for(const r of raw.solves) {
 const p=base+'gyeonggu-independent-r1/'+r.rawSolvePath;
 assert.equal(sha256(fs.readFileSync(p)),r.rawSolveSha256);
 const solve=readJson(p),current=groups.find(g=>g.exam==='Gyeonggu').candidates.find(c=>c.questionNumber===r.questionNumber);
 assert.equal(solve.studentDigest,current.studentDigest);assert.equal(solve.solverId,raw.solverId);assert.notEqual(solve.solverId,current.authorId);
}
const counts={authoredCurrentCandidates:91,currentFigureInstances:72,recreatedStatTables:5,builtinImagegenRasters:2,preExposureRawSolvesBound:42,independentMathReviewed:20,independentFullGradeReviewed:20,contentReviewPassed:12,contentReviewHeld:8,awaitingCollectedIndependentReview:71,fullVerified:0,loadable:0,dbWrites:0};
const old=readJson(base+'continuation-index-v7.json');
const source={BumilParents:21,nextFiveParents:106,nextFiveLeafAssessmentItems:116,selectedNextFiveAllComponentPairs:105,selectedNextFiveScoreExceptions:1,wholeExamPairCertification:0,rightsPermissionApprovals:0};
const all={kind:'current-authored-multiple-exam-index/v2',createdAt,groups,counts,currentIdsDigest:digest(ids),source,sourceCorrections:[evidence(base+'gyeonggu-q13-source-correction-r2/correction.json')],excludedBeforeAuthoring:{Bumil:[7],Gyeonggu:[20],Gyeongsan:[15]},heldBeforeAuthoring:{Gyeongam:[15]},originalQuestionExclusionScopes:'Bumil7 independently adjudicated; other author exclusions/holds are not whole-original independent approval.',notAllNExamsExtracted:true,notAllNextFiveAuthored:true,nativeReaderParity:false};
write(base+'current-authored-batches-v8.json',all);

const engineOld=readJson(base+'engine-upgrades-progress-r1.json');
const engine={...engineOld,version:2,createdAt,previous:evidence(base+'engine-upgrades-progress-r1.json'),candidateCount:29,productionUpgradesCompleted:0,wholeEngineComplete:false,items:[...engineOld.items,{id:'U29',title:'Exact constant, role and unit comparison without changing raw blind solves',productionStatus:'not-implemented',observedTrigger:'Gyeonggu written equivalent radicals and detailed MC annotations differ from authored answer strings. Literal equality must not stand in for mathematics; partial constants do not certify whole-answer meaning.',candidateWorkflowStatus:'bounded calculation helper implemented; free-written semantic coverage and native grade/review integration pending',codeTargets:[{path:'scripts/import/exam-twin/constantAnswers.mjs',sha256:sha256(fs.readFileSync('scripts/import/exam-twin/constantAnswers.mjs'))}],tests:5,validationRequired:'Bound actual candidate/student/asset/raw-solve and role/unit/whole-answer target coverage; preserve pre-exposure proofs; require independent within-grade full reasoning, no uncertainty/rights or operational release from numeric match.'}],relatedTests:{passed:30,actualNewQuestionReviews:0},statisticsSupport:evidence('scripts/import/exam-twin/statisticsConditions.mjs'),constantSupport:evidence('scripts/import/exam-twin/constantAnswers.mjs'),noInferenceOrDBWrites:true};
write(base+'engine-upgrades-progress-r2.json',engine);
const activeWork=[
 {worktree:'exam-twin-source-identity-20261008',originalSessionId:'01a1177f-954e-7343-9cfb-e803c179ed85',scope:'Gyeonggu22 final math/grade/content/classification review plus independent source13 correction',status:'working; raw solves already sealed'},
 {worktree:'exam-twin-author-geometry-20261008',originalSessionId:'01a1177e-fbb2-7822-a7e2-51c40b39e38f',scope:'Independent student-only Gyeongsang-stat7 then Gyeongsan24 fresh solves',status:'turn_started',dispatchRequest:'998aaa5e-0924-4140-9b09-846c4347576d'},
 {worktree:'exam-twin-author-algebra-20261008',originalSessionId:'01a1177d-e52b-7511-944f-c2d4edd47c82',scope:'Independent student-only Gyeongam18 fresh solves',status:'turn_started',dispatchRequest:'737b5e24-6e2c-44b1-abff-0696a8d12137'},
 {worktree:'exam-extraction-resume-20261008',scope:'Current source/candidate/metadata/encoding bindings; Gyeongsang remaining15/newsource extraction; useful code support',status:'working'},
];
const remote=spawnSync('git',['rev-parse','origin/main'],{encoding:'utf8'});assert.equal(remote.status,0);
const nextFive={...old.nextFive,historicalPreparationSnapshot:old.nextFive,legacySnapshotCountsAreNotCurrent:true,newTwinsCreated:71,verifiedTwins:0,actualNewSourceExtraction:{...old.nextFive.actualNewSourceExtraction,newTwinsAuthored:71},remainingAuthoredCoverage:{Gyeonggu:{sourceParents:23,authored:22,authorExcluded:[20]},Gyeongsan:{sourceParents:25,authored:24,authorExcluded:[15]},Gyeongam:{sourceParents:19,authored:18,authorHeld:[15]},Gyeongsang:{sourceParents:22,authored:7,remaining15:true},Gyeongsin:{sourceParents:17,authored:0,sourceIdentityAndScoreHeld:true}}};
const watcherFiles=['automation-config.json','controller-r2-preserved.ps1','verification-r2-20261008.json'].map(n=>evidence(base+'continuation-watch/'+n));
const config=readJson(base+'continuation-watch/automation-config.json');assert.equal(config.version,2);
const watch={config:watcherFiles[0],preservedRootFiles:watcherFiles,oldOrcaAutomation:{id:'358474c8-24be-49ee-b3c9-55fbebf68de4',state:'disabled; failed history preserved'},currentScheduledTask:{name:'TodaysMath-ExamContinuation',state:'Root last confirmed Enabled/Ready/working-skip',intervalMinutes:15,verification:watcherFiles[2]},externalControllerOwnedBy:'Root; primary has not overwritten external controller/config',role:'read-only continuation monitor; no question authoring or approval',noWholeCompleteOrStopMarker:true};
const report='docs/planning/tracks/reports/exam-twin-authoring-progress-20261008.md';
const version={...old,kind:'execution-continuation-index/v8',version:8,createdAt,latestDirective:'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-5.md',latestDirectiveSha256:sha256(fs.readFileSync('docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-5.md')),previousIndex:evidence(base+'continuation-index-v7.json'),priorReportCaptured:evidence(base+'authoring-progress-v7-captured.md'),progressReport:report,progressReportSha256:sha256(fs.readFileSync(report)),counts,multipleExamCurrentIndex:evidence(base+'current-authored-batches-v8.json'),nextFive,activeWork,continuationWatch:watch,engine:{...old.engine,implementationLedger:base+'engine-upgrades-progress-r2.json',trackedCandidates:29,productionUpgradesComplete:0,wholeEngineComplete:false},relatedTests:{passed:30,actualNewQuestionReviews:0},currentRawIndependentGyeonggu:{commit:'c02838323307f69648124f837285503a53e99bd3',parentMerge:'07d14638e',rawManifest:evidence(base+'gyeonggu-independent-r1/raw-solves-manifest.json'),solves:22,preExposure:true,finalReviewsCollected:0},gyeongamParentBindingAudit:evidence(base+'gyeongam-parent-integration-r1/verification.json'),gyeonggu13SourceCorrection:evidence(base+'gyeonggu-q13-source-correction-r2/correction.json'),newBlindDispatch:evidence(base+'independent-next-batches-dispatch-r1.json'),remoteIntegration:{ref:'origin/main',actualFetchedSha:remote.stdout.trim(),mergeCommit:'020b101ba',subsequentAuthorMergeCommits:['af65558b5','363943ca4'],mainWorktreeWritten:false,pushed:false},snapshotScope:'Current authored91 exact inputs and fresh raw42, independently collected Bumil20 only; remaining2025+ extraction/authoring/review/production engine goal incomplete.'};
delete version.statusLedger;
const ledger={kind:'execution-status-ledger/v8',version:8,createdAt,latestDirective:version.latestDirective,previousLedger:evidence(base+'status-ledger-v7.json'),report:evidence(report),counts,currentIndex:version.multipleExamCurrentIndex,source,nextFiveCoverage:nextFive.remainingAuthoredCoverage,firstBumilBatchCounts:old.firstBumilBatchCounts,currentReviewSummary:old.currentReviewSummary,currentRawIndependentGyeonggu:version.currentRawIndependentGyeonggu,newBlindDispatch:version.newBlindDispatch,gyeongamParentBindingAudit:version.gyeongamParentBindingAudit,gyeonggu13SourceCorrection:version.gyeonggu13SourceCorrection,engineLedger:evidence(base+'engine-upgrades-progress-r2.json'),relatedTests:version.relatedTests,remoteIntegration:version.remoteIntegration,activeWork,continuationWatch:watch,freshBankRead:old.freshBankRead,restrictions:old.restrictions,wholeGoalComplete:false,productionEngineUpgradesComplete:0};
write(base+'status-ledger-v8.json',ledger);version.statusLedger=evidence(base+'status-ledger-v8.json');write(base+'continuation-index-v8.json',version);
const owner=readJson(base+'continuation-index.json');owner.version=8;owner.currentExecution={...evidence(base+'continuation-index-v8.json'),version:8};owner.currentExecutionCounts=counts;
fs.writeFileSync(base+'continuation-index.json',JSON.stringify(owner,null,2)+'\n');fs.writeFileSync(base+'status-ledger.json',JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify(counts));
