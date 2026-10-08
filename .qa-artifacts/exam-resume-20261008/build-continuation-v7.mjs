import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {sha256,bindCandidate,digest} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const evidence=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const scopes=[
 {exam:'Bumil',path:base+'bumil-authoring-r2/candidate-index-r2.json',expected:20,rows:i=>i.questions,relative:false,file:r=>r.candidate},
 {exam:'Gyeonggu',path:base+'gyeonggu-authoring-r1/candidate-index.json',expected:22,rows:i=>i.candidates,relative:true,file:r=>r.candidatePath},
 {exam:'Gyeongsan',path:base+'gyeongsan-authoring-r1/author-index-group1.json',expected:9,rows:i=>i.questions,relative:true,file:r=>r.candidatePath},
 {exam:'Gyeongsang-stat',path:base+'gyeongsang-stat-authoring-r1/candidate-index-r4.json',expected:7,rows:i=>i.candidates,relative:true,file:r=>r.candidatePath},
];
const groups=scopes.map(scope=>{
 const index=read(scope.path),rows=scope.rows(index);assert.equal(rows.length,scope.expected);
 const candidates=rows.map(row=>{
  const file=scope.relative?path.join(path.dirname(scope.path),scope.file(row)):scope.file(row);
  const b=bindCandidate(file);
  for(const k of ['studentDigest','assetDigest','candidateDigest'])if(row[k])assert.equal(row[k],b[k]);
  if(row.candidateFileSha256)assert.equal(row.candidateFileSha256,b.candidateFileSha256);
  if(row.sha256)assert.equal(row.sha256,b.candidateFileSha256);
  return {questionNumber:b.candidate.questionNumber,twinExternalId:b.candidate.twinExternalId,authorId:b.candidate.authorId,candidate:evidence(file),studentDigest:b.studentDigest,assetDigest:b.assetDigest,candidateDigest:b.candidateDigest,score:b.candidate.score,questionType:b.candidate.questionType,figureInstances:b.assets.length,independentReviewStatus:scope.exam==='Bumil'?'see exact current report summary':'not yet collected',fullVerified:false,loadable:false};
 });
 return {exam:scope.exam,index:evidence(scope.path),authored:candidates.length,pointTotal:candidates.reduce((s,c)=>s+c.score,0),figureInstances:candidates.reduce((s,c)=>s+c.figureInstances,0),candidates};
});
const ids=groups.flatMap(g=>g.candidates.map(c=>c.twinExternalId));assert.equal(new Set(ids).size,58);
const all={kind:'current-authored-multiple-exam-index/v1',createdAt:new Date().toISOString(),groups,counts:{authoredCurrentCandidates:58,currentFigureInstances:50,recreatedStatTables:5,builtinImagegenRasters:2,independentMathReviewed:20,independentFullGradeReviewed:20,contentReviewPassed:12,contentReviewHeld:8,awaitingCollectedIndependentReview:38,fullVerified:0,loadable:0,dbWrites:0},excluded:{Bumil:{numbers:[7],status:'independently adjudicated2015-ineligible'},Gyeonggu:{numbers:[20],status:'author pre-exclusion; independent whole-original adjudication separate'},Gyeongsan:{numbers:[15],status:'author pre-exclusion recorded; latest final author ledger forthcoming'}},source:{Bumil:21,nextFiveParents:106,nextFiveLeafAssessmentItems:116,nextFiveAllComponentPaired:105,nextFiveScoreException:1,wholeExamPairCertification:0,rightsPermissionApprovals:0},notAllNExamsExtracted:true,notAllNextFiveAuthored:true,currentIdsDigest:digest(ids),nativeReaderParity:false};
assert.equal(groups.reduce((s,g)=>s+g.figureInstances,0),50);
write(base+'current-authored-batches-v7.json',all);
const old=read(base+'continuation-index-v6.json');
const report='docs/planning/tracks/reports/exam-twin-authoring-progress-20261008.md';
const version={...old,kind:'execution-continuation-index/v7',version:7,createdAt:new Date().toISOString(),previousIndex:evidence(base+'continuation-index-v6.json'),priorReportCaptured:evidence(base+'authoring-progress-v6-captured.md'),progressReport:report,progressReportSha256:sha256(fs.readFileSync(report)),firstBumilBatchCounts:old.counts,counts:all.counts,multipleExamCurrentIndex:evidence(base+'current-authored-batches-v7.json'),currentReviewSummary:evidence(base+'bumil-final-review-summary-r3-after-main-grade-lexical.json'),newStatisticsAuthorIndex:evidence(base+'gyeongsang-stat-authoring-r1/candidate-index-r4.json'),newStatisticsAuthorCheck:evidence(base+'gyeongsang-stat-authoring-r1/author-validation-r4.json'),gyeongguFinalSourceJoin:evidence(base+'gyeonggu-source-author-join-r1.json'),statisticsCode:{path:'scripts/import/exam-twin/statisticsConditions.mjs',sha256:sha256(fs.readFileSync('scripts/import/exam-twin/statisticsConditions.mjs')),status:'implemented exact authoring support; used on actual7; production registry/load/template integration incomplete',tests:4,expandedDistributionControls:100},relatedTests:{passed:24,actualNewQuestionReviews:0},remoteIntegration:{ref:'origin/main',actualFetchedSha:'9ab1fc7fca970faab48b95554b4e52a174bc4a56',mergeCommit:'44f0e9430',mainWorktreeWritten:false,pushed:false},activeWork:[{worktree:'exam-twin-source-identity-20261008',scope:'Gyeonggu22 new blind solves; raw files being sealed before author answers',status:'working; not collected'},{worktree:'exam-twin-author-geometry-20261008',scope:'Gyeongam19 source parent authoring',status:'working'},{worktree:'exam-twin-author-algebra-20261008',scope:'Gyeongsan remaining25 after first9commit',status:'working'},{worktree:'exam-extraction-resume-20261008',scope:'Root new Gyeongsang7stat ready for fresh independent review; remaining15/newsource queue',status:'working'}]};
delete version.statusLedger;
const ledger={kind:'execution-status-ledger/v7',version:7,createdAt:version.createdAt,scope:'first current20 plus next-school authoring pipeline; whole extraction/engine goal incomplete',latestDirective:old.latestDirective,previousLedger:evidence(base+'status-ledger-v6.json'),report:evidence(report),firstBumilBatchCounts:old.counts,counts:all.counts,currentIndex:version.multipleExamCurrentIndex,source:all.source,authorExclusions:all.excluded,currentReviewSummary:version.currentReviewSummary,sourceJoin:version.gyeongguFinalSourceJoin,statisticsCode:version.statisticsCode,relatedTests:version.relatedTests,remoteIntegration:version.remoteIntegration,activeWork:version.activeWork,continuationWatch:old.continuationWatch,freshBankRead:old.freshBankRead,restrictions:old.restrictions,wholeGoalComplete:false,productionEngineUpgradesComplete:0};
write(base+'status-ledger-v7.json',ledger);version.statusLedger=evidence(base+'status-ledger-v7.json');write(base+'continuation-index-v7.json',version);
const owner=read(base+'continuation-index.json');owner.version=7;owner.currentExecution={...evidence(base+'continuation-index-v7.json'),version:7};owner.currentExecutionCounts=all.counts;
fs.writeFileSync(base+'continuation-index.json',JSON.stringify(owner,null,2)+'\n');fs.writeFileSync(base+'status-ledger.json',JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify(all.counts));
