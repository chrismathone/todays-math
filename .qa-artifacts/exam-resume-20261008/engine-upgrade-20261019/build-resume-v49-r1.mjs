import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {bindCandidate,digest,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
import {summarizeReviewedBatch} from '../../../scripts/import/exam-twin/summarize-reviewed-batch.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/';
const utc=new Date().toISOString(),ref=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const old=readJson(b+'current-authored-batches-v48.json');
const prior=readJson(b+'status-ledger-v48.json'),eng=readJson(b+'engine-upgrades-progress-r40.json');
const ci=readJson(b+'continuation-index-v48.json');
const parentU62=readJson(e+'inverse-equation-degree-parent-validation-r1.json');
const u62Paths=new Set(parentU62.code.map(r=>r.path));
const code=eng.code.map(r=>{
  const current=ref(r.path);
  if(current.sha256!==r.sha256)assert(u62Paths.has(r.path),'Unexpected prior code change: '+r.path);
  return {...current,normalizedLfSourceSha256:sha256(Buffer.from(fs.readFileSync(r.path,'utf8').replaceAll('\r\n','\n')))};
});
for(const r of parentU62.code)if(!code.some(c=>c.path===r.path))code.push(ref(r.path));
const demandTest='src/components/exam-builder/ExamBuilder.demand.test.tsx';
if(!code.some(c=>c.path===demandTest))code.push(ref(demandTest));
assert.equal(code.length,105);
const auditPath=b+'inverse-equation-degree-code-audit-20261020-r2/own-audit-report-r2.json';
assert.equal(ref(auditPath).sha256,'325f987004243558a34d1482bd6fb6cd92b1f87794ef4cb53be9c8fdd7a8d4f3');
const audit=readJson(auditPath);
assert.equal(audit.ownCounts.passed,934);assert.equal(audit.ownCounts.failed,0);
assert.equal(audit.grade.passed,182);assert.equal(audit.referenceAccounting.standardOccurrences,275);
const v=readJson(e+'v49-current-test-coverage-r2.json');
assert.equal(v.currentFileCount,41);assert.equal(v.currentFailed,0);
assert.equal(v.currentPassed,646);assert(v.originalFailurePreserved);
git('merge-base','--is-ancestor',git('rev-parse','origin/main'),'HEAD');
const lint=readJson(e+'inverse-equation-degree-eslint-r3.json');
assert(lint.length===2 && lint.every(x=>x.errorCount===0&&x.warningCount===0));
const validation=e+'v49-post-main-validation-r1.json';
write(validation,{utc,head:git('rev-parse','HEAD'),main:git('rev-parse','origin/main'),
  currentMainRelatedVitestFiles:41,currentMainRelatedPassed:v.currentPassed,currentMainRelatedFailed:0,
  currentCoverageReport:ref(e+'v49-current-test-coverage-r2.json'),currentTwoFileLint:ref(e+'inverse-equation-degree-eslint-r3.json'),
  currentCoverageBasis:'40 passed unchanged files from initial645pass1fail; repaired demand file rerun16pass. Unique646 cases, not sums of overlapping runs. Original full-run failure retained.',
  prior173AndIsolated11NotSummed:true,independent934NotParentTests:ref(auditPath),
  newMainDevUiPreservedNotClaimedFullyTested:true,code,noAssertionsWeakened:true,loadable:0,dbWrites:0});
const rows=old.groups.flatMap(g=>g.candidates),bindings=[],seen=new Set();let references=0;
function check(row){
  const x=bindCandidate(row.candidate.path);
  assert.equal(x.candidateFileSha256,row.candidate.sha256);
  for(const k of ['candidateDigest','studentDigest','assetDigest'])assert.equal(x[k],row[k]);
  assert.equal(digest(x.candidate.metadata),row.metadataDigest);
  assert.equal(digest(x.candidate.sourceReference),row.sourceReferenceDigest);
  const exact=digest({content:x.candidate.content,choices:x.candidate.choices,score:x.candidate.score,assets:x.assets.map(a=>a.svgSha256)});
  assert(!seen.has(exact));seen.add(exact);
  for(const k of ['report','verificationManifest','blindManifest','solve','seal']){
    const r=row.review?.[k];if(r?.path&&r.sha256){assert.equal(ref(r.path).sha256,r.sha256);references++;}
  }
  bindings.push({id:row.twinExternalId,candidate:row.candidate,studentDigest:x.studentDigest,
    candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,metadataDigest:row.metadataDigest,
    sourceReferenceDigest:row.sourceReferenceDigest,exactStudentSurfaceDigest:exact});
}
for(const row of rows)check(row);assert.equal(references,275);
const root=b+'gachang-next2-review-20261020-r3/',exam='Gachang-2025-sem1-final-group2';
const authors=[4,5].map(n=>({n,path:b+`gachang-next2-authoring-20261020-r3/gachang/q0${n}.json`}));
const ai=root+'current-author-index-v49-r1.json',summaryPath=root+'current-author-summary-v49-r1.json';
write(ai,{questions:authors.map(({n,path})=>({n,id:readJson(path).twinExternalId,candidate:path,sha256:ref(path).sha256}))});
const summary=summarizeReviewedBatch(ai,[root]);
assert.equal(summary.counts.mathematicalVerified,2);assert.equal(summary.counts.gradeReviewed,2);
assert.equal(summary.counts.contentReviewPassed,0);write(summaryPath,summary);
const added=authors.map(({n,path})=>{
  const x=bindCandidate(path),q=x.candidate,r=summary.questions.find(z=>z.n===n);
  const row={exam,questionNumber:n,twinExternalId:q.twinExternalId,authorId:q.authorId,candidate:ref(path),
    candidateDigest:x.candidateDigest,studentDigest:x.studentDigest,assetDigest:x.assetDigest,
    metadataDigest:digest(q.metadata),sourceReferenceDigest:digest(q.sourceReference),score:q.score,
    questionType:q.questionType,figureInstances:x.assets.length,newTables:q.metadata.figureAuthoring.newTables,
    searchMetadata:q.metadata,sourceReference:q.sourceReference,variantDelta:q.variantDelta,
    variantDeltaDigest:digest(q.variantDelta),fullVerified:false,loadable:false,
    review:{authorCandidateDigest:x.candidateDigest,frozenCandidateDigest:r.candidateDigest,
      pathRelocationVerifiedByStrictSummary:true,status:'Current math and seven grade surfaces reviewed; family/source/rights/similarity/native held',
      mathematicalVerified:r.mathematicalVerified,gradeReviewed:r.gradeReviewed,contentReviewPassed:false,
      unitFamilyFit:false,summary:ref(summaryPath),report:r.reportFile,verificationManifest:r.verificationManifest,
      blindManifest:r.blindManifest,solve:r.independentSolveFile,seal:ref(root+'verification/sealed-raw-commit.json'),
      workerRawCommit:'85a11fa80b44b324ea3850140db9f1aaffd5665a',
      parentRawCommit:'6a3b70fcb1676d8fe1d03e1f81d4c99a73dde525',
      fullReviewCommit:'c5b3f32bd3529299ae2d8c387ff8facd768e8b7b',newIndependentBlindSolve:true,
      initialRawTextOnlyVisualLimitationPreserved:true,laterFourPNGsReviewedWithoutNewSolveCredit:true,
      priorOriginalComponentExposureDeclared:true,wholeCorpusBlindClaim:false,loadable:false}};
  check(row);return row;
});
assert.equal(bindings.length,172);assert.equal(references,285);
assert.equal(new Set(bindings.map(r=>r.id)).size,172);
const groupIndex=b+'gachang-group2-current-candidate-index-v49.json';
write(groupIndex,{exam,createdAt:utc,questions:authors.map(({n,path})=>({n,id:readJson(path).twinExternalId,candidate:path,sha256:ref(path).sha256})),loadable:0});
const groups=[...old.groups,{exam,index:ref(groupIndex),authored:2,pointTotal:7,figureInstances:0,newTables:2,candidates:added,latestIndependentReviews:[ref(summaryPath)]}];
const counts={...prior.counts,authoredCurrentCandidates:172,currentFigureInstances:116,recreatedStatTables:27,
  preExposureRawSolvesBoundToCurrentCandidates:172,currentRawSolved:171,independentMathReviewed:171,
  independentFullGradeReviewed:171,contentReviewHeld:156};
assert.equal(counts.contentReviewPassed+counts.contentReviewHeld,171);
const binding=e+'current172-binding-audit-r1.json',working=e+'working-candidates-20261020-r37.json';
const index=b+'current-authored-batches-v49.json',engine=b+'engine-upgrades-progress-r41.json';
const ledger=b+'status-ledger-v49.json',continuation=b+'continuation-index-v49.json';
const report='docs/planning/tracks/reports/exam-twin-engine-checkpoint-v49-20261020.md';
write(binding,{utc,currentCandidates:172,rows:bindings,currentReviewFileReferences:285,
  old170And275ReviewRefsUnchanged:true,allCandidateStudentAssetMetadataSourceHashesMatch:true,
  exactBodyChoicesScoreAssetDuplicateGroups:[],semanticSimilarityApproved:false,rightsApproved:false,dbWrites:0});
const drafts=[3,6].map(n=>{
  const p=b+`gachang-group3-authoring-20261020-r2/gachang/q0${n}.json`,x=bindCandidate(p);
  return {candidate:ref(p),id:x.candidate.twinExternalId,candidateDigest:x.candidateDigest,
    studentDigest:x.studentDigest,assetDigest:x.assetDigest,independentFullReviewPending:true};
});
const sourceReceipts=['n-filename-discovery-20261020-r2','n-discovered-metadata-proposals-20261020-r1',
  'n-discovered-reference-byte-audit-20261020-r1','unpaired-hwp-observation-audit-20261020-r1',
  'n-discovered-hwp-first2-quarantine-20261020-r1','n-discovered-first2-header-labels-20261020-r2']
  .map(n=>ref(b+n+'/aggregate-receipt.json'));
write(working,{utc,canonicalSelected:172,canonicalMathGrade:171,actualAuthored:174,
  additionalUnselectedAuthored:2,canonicalFigures:116,actualFigures:117,canonicalTables:27,actualTables:28,
  builtinImagegenRasters:2,drafts,studentOnlyTransport:ref(e+'gachang-group3-student-only-transport-r2.json'),
  newTwoIndependentFullReviewPending:true,renderPendingMemoryFloorOrHeavyQueue:true,
  U62R2Independent:ref(auditPath),U62Finite26NotManualTwins:true,canonicalSourceObservationsUnchanged:12080,
  sourceReceipts,quarantinedHwpParentsUnverified:2099,new48NotAddedTo12080:true,
  sourceIdentityAndMixedHeaderFooterDateLabelsHeld:true,loadable:0,dbWrites:0,wholeGoalComplete:false});
write(index,{...old,version:49,createdAt:utc,previous:ref(b+'current-authored-batches-v48.json'),groups,counts,
  currentIdsDigest:digest(bindings.map(r=>r.id).sort()),newManualCandidateIds:added.map(r=>r.twinExternalId),
  latestIndependentSummaries:[...old.latestIndependentSummaries,ref(summaryPath)],latestBindingAudit:ref(binding),
  previous170SelectionsUnchanged:true,additionalUnselectedAuthored:2,workingDrafts:ref(working)});
const main={ref:git('rev-parse','origin/main'),testedHead:git('rev-parse','HEAD'),validation:ref(validation),coauthorChangesPreserved:true,featurePushPending:true};
const u62={id:'U62',area:'Inverse equation-degree target with unique coefficient, finite verifier and grade/release gates',
  status:'implemented-current26-independent-math-grade-and934-controls-passed-public-held',
  code:parentU62.code.map(r=>ref(r.path)),rawCommit:'18f924cba009bfb3dd2cc3a507122bd7aeb0f3b0',
  rawRootSeal:'d13f12999c228357212266f070ac9d6d8f7cc5ba',independentR1:ref(b+'inverse-equation-degree-code-audit-20261020-r1/own-audit-report-r1.json'),
  independentR2:ref(auditPath),independentR2Commit:'05df4bb33efcba9e76de148ea6fb8ff4fdbf1894',
  finitePrintedCases:26,wholeCurrentSolutionsReviewed:26,currentGradeSurfaces:182,ownAssertions:934,
  priorRaw421R1AndParentTestsNotSummed:true,oldMetadataAndKoreanFindingsPreserved:true,
  notGeneralSymbolicVerifier:true,newManualTwins:0,actualLiveFamily:null,rightsApproved:false,
  future2027M3And2022Held:true,publicReleaseApproved:false,loadable:false};
write(engine,{...eng,kind:'exam-engine-upgrades-progress/v41',version:41,createdAt:utc,
  previous:ref(b+'engine-upgrades-progress-r40.json'),report,code,items:[...eng.items,u62],currentCounts:counts,
  currentCandidateIndex:ref(index),newAuthoredProblems:2,actualAuthoredIncludingUnselectedDrafts:174,
  additionalUnselectedAuthored:2,workingDrafts:ref(working),sourceReceipts,latestMainIntegration:main,
  validations:{...eng.validations,latestMain:ref(validation),currentManualBindingAudit:ref(binding),latestDegreeFactoryIndependent:ref(auditPath)},
  checkpointDelta:'172selected/171math-grade/15contentpassed156held/old1pending/final0;actual174with2drafts. U62R2 finite26 NOT26manual twins; public release held. New N metadata/routes/quarantine are not content certifications.',
  wholeEngineComplete:false,wholeExtractionComplete:false,dbWrites:0,deployed:false});
write(ledger,{...prior,kind:'execution-status-ledger/v49',version:49,createdAt:utc,previousLedger:ref(b+'status-ledger-v48.json'),
  counts,currentIndex:ref(index),engine:ref(engine),workingDrafts:ref(working),actualAuthoredIncludingUnselectedDrafts:174,
  latestMainIntegration:main,sourceReceipts,countsBasis:'172current selected/171independent math-grade/15contentpassed156held/old1pending/final0. Actual174 includes2notyetreviewed;26finiteenginecases separate.12080sourceobservations unchanged;2099HWPquarantine observations unapproved.',wholeGoalComplete:false});
write(continuation,{...ci,kind:'exam-continuation-index/v49',version:49,createdAt:utc,
  previousIndex:ref(b+'continuation-index-v48.json'),statusLedger:ref(ledger),currentCandidateIndex:ref(index),engine:ref(engine),
  counts,progressReport:report,workingDrafts:ref(working),actualAuthoredIncludingUnselectedDrafts:174,
  latestMainIntegration:main,sourceReceipts,nextActions:[
    'Finish current Gachangq3q6 student-only raw Git seals before private exposure; one heavy render at a time and inspect fresh geometry/table PNGs once memory>=3GiB.',
    'Continue new2025+metadata/content correspondence routes when originals accessible; local header2025/practicefooter26 does not authorize automatic source year or semester correction.',
    'Continue exact family/source identity/rights/similarity/native and useful engine work; individual holds must not stop other available work.',
    'Before every feature checkpoint push fetch both main/target and enforce ancestry, integrate preservation and relevant revalidation; no forcepush or main deployment.'
  ],wholeGoalComplete:false});
write(e+'canonical-v49-finalization-r1.json',{utc,counts,current172And285ReviewRefsBound:true,
  currentCodeFiles:105,previous170BindingsUnchanged:true,U62R2Independent934Passed:true,
  actualAuthored174TwoDraftsNotIndependentlyApproved:true,currentMainRelatedTestFiles:41,
  currentMainRelatedTestsPassed:v.currentPassed,sourceReceipts,dbWrites:0,loadable:0,wholeGoalComplete:false});
console.log(JSON.stringify({counts,actualAuthored:174,codeFiles:105,wholeGoalComplete:false}));
