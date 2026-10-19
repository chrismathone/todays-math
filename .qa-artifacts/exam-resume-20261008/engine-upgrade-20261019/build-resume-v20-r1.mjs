import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256,digest} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/',e=base+'engine-upgrade-20261019/';
const ref=path=>({path,sha256:sha256(fs.readFileSync(path))});
const write=(path,x)=>fs.writeFileSync(path,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const createdAt=new Date().toISOString(),old=readJson(base+'current-authored-batches-v19.json');
for(const c of old.groups.flatMap(g=>g.candidates)){
 const b=bindCandidate(c.candidate.path);assert.equal(b.candidateFileSha256,c.candidate.sha256);
 for(const key of ['studentDigest','assetDigest','candidateDigest'])assert.equal(b[key],c[key]);
}
const path=base+'nobyeon-sem1-authoring-r1/candidates/q06.json',bound=bindCandidate(path),c=bound.candidate;
const raw=readJson(base+'nobyeon-sem1-clean-blind-20261019-r1/solve/q06.json');
assert.equal(raw.studentDigest,bound.studentDigest);assert.equal(raw.status,'solved');assert.notEqual(raw.solverId,c.authorId);
const row={questionNumber:c.questionNumber,twinExternalId:c.twinExternalId,authorId:c.authorId,candidate:ref(path),studentDigest:bound.studentDigest,assetDigest:bound.assetDigest,candidateDigest:bound.candidateDigest,metadataDigest:digest(c.metadata),sourceReferenceDigest:digest(c.sourceReference),score:c.score,questionType:c.questionType,figureInstances:0,newTables:1,searchMetadata:c.metadata,variantDelta:c.variantDelta,
 review:{status:'pre-exposure-raw-sealed;formal-review-pending',raw:ref(base+'nobyeon-sem1-clean-blind-20261019-r1/solve/q06.json'),workerRawCommit:'c3655bae8d8e4deacf2614e56ff4bd939e639fe9',parentTransportCommit:'fe86cd4bc1b7cd1c2100b6500de7ea818675d52a',seal:ref(base+'nobyeon-sem1-review-20261019-r1/verification/sealed-raw-commit.json')}};
const groupIndex=base+'nobyeon-sem1-authoring-r1/candidate-index-r1.json';
write(groupIndex,{kind:'authored-current-subset-index/v1',createdAt,exam:'Nobyeon-2025-sem1',authored:1,pointTotal:4,figureInstances:0,newTables:1,candidates:[row],fullVerified:0,loadable:0,dbWrites:0});
const groups=[...old.groups,{exam:'Nobyeon-2025-sem1',index:ref(groupIndex),authored:1,pointTotal:4,figureInstances:0,newTables:1,candidates:[row]}];
const all=groups.flatMap(g=>g.candidates);assert.equal(all.length,116);assert.equal(new Set(all.map(c=>c.twinExternalId)).size,116);
const counts={...old.counts,authoredCurrentCandidates:116,recreatedStatTables:6,preExposureRawSolvesBoundToCurrentCandidates:116,currentRawSolved:115,currentRawPending:1,awaitingCollectedIndependentReview:2,awaitingFirstSealedBlindSolve:0};
const native=readJson(e+'native-models-validation-r2.json');assert.equal(native.latestPassed,466);
for(const[p,h]of Object.entries(native.before))assert.equal(sha256(fs.readFileSync(p)),h,p);
const runs=['vitest-integration-r7.json','grade-gate-tests-r1.json','prepush-r9.json','native-models-tests-r1.json','native-models-tests-r2.json'];
const latest=new Map();for(const f of runs)for(const r of readJson(e+f).testResults)latest.set(r.name,r);
const assertions=[...latest.values()].flatMap(r=>r.assertionResults);assert(!assertions.some(r=>r.status==='failed'));
const vitest={files:latest.size,passed:assertions.filter(r=>r.status==='passed').length,failed:0,skipped:assertions.filter(r=>r.status==='skipped').length,
 latestPerFileRuns:runs.map(f=>ref(e+f)),scope:'Latest per-file composite, not a single all-files rerun. Native20file composite466 passed; the first broad run had465pass/1outdated exact-version allowlist, then that one test file was updated for the intentional seventh legacy revision and rerun. Production hashes unchanged.'};
assert.equal(vitest.files,66);assert.equal(vitest.passed,1132);assert.equal(vitest.skipped,0);
const indexPath=base+'current-authored-batches-v20.json';
const index={...old,version:20,createdAt,groups,counts,currentIdsDigest:digest(all.map(c=>c.twinExternalId).sort()),previous:ref(base+'current-authored-batches-v19.json'),previous115SelectionsUnchanged:true,newManualCandidateIds:[c.twinExternalId],engineValidation:ref(e+'native-models-validation-r2.json'),newRawSealedReview:row.review};
delete index.sameCurrent115IdsAndAuthorBytes;write(indexPath,index);
const prior=readJson(base+'engine-upgrades-progress-r11.json'),enginePath=base+'engine-upgrades-progress-r12.json';
const m2Audit=ref(base+'m2-integer-area-curriculum-audit-20261019-r1/audit-report.json');
const codePaths=[...new Set([...prior.code.map(c=>c.path),'src/lib/middle/m3.ts','src/lib/middle/m3Figures.ts'])];
const sourceAccess={nDriveAvailable:fs.existsSync('N:/개인/기출'),checkedAt:createdAt,allSourcesExtracted:false,scope:'Current process only; new manual candidate uses the previously retained r6 question-only component. No new source extraction or original edits.'};
write(enginePath,{...prior,kind:'exam-engine-upgrades-progress/v12',version:12,createdAt,previous:ref(base+'engine-upgrades-progress-r11.json'),
 currentCandidateIndex:ref(indexPath),currentCounts:counts,newAuthoredProblems:1,newImagegenRasters:0,
 code:codePaths.map(p=>({...ref(p),normalizedLfSourceSha256:sha256(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n'))})),
 checkpointDelta:'Actual native equal-chord inverse target and exact analytic feet; native written/rubric upgrade for34 process-demanding tuples plus phase clarification; one separately authored inverse root-table problem with new table and newly sealed independent raw solve. No new formal candidate math/grade approvals yet.',
 items:[...prior.items,
  {id:'U38',area:'Native inverse target and exact equal-chord geometry',productionStatus:'implemented-on-feature-independently-rechecked',change:'Existing family06 retains identity and gets versioned apex/base target inversion.42 finite tuples, high-precision true midpoints/perpendiculars/equal distances,42 actual strict SVG renders and70mm independent inspection. Original22 quantization failures retained; final repair changes coordinates, not acceptance tolerance.',audit:ref(base+'native-chord-inverse-audit-20261019-r2/audit-report.json')},
  {id:'U39',area:'Native process formats, rubrics and temporal assumptions',productionStatus:'implemented-on-feature-independently-audited',change:'Doubling12/wheel10/integer-area12 become actual native written with four2point criteria8total, exact model and rubric controls, incompatible formats unavailable. First growth at one period explicit; wheel method uses direct inverse circumference ratio. Actual source2025M2/2015 vs practice2026M2/2022 separately mapped; teaching-progress readiness remains a condition.',audit:ref(base+'remaining-native-written-audit-20261019-r1/audit-report.json'),curriculum:m2Audit}],
 validations:{...prior.validations,vitest,nativeModels:ref(e+'native-models-validation-r2.json'),nativeTypes:ref(e+'native-models-types-r2.log'),nativeLint:ref(e+'native-models-eslint-r2.log'),
  actualInverseChordTuples:42,independentAnalyticChord:ref(base+'native-chord-inverse-audit-20261019-r2/audit-report.json'),nativeWritten34:ref(base+'remaining-native-written-audit-20261019-r1/audit-report.json'),m2Curriculum:m2Audit,
  limitations:'One specific M1 hard exclusion remains. These bounded native audits do not certify all4220 registrations, every course/term, rights or the corpus. Engine tuple renders are not added to manual figure counts. New q06 raw proof is sealed but formal report not yet collected.',fullAppBuildValidated:false},
 integratedMainEngine:{...prior.integratedMainEngine,nativeModelGradeUpdate:m2Audit,allStudentSurfaceCurriculumCertified:false},
 sourceAccess,latestClosure:ref(e+'past-exam-closure-r3.json'),wholeEngineComplete:false,wholeExtractionComplete:false,dbWrites:0,operationalLoads:0,deployed:false});
const previousLedger=readJson(base+'status-ledger-v19.json'),ledgerPath=base+'status-ledger-v20.json';
write(ledgerPath,{...previousLedger,kind:'execution-status-ledger/v20',version:20,createdAt,previousLedger:ref(base+'status-ledger-v19.json'),counts,currentIndex:ref(indexPath),engine:ref(enginePath),currentSourceAccess:sourceAccess,latestClosure:ref(e+'past-exam-closure-r3.json'),newIndependentRawReview:row.review,wholeGoalComplete:false});
write(base+'continuation-index-v20.json',{...readJson(base+'continuation-index-v19.json'),kind:'exam-continuation-index/v20',version:20,createdAt,previousIndex:ref(base+'continuation-index-v19.json'),statusLedger:ref(ledgerPath),currentCandidateIndex:ref(indexPath),counts,engine:ref(enginePath),sourceAccess,latestClosure:ref(e+'past-exam-closure-r3.json'),progressReport:'docs/planning/tracks/reports/exam-twin-checkpoint-v20-20261019.md',
 nextActions:['Collect q06 formal math/grade/content review against this exact new candidate and sealed raw proof; preserve all source/family/rights/similarity/native holds.',
 'Continue actual within-grade twins from retained2025+ local sources while N process access is unavailable.',
 'Inspect finite root-table generator for rounded decimals incorrectly printed as exact equalities; implement and independently verify a versioned correction if reproduced.',
 'Continue useful engine/metadata/reproducibility work and checkpoint FF pushes after fresh target/main fetch/integration/checks.'],wholeGoalComplete:false});
console.log(JSON.stringify({counts,vitest,rawWorkerCommit:row.review.workerRawCommit,dbWrites:0}));
