import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {bindCandidate,digest,readJson,sha256} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const ev=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const old=readJson(base+'continuation-index-v8.json');
const all=readJson(base+'current-authored-batches-v8.json');
const createdAt=new Date().toISOString();
const repair=base+'gyeongsan-q22-repair-r2/candidate.json';
const overrides=[];
for(const group of all.groups)for(const row of group.candidates) {
 let file=row.candidate.path;
 if(group.exam==='Gyeongsan' && row.questionNumber===22) {
  overrides.push({exam:group.exam,questionNumber:22,previousCandidate:row.candidate,previousId:row.twinExternalId,replacement:ev(repair),oldRawSolveCannotReviewReplacement:true});file=repair;
 }
 const b=bindCandidate(file),c=b.candidate;
 if(file!==repair)for(const key of ['studentDigest','assetDigest','candidateDigest'])assert.equal(row[key],b[key]);
 Object.assign(row,{twinExternalId:c.twinExternalId,authorId:c.authorId,candidate:ev(file),studentDigest:b.studentDigest,assetDigest:b.assetDigest,candidateDigest:b.candidateDigest,metadataDigest:digest(c.metadata),sourceReferenceDigest:digest(c.sourceReference),variantDeltaDigest:digest(c.variantDelta),variantDelta:c.variantDelta,score:c.score,questionType:c.questionType,figureInstances:b.assets.length,searchMetadata:c.metadata,sourceReference:c.sourceReference,independentReviewStatus:group.exam==='Bumil'?'bound original current20 summary':['Gyeonggu','Gyeongam'].includes(group.exam)?'bound fresh semantic reviewer report; formatting gate separate':file===repair?'fresh r2 blind solve not started':'fresh raw solve sealed, final review underway',fullVerified:false,loadable:false});
 delete row.variantDigest;
}
const semantic=readJson(base+'current-final-semantic-review-summary-r1.json');
assert.equal(semantic.counts.newIndependentMathReviewerPassed,40);
assert.equal(semantic.counts.newIndependentSevenSurfaceGradeReviewerPassed,40);
for(const group of semantic.groups)for(const report of group.rows) {
 const c=all.groups.find(g=>g.exam===group.exam).candidates.find(c=>c.questionNumber===report.questionNumber);
 assert.equal(c.twinExternalId,report.twinExternalId);assert.equal(c.candidate.sha256,report.authoredCandidate.sha256);
 c.independentSemanticReview=report;
}
const ids=all.groups.flatMap(g=>g.candidates.map(c=>c.twinExternalId));assert.equal(new Set(ids).size,91);
assert.equal(all.groups.reduce((s,g)=>s+g.figureInstances,0),72);
const counts={authoredCurrentCandidates:91,currentFigureInstances:72,recreatedStatTables:5,builtinImagegenRasters:2,preExposureRawSolvesBoundToCurrentCandidates:90,preExposureRawSolvesIncludingSupersededR1:91,independentMathReviewed:60,independentFullGradeReviewed:60,contentReviewPassed:13,contentReviewHeld:47,awaitingCollectedIndependentReview:31,fullVerified:0,loadable:0,dbWrites:0};
all.kind='current-authored-multiple-exam-index/v3';all.createdAt=createdAt;all.counts=counts;all.currentIdsDigest=digest(ids);all.selectionOverrides=overrides;all.previous=ev(base+'current-authored-batches-v8.json');all.variantIndexCorrection='v8 used nonexistent candidate.variant (null placeholder); v9 indexes actual variantDelta. Frozen candidate bodies/deltas and v8 evidence preserved.';
write(base+'current-authored-batches-v9.json',all);
const engineOld=readJson(base+'engine-upgrades-progress-r2.json');
const engine={...engineOld,version:3,createdAt,previous:ev(base+'engine-upgrades-progress-r2.json'),candidateCount:30,items:[...engineOld.items,{id:'U30',title:'Exact computed distractor equivalence and unique-target controls',productionStatus:'not-implemented',observedTrigger:'Gyeongsan22 UT/2 and SQ/OS were equal throughout the actual geometry domain although the correct target was unique. Literal option strings missed this.',candidateWorkflowStatus:'exact role/unit values helper implemented and exercised on actual repairedq22; generic symbolic/domain/native template integration pending',codeTargets:[ev('scripts/import/exam-twin/computedChoiceChecks.mjs')],meaningfulTests:3,actualRepairControls:ev(base+'gyeongsan-q22-repair-r2/author-controls.json'),validationRequired:'Checked mathematical model/domain plus all five options; exact aliases and multipart roles/units; samples never prove universal symbolic identity; fresh raw solve and seven-surface grade/core/rights/native gates remain required.'}],relatedTests:{corePassed:33,mainChangedRenderTestsPassed:21,actualQuestionReviewsNotInferredFromTests:true},productionUpgradesCompleted:0,wholeEngineComplete:false};
write(base+'engine-upgrades-progress-r3.json',engine);
const bank=readJson(base+'bank-read-fresh-r3-20261008.json');assert.equal(bank.unlocked,0);assert.equal(bank.identityMismatches,0);assert.equal(bank.correctionMismatches,0);assert.equal(bank.productionWrites,0);
const priorBank=readJson(base+'bank-read-fresh-r2-20261008.json');assert.deepEqual(bank.units,priorBank.units);assert.deepEqual(bank.liveFamilies,priorBank.liveFamilies);
const report='docs/planning/tracks/reports/exam-twin-checkpoint-v9-20261008.md';
const sourceAttempt=readJson(base+'next-three-extraction-r1-attempt2/extraction-attempt-index.json');assert.equal(sourceAttempt.actualParsedParents,67);
const main=spawnSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).stdout.trim();
assert.equal(spawnSync('git',['merge-base','--is-ancestor',main,'HEAD']).status,0);
const activeWork=[
 {worktree:'exam-twin-source-identity-20261008',originalSessionId:'01a1177f-954e-7343-9cfb-e803c179ed85',scope:'Gyeongsang remaining15 authoring; after sealing, fresh unexposed q22-r2 solve',status:'working; actual turn began after CR submission, no duplicate prompt'},
 {worktree:'exam-twin-author-geometry-20261008',originalSessionId:'01a1177e-fbb2-7822-a7e2-51c40b39e38f',scope:'Final fresh stats7 and Gyeongsan24 originalr1 review; preserve q22 duplicatehold',status:'turn_started',request:'760d1225-049e-4379-985a-d5b73b6a6fe1'},
 {worktree:'exam-twin-author-algebra-20261008',originalSessionId:'01a1177d-e52b-7511-944f-c2d4edd47c82',scope:'Whole67 new source component/identity/score/curriculum-risk/author-whitelist review',status:'turn_started',request:'de54ea06-0d75-4b32-9f43-03395d73f60a'},
 {worktree:'exam-extraction-resume-20261008',scope:'Feature checkpoint push, metadata/semantic evidence/current ID joins, sourcequeue and useful code improvements',status:'working'},
];
const version={...old,kind:'execution-continuation-index/v9',version:9,createdAt,latestDirective:'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-6.md',latestDirectiveSha256:sha256(fs.readFileSync('docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-6.md')),previousIndex:ev(base+'continuation-index-v8.json'),progressReport:report,progressReportSha256:sha256(fs.readFileSync(report)),priorReportCaptured:ev('docs/planning/tracks/reports/exam-twin-authoring-progress-20261008.md'),counts,multipleExamCurrentIndex:ev(base+'current-authored-batches-v9.json'),currentSemanticReviewSummary:ev(base+'current-final-semantic-review-summary-r1.json'),semanticReviewClarification:'60 actually independently reviewed math/grade; semantic role/value/meaning evidence stays separate from legacy literal comparator. No raw solve edits or automatic full-answer semantic approval added.',newSourceAttempt:{index:ev(base+'next-three-extraction-r1-attempt2/extraction-attempt-index.json'),preliminary:ev(base+'next-three-extraction-r1-attempt2/preliminary-printed-identity-review-r1.json'),newParsedParents:67,previousConfirmedContentParents:127,newComponentApprovals:0,quarantined:true,allNExtracted:false},q22Repair:{candidate:ev(repair),controls:ev(base+'gyeongsan-q22-repair-r2/author-controls.json'),visual:ev(base+'gyeongsan-q22-repair-r2/visual-inspection.json'),blind:ev(base+'gyeongsan-q22-review-r2/blind/blind-manifest.json'),freshIndependentSolvePending:true,priorR1RawAndReviewPreserved:true},freshBankRead:{path:base+'bank-read-fresh-r3-20261008.json',sha256:sha256(fs.readFileSync(base+'bank-read-fresh-r3-20261008.json')),capturedAt:bank.capturedAt,readOnly:bank.transactionReadOnly,isolation:bank.isolation,unitCount:22,eligibleFamilyCount:302,protectedRows:82,unlocked:0,identityMismatches:0,correctionsMismatch:0,globallyDeduplicated:false,previousObservationPreserved:true,unitAndFamilyRowsSameAsR2:true,semanticClassificationNotInferred:true},engine:{...old.engine,implementationLedger:base+'engine-upgrades-progress-r3.json',trackedCandidates:30,productionUpgradesComplete:0,wholeEngineComplete:false},relatedTests:{corePassed:33,mainChangedRenderPassed:21,actualNewQuestionReviews:0},remoteIntegration:{ref:'origin/main',actualFetchedSha:main,mainIntegratedBeforeOwnedCheckpoint:true,mainWorktreeWritten:false,firstFeatureBackup:ev(base+'continuation-watch/first-checkpoint-push-20261008.json'),subsequentFeaturePush:'required after this checkpoint; record remote actual SHA separately',forcePush:false},activeWork,snapshotScope:'91 current author selections including freshq22r2; actual semantic reviewed60; rawcurrent90; source67 quarantined; whole2025+ and production engine unfinished.'};
delete version.statusLedger;
const ledger={kind:'execution-status-ledger/v9',version:9,createdAt,latestDirective:version.latestDirective,previousLedger:ev(base+'status-ledger-v8.json'),report:ev(report),counts,currentIndex:version.multipleExamCurrentIndex,currentSemanticReviewSummary:version.currentSemanticReviewSummary,semanticReviewClarification:version.semanticReviewClarification,newSourceAttempt:version.newSourceAttempt,q22Repair:version.q22Repair,engineLedger:ev(base+'engine-upgrades-progress-r3.json'),relatedTests:version.relatedTests,remoteIntegration:version.remoteIntegration,activeWork,freshBankRead:version.freshBankRead,restrictions:old.restrictions,continuationWatch:old.continuationWatch,wholeGoalComplete:false,productionEngineUpgradesComplete:0};
write(base+'status-ledger-v9.json',ledger);version.statusLedger=ev(base+'status-ledger-v9.json');write(base+'continuation-index-v9.json',version);
const owner=readJson(base+'continuation-index.json');owner.version=9;owner.currentExecution={...ev(base+'continuation-index-v9.json'),version:9};owner.currentExecutionCounts=counts;
fs.writeFileSync(base+'continuation-index.json',JSON.stringify(owner,null,2)+'\n');fs.writeFileSync(base+'status-ledger.json',JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify(counts));
