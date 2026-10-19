import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',r=b+'nobyeon-sem1-review-20261019-r1/';
const ref=path=>({path,sha256:sha256(fs.readFileSync(path))}),write=(path,x)=>fs.writeFileSync(path,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const createdAt=new Date().toISOString(),old=readJson(b+'current-authored-batches-v20.json'),summary=readJson(r+'current-author-summary-parent-r1.json');
assert.equal(summary.counts.mathematicalVerified,1);assert.equal(summary.counts.gradeReviewed,1);assert.equal(summary.counts.contentReviewHeld,1);assert.equal(summary.counts.contentReviewPassed,0);
const q=summary.questions[0];
const counts={...old.counts,independentMathReviewed:115,independentFullGradeReviewed:115,contentReviewHeld:100,awaitingCollectedIndependentReview:1};
for(const row of old.groups.flatMap(g=>g.candidates)){
 const bound=bindCandidate(row.candidate.path);assert.equal(bound.candidateFileSha256,row.candidate.sha256);
 for(const k of ['studentDigest','assetDigest','candidateDigest'])assert.equal(bound[k],row[k]);
}
const groups=old.groups.map(g=>g.exam!=='Nobyeon-2025-sem1'?g:{...g,latestIndependentReview:ref(r+'current-author-summary-parent-r1.json'),candidates:g.candidates.map(c=>{
 assert.equal(c.twinExternalId,q.twinExternalId);assert.equal(c.candidateDigest,q.authorCandidateDigest);
 return{...c,review:{...c.review,status:'math-pass;seven-surface-grade-pass;content-classification-held',mathematicalVerified:true,gradeReviewed:true,contentReviewPassed:false,unitFamilyFit:false,summary:ref(r+'current-author-summary-parent-r1.json'),report:q.reportFile,verificationManifest:q.verificationManifest,blindManifest:q.blindManifest,solve:q.independentSolveFile,loadable:false}};
})});
const index=b+'current-authored-batches-v21.json';write(index,{...old,version:21,createdAt,groups,counts,previous:ref(b+'current-authored-batches-v20.json'),sameCurrent116IdsAndAuthorBytes:true,latestIndependentSummaries:[...old.latestIndependentSummaries,ref(r+'current-author-summary-parent-r1.json')]});
const oldEngine=readJson(b+'engine-upgrades-progress-r12.json'),engine=b+'engine-upgrades-progress-r13.json';
write(engine,{...oldEngine,kind:'exam-engine-upgrades-progress/v13',version:13,createdAt,previous:ref(b+'engine-upgrades-progress-r12.json'),currentCandidateIndex:ref(index),currentCounts:counts,newAuthoredProblems:0,
 checkpointDelta:'Collect exact-current q06 independent math and all7grade surfaces; retain unitFamilyFit/source/rights/native holds. No author file, raw proof or engine implementation change in this ledger step.',
 validations:{...oldEngine.validations,latestManualReview:ref(r+'current-author-summary-parent-r1.json')},
 upcomingWork:{target:ref('src/lib/middle/m3Root.ts'),status:'independent-baseline-audit-running;not-yet-fixed',scope:'Root-table09 rounds a root to three decimals but prints an exact equality. Preserve baseline, implement versioned approximate wording and exhaustive checks next.'},wholeEngineComplete:false,wholeExtractionComplete:false,dbWrites:0});
const prior=readJson(b+'status-ledger-v20.json'),ledger=b+'status-ledger-v21.json';write(ledger,{...prior,kind:'execution-status-ledger/v21',version:21,createdAt,previousLedger:ref(b+'status-ledger-v20.json'),currentIndex:ref(index),engine:ref(engine),counts,latestIndependentReviews:[...prior.latestIndependentReviews,ref(r+'current-author-summary-parent-r1.json')],wholeGoalComplete:false});
write(b+'continuation-index-v21.json',{...readJson(b+'continuation-index-v20.json'),kind:'exam-continuation-index/v21',version:21,createdAt,previousIndex:ref(b+'continuation-index-v20.json'),statusLedger:ref(ledger),currentCandidateIndex:ref(index),engine:ref(engine),counts,progressReport:'docs/planning/tracks/reports/exam-twin-checkpoint-v21-20261019.md',nextActions:['Complete independently reproduced root-table exact/approximate correction in actual engine code and exhaustively verify current printed tuples.',
 'Continue remaining local2025+ source twins and metadata. Preserve q06 family/source/rights/native hold and q18 pending; no whole-goal pause.',
 'The current reviewer accidentally read the whole original paper manifest AFTER q06 raw sealing. Its future blind tasks for that paper require a fresh unexposed reviewer/session, or explicit exposure hold. Preserve its current code-audit checkout/evidence.',
 'Continue checkpoint commit/push after fresh target/main fetch and relevant integration checks.'],wholeGoalComplete:false});
console.log(JSON.stringify(counts));
