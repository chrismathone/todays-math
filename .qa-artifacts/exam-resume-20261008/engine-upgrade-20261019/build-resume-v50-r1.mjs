import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {bindCandidate,digest,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
import {summarizeReviewedBatch} from '../../../scripts/import/exam-twin/summarize-reviewed-batch.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',utc=new Date().toISOString();
const ref=p=>({path:p,sha256:sha256(fs.readFileSync(p))}),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const old=readJson(b+'current-authored-batches-v49.json'),prior=readJson(b+'status-ledger-v49.json');
const eng=readJson(b+'engine-upgrades-progress-r41.json'),ci=readJson(b+'continuation-index-v49.json');
for(const r of eng.code)assert.equal(ref(r.path).sha256,r.sha256);
const validation=readJson(e+'v49-post-main-validation-r2.json');
for(const r of validation.code)assert.equal(ref(r.path).sha256,r.sha256);
assert.equal(validation.main,git('rev-parse','origin/main'));git('merge-base','--is-ancestor',validation.main,'HEAD');
const print=readJson(e+'v49-main-print-r3.json');assert(print.success);assert.equal(print.numPassedTests,66);
const reportPath=b+'gachang-group3-review-20261020-r3/own-review-evidence-r3/own-review-report-r3.json';
assert.equal(ref(reportPath).sha256,'56abbbb99a53105ce534abb345a5ff71ef5163090a288a5da71dfa617d3bc770');
const transport=readJson(e+'gachang-group3-full-review-transport-r3.json');
assert.equal(transport.workerCommit,'6699dab9000e97cb7a87cdad52f01fd1cd03a8a0');
const current=readJson(e+'gachang-group3-current-r3-collected-r1.json');
assert.equal(current.mathematicalVerified,2);assert.equal(current.gradeReviewed,2);assert.equal(current.loadable,0);
const bindings=[],seen=new Set();let references=0;
function check(row){
  const x=bindCandidate(row.candidate.path);assert.equal(x.candidateFileSha256,row.candidate.sha256);
  for(const k of ['studentDigest','candidateDigest','assetDigest'])assert.equal(x[k],row[k]);
  assert.equal(digest(x.candidate.metadata),row.metadataDigest);assert.equal(digest(x.candidate.sourceReference),row.sourceReferenceDigest);
  const exact=digest({content:x.candidate.content,choices:x.candidate.choices,score:x.candidate.score,assets:x.assets.map(a=>a.svgSha256)});
  assert(!seen.has(exact));seen.add(exact);
  for(const k of ['report','verificationManifest','blindManifest','solve','seal']){
    const r=row.review?.[k];if(r?.path&&r.sha256){assert.equal(ref(r.path).sha256,r.sha256);references++;}
  }
  bindings.push({id:row.twinExternalId,candidate:row.candidate,studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,
    assetDigest:x.assetDigest,metadataDigest:row.metadataDigest,sourceReferenceDigest:row.sourceReferenceDigest,exactStudentSurfaceDigest:exact});
}
for(const row of old.groups.flatMap(g=>g.candidates))check(row);assert.equal(references,285);
const exam='Gachang-2025-sem1-final-group3',root=b+'gachang-group3-review-20261020-r3/';
const authors=[3,6].map(n=>({n,path:b+`gachang-group3-authoring-20261020-r3/gachang/q0${n}.json`}));
const ai=root+'current-author-index-v50-r1.json',summaryPath=root+'current-author-summary-v50-r1.json';
write(ai,{questions:authors.map(({n,path})=>({n,id:readJson(path).twinExternalId,candidate:path,sha256:ref(path).sha256}))});
const summary=summarizeReviewedBatch(ai,[root]);assert.equal(summary.counts.mathematicalVerified,2);
assert.equal(summary.counts.gradeReviewed,2);assert.equal(summary.counts.contentReviewPassed,0);write(summaryPath,summary);
const added=authors.map(({n,path})=>{
  const x=bindCandidate(path),q=x.candidate,r=summary.questions.find(a=>a.n===n);
  const row={exam,questionNumber:n,twinExternalId:q.twinExternalId,authorId:q.authorId,candidate:ref(path),
    candidateDigest:x.candidateDigest,studentDigest:x.studentDigest,assetDigest:x.assetDigest,
    metadataDigest:digest(q.metadata),sourceReferenceDigest:digest(q.sourceReference),score:q.score,
    questionType:q.questionType,figureInstances:x.assets.length,newTables:q.metadata.figureAuthoring.newTables,
    searchMetadata:q.metadata,sourceReference:q.sourceReference,variantDelta:q.variantDelta,variantDeltaDigest:digest(q.variantDelta),
    fullVerified:false,loadable:false,review:{authorCandidateDigest:x.candidateDigest,frozenCandidateDigest:r.candidateDigest,
      pathRelocationVerifiedByStrictSummary:true,status:'Current R3 math/grade reviewed; later prerequisite Unit explicit, actual learning/placement and family/source/rights/native held',
      mathematicalVerified:r.mathematicalVerified,gradeReviewed:r.gradeReviewed,contentReviewPassed:false,unitFamilyFit:false,
      summary:ref(summaryPath),report:r.reportFile,verificationManifest:r.verificationManifest,blindManifest:r.blindManifest,
      solve:r.independentSolveFile,seal:ref(root+'verification/sealed-raw-commit.json'),
      workerRawCommit:'c621b7d17cef1e4e6db495d52bdb298dabb71a73',parentRawCommit:'c89b1a152f63981ed643df85d62759ed270e7da6',
      fullReviewCommit:transport.workerCommit,newIndependentBlindSolve:true,
      R3IsMetadataRepairNotNewBlindSolve:true,initialRawTextVectorOnlyLimitationPreserved:true,
      originalIncidentalFirstPageExposureDeclared:true,wholeCorpusBlindClaim:false,
      fullStudentAndSolutionPngPending:true,actualNativePlacementSupport:false,loadable:false}};
  check(row);return row;
});
assert.equal(bindings.length,174);assert.equal(references,295);assert.equal(new Set(bindings.map(r=>r.id)).size,174);
const groupIndex=b+'gachang-group3-current-candidate-index-v50.json';
write(groupIndex,{exam,createdAt:utc,questions:authors.map(({n,path})=>({n,id:readJson(path).twinExternalId,candidate:path,sha256:ref(path).sha256})),loadable:0});
const groups=[...old.groups,{exam,index:ref(groupIndex),authored:2,pointTotal:8,figureInstances:1,newTables:1,candidates:added,latestIndependentReviews:[ref(summaryPath)]}];
const counts={...prior.counts,authoredCurrentCandidates:174,currentFigureInstances:117,recreatedStatTables:28,
  preExposureRawSolvesBoundToCurrentCandidates:174,currentRawSolved:173,independentMathReviewed:173,
  independentFullGradeReviewed:173,contentReviewHeld:158};assert.equal(counts.contentReviewPassed+counts.contentReviewHeld,173);
const binding=e+'current174-binding-audit-r1.json',working=e+'working-candidates-20261020-r38.json';
const index=b+'current-authored-batches-v50.json',engine=b+'engine-upgrades-progress-r42.json';
const ledger=b+'status-ledger-v50.json',continuation=b+'continuation-index-v50.json';
const report='docs/planning/tracks/reports/exam-twin-engine-checkpoint-v50-20261020.md';
write(binding,{utc,currentCandidates:174,rows:bindings,currentReviewFileReferences:295,old172And285ReviewRefsUnchanged:true,
  allCandidateStudentAssetMetadataSourceHashesMatch:true,exactBodyChoicesScoreAssetDuplicateGroups:[],rightsApproved:false,dbWrites:0});
const headers=ref(b+'local-hwp-header-roles-20261020-r1/aggregate-receipt.json');
write(working,{utc,canonicalSelected:174,canonicalMathGrade:173,actualAuthored:174,additionalUnselectedAuthored:0,
  actualFigures:117,actualTables:28,builtinImagegenRasters:2,gradeAndMathNotFinalApproval:true,
  rawSolved:173,oldGyeongsang18Pending:1,currentGroup3FullMetadataReview:ref(reportPath),
  previousR2PrerequisiteFindingPreserved:true,R3MetadataRepairNotNewMathOrBlindCredit:true,
  actualNativeLearningAndPlacementEvidenceHeld:true,fullStudentAndSolutionRenderPendingMemoryFloor:true,
  sourceHeaderAudit:headers,sourceHeaderAuditIsNotIdentityCertification:true,canonicalSourceCounterUnchanged:12080,
  originalNLastObservedUnavailable:true,loadable:0,dbWrites:0,wholeGoalComplete:false});
write(index,{...old,version:50,createdAt:utc,previous:ref(b+'current-authored-batches-v49.json'),groups,counts,
  currentIdsDigest:digest(bindings.map(r=>r.id).sort()),newManualCandidateIds:added.map(r=>r.twinExternalId),
  latestIndependentSummaries:[...old.latestIndependentSummaries,ref(summaryPath)],latestBindingAudit:ref(binding),
  previous172SelectionsUnchanged:true,additionalUnselectedAuthored:0,workingDrafts:ref(working)});
const main={ref:validation.main,testedHead:validation.head,validation:ref(e+'v49-post-main-validation-r2.json'),coauthorChangesPreserved:true,featurePushPending:true};
const delta='174selected/173math-grade/15contentpassed158held/old1pending/final0. Promote existing two authored variants only after fresh R3 metadata review; prerequisite Units corrected without new math/blind credit. 105engine/verification code files unchanged.';
write(engine,{...eng,kind:'exam-engine-upgrades-progress/v42',version:42,createdAt:utc,
  previous:ref(b+'engine-upgrades-progress-r41.json'),report,currentCounts:counts,currentCandidateIndex:ref(index),
  actualAuthoredIncludingUnselectedDrafts:174,additionalUnselectedAuthored:0,newAuthoredProblems:0,newFigureInstances:0,newTables:0,
  canonicalPromotionOfExistingAuthored:2,workingDrafts:ref(working),latestMainIntegration:main,
  validations:{...eng.validations,latestMain:ref(e+'v49-post-main-validation-r2.json'),currentManualBindingAudit:ref(binding),latestGroup3Metadata:ref(reportPath)},
  newLocalHeaderRolesAudit:headers,pendingMethodGradeGateReview:ref(e+'m3-method-grade-gate-design-r1.json'),
  pendingMethodGradeGateProductionChange:false,checkpointDelta:delta,wholeEngineComplete:false,wholeExtractionComplete:false,dbWrites:0,deployed:false});
write(ledger,{...prior,kind:'execution-status-ledger/v50',version:50,createdAt:utc,previousLedger:ref(b+'status-ledger-v49.json'),
  counts,currentIndex:ref(index),engine:ref(engine),workingDrafts:ref(working),actualAuthoredIncludingUnselectedDrafts:174,
  latestMainIntegration:main,countsBasis:delta,newLocalHeaderRolesAudit:headers,wholeGoalComplete:false});
write(continuation,{...ci,kind:'exam-continuation-index/v50',version:50,createdAt:utc,previousIndex:ref(b+'continuation-index-v49.json'),
  statusLedger:ref(ledger),currentCandidateIndex:ref(index),engine:ref(engine),counts,progressReport:report,
  workingDrafts:ref(working),actualAuthoredIncludingUnselectedDrafts:174,latestMainIntegration:main,
  nextActions:['Review and implement bounded below-M3 method gate for other source-informed factories; keep existing release closure/2022 holds and independently verify.',
    'Render/inspect complete current Gachangq3q6 student/solution pages once memory>=3GiB; vector-only view is not native/print/layout approval.',
    'Continue available local source/content/metadata work while N references are individually unavailable; 98 header-role observations do not certify identities, dates or content pairs.',
    'Continue2025+extraction/twins/source/family/rights/native/engine work; preserve protected82 and all original evidence. Fetch both refs, integrate/recheck and fast-forward feature checkpoints.'],wholeGoalComplete:false});
write(e+'canonical-v50-finalization-r1.json',{utc,counts,current174And295ReviewRefsBound:true,currentCodeFiles:105,
  previous172BindingsUnchanged:true,actualAuthored174NoNewMathForMetadataRepair:true,
  currentGroup3IndependentMath2Grade2Content0:ref(reportPath),headerRoles:headers,dbWrites:0,loadable:0,wholeGoalComplete:false});
console.log(JSON.stringify({counts,actualAuthored:174,codeFiles:105,wholeGoalComplete:false}));
