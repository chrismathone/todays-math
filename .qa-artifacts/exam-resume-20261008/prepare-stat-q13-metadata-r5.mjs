/** New unselected metadata repair candidate; never mutate captured r4 or its review. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,digest,sha256,SURFACES} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const previousPath=base+'gyeongsang-stat-authoring-r1/candidates-r4/q13/candidate.json';
const previous=bindCandidate(previousPath),candidate=structuredClone(previous.candidate);
const wrong='평균에서 각 관측값을 뺀 차이',correct='각 관측값에서 평균을 뺀 차이';
const changedFields=[];
function correctAt(object,key,field) {
 assert.equal(object[key].split(wrong).length-1,1,'Expected exactly one captured metadata phrase: '+field);
 const before=object[key];object[key]=before.replace(wrong,correct);
 changedFields.push({field,before,after:object[key]});
}
correctAt(candidate.variantDelta,'sharedProcedure','variantDelta.sharedProcedure');
correctAt(candidate.curriculumReview,'allowedProcedure','curriculumReview.allowedProcedure');
for(const surface of SURFACES)correctAt(candidate.curriculumReview.surfaces[surface],'evidence',`curriculumReview.surfaces.${surface}.evidence`);
assert.equal(changedFields.length,9);
candidate.twinExternalId='exam-twin-gyeongsang-2025-2-mid-author-r5-q13';
candidate.review={...candidate.review,status:'pending',mathematicalCorrectness:'pending-current-version-independent-review',gradeCurriculum:'pending-current-version-independent-review'};
candidate.independentVerification=null;candidate.directUseAllowed=false;
const out=base+'gyeongsang-q13-metadata-repair-r5';fs.mkdirSync(out,{recursive:true});
const file=out+'/candidate.json';fs.writeFileSync(file,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
const binding=bindCandidate(file);
assert.equal(binding.validation.structurallyValid,true);
const keys=['questionNumber','content','choices','answer','solution','score','questionType','facts','figureArtifacts','sourceReference','metadata','schoolNamePolicy'];
for(const key of keys)assert.deepEqual(candidate[key],previous.candidate[key]);
const surfaces=c=>Object.fromEntries(['content','choices','answer','solution','score','questionType','figureArtifacts'].map(k=>[k,c[k]]));
assert.equal(digest(surfaces(candidate)),digest(surfaces(previous.candidate)));
assert.notEqual(binding.studentDigest,previous.studentDigest,'New ID is part of student contract: old raw solve must not be rebound automatically');
assert.equal(sha256(fs.readFileSync(previousPath)),previous.candidateFileSha256);
const receipt={kind:'unselected-nonstudent-metadata-repair/v1',createdAt:new Date().toISOString(),previous:{path:previousPath,sha256:previous.candidateFileSha256,twinExternalId:previous.candidate.twinExternalId,studentDigest:previous.studentDigest,candidateDigest:previous.candidateDigest},replacement:{path:file,sha256:binding.candidateFileSha256,twinExternalId:candidate.twinExternalId,studentDigest:binding.studentDigest,candidateDigest:binding.candidateDigest,assetDigest:binding.assetDigest,metadataDigest:digest(candidate.metadata),variantDeltaDigest:digest(candidate.variantDelta)},changedFields,studentMathematicalSurfacesDigest:digest(surfaces(candidate)),studentMathematicalSurfacesUnchanged:true,sourceAndOriginalAuthorEvidenceUnchanged:true,relativeOriginalAuthorEvidenceContract:'Captured metadata.authorEvidence paths retain their original source authoring context; no claim they were executed anew under this repair directory.',oldRawSolveOrReviewEdited:false,oldApprovalTransferred:false,currentSelectionChanged:false,currentAuthoredCountDelta:0,freshReviewRequired:true,liveFamily:null,rights:'held',native:'held',fullVerified:false,loadable:false,dbWrites:0};
fs.writeFileSync(out+'/repair-receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({changedFields:changedFields.length,currentSelectionChanged:false,structurallyValid:binding.validation.structurallyValid,loadable:false}));
