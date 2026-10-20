/** Same two student problems; repair only the structured prerequisite metadata. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256,digest} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/';
const old=b+'gachang-group3-authoring-20261020-r2/gachang/';
const out=b+'gachang-group3-authoring-20261020-r3/gachang/';
const snapshot=e+'live-family-snapshot-r2.json',units=readJson(snapshot).units;
const ref=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const receipt=b+'gachang-group3-review-20261020-r2/own-review-evidence-r1/own-primary-unit-receipt.json';
const primary=readJson(receipt),multiply=units.find(u=>u.id==='e63d61c6-2b41-4c83-a74b-a605fd343c42');
assert(multiply && multiply.orderIndex===472 && primary.standards.some(s=>s.code==='9수02-12'));
assert.equal(primary.snapshotSHA256,ref(snapshot).sha256);
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});const rows=[];
for(const n of [3,6]){
  const file=`q0${n}.json`,before=bindCandidate(old+file),q=structuredClone(before.candidate);
  if(n===6){
    assert.equal(q.metadata.prerequisiteUnits.length,1);
    assert.equal(q.metadata.prerequisiteUnits[0].id,'1682f01b-5293-4672-91cd-07fc02e305ac');
    q.metadata.prerequisiteUnits.push(multiply);
    q.metadata.prerequisiteAchievementStandardRefs=[{
      curriculumEdition:'2015',standardCode:'9수02-12',unitId:multiply.id,
      role:'Required previously learned perfect-square multiplication; target remains square-root properties.',
      primaryAndUnitReceipt:ref(receipt),unitSnapshot:ref(snapshot),
    }];
    q.metadata.placementConditions={...q.metadata.placementConditions,
      requiresLearnedUnitIds:q.metadata.prerequisiteUnits.map(u=>u.id),
      laterPrerequisiteUnitId:multiply.id,requiresPrerequisiteLearningEvidence:true,
      capturedOrderIndexIsNotStudentMastery:true,
      placementReviewStatus:'pending-actual-student-prerequisite-evidence-no-automatic-placement',
      sourceSchoolPacingIsNotPermission:true,
    };
    q.metadata.metadataRevision={id:'gachang-group3-q06-prerequisite-unit-r3',
      kind:'complete-structured-required-later-unit-without-changing-student-mathematics',
      previousCandidate:ref(old+file),independentFinding:ref(b+'gachang-group3-review-20261020-r2/own-review-evidence-r1/own-review-report-r1.json'),
      changedPaths:['metadata.prerequisiteUnits','metadata.prerequisiteAchievementStandardRefs','metadata.placementConditions','metadata.metadataRevision'],
      actualMathVariantIdPreserved:true,studentAnswersSolutionsAndFiguresUnchanged:true,
      newBlindMathSolveClaim:false,requiresFreshMetadataReview:true,loadable:false};
    fs.writeFileSync(out+file,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
  }else fs.copyFileSync(old+file,out+file,fs.constants.COPYFILE_EXCL);
  for(const asset of before.assets)
    for(const source of [asset.sourceSpecPath,asset.sourceSvgPath])
      fs.copyFileSync(source,path.join(out,path.basename(source)),fs.constants.COPYFILE_EXCL);
  const after=bindCandidate(out+file);
  assert.equal(after.studentDigest,before.studentDigest);assert.equal(after.assetDigest,before.assetDigest);
  assert.equal(after.candidate.twinExternalId,before.candidate.twinExternalId);
  for(const k of ['content','choices','answer','solution','score','sourceReference','variantDelta','curriculumReview'])
    assert.equal(digest(after.candidate[k]),digest(before.candidate[k]));
  if(n===3)assert.equal(ref(out+file).sha256,ref(old+file).sha256);
  else assert.notEqual(after.candidateDigest,before.candidateDigest);
  rows.push({n,id:q.twinExternalId,before:ref(old+file),after:ref(out+file),studentDigest:after.studentDigest,
    assetDigest:after.assetDigest,previousCandidateDigest:before.candidateDigest,currentCandidateDigest:after.candidateDigest});
}
fs.writeFileSync(e+'gachang-group3-prerequisite-repair-r3.json',JSON.stringify({utc:new Date().toISOString(),
  rows,oldR2CandidatesReportsAndRawUntouched:true,q03ByteIdentical:true,q06OnlyStructuredPrerequisiteMetadataChanged:true,
  newMathVariants:0,newBlindSolves:0,actualTotalAuthoredStill174:true,
  nativePlacementEnforcementClaim:false,freshMetadataReviewPending:true,dbWrites:0,loadable:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({metadataRepaired:1,studentAndAnswersAndSolutionsAndAssetsUnchanged:true,newMathOrBlindCredits:0,dbWrites:0}));
