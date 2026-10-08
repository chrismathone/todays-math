import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bindCandidate,digest,sha256} from '../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const authorRoot=base+'gyeonggu-authoring-r1/';
const sourceRoot=base+'next-five-extraction-r1/gyeonggu/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const bound=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const oldPath=authorRoot+'evidence/source-provisional/questions.json';
const finalPath=sourceRoot+'packet/questions.json';
const old=read(oldPath),final=read(finalPath),index=read(authorRoot+'candidate-index.json');
const cropAudit=read(base+'gyeonggu-source-crop-containment-r1.json');
const consideration=read(authorRoot+'consideration-ledger.json');
assert.equal(old.examId,final.examId);
assert.equal(old.questions.length,23);assert.equal(final.questions.length,23);
const rows=final.questions.map(q=>{
  const prior=old.questions.find(x=>x.number===q.number);assert(prior);
  const textFields=['stem','choices','hwpScriptStem','hwpScriptChoices','sharedContext'];
  const changedFields=textFields.filter(k=>digest(prior[k]??null)!==digest(q[k]??null));
  if(q.number===5){
    assert.deepEqual(changedFields,['stem','hwpScriptStem']);
    for(const k of changedFields)assert.equal(prior[k],q[k]+'\n\n°');
  }else assert.deepEqual(changedFields,[]);
  const crop=cropAudit.records.find(x=>x.questionNumber===q.number);assert(crop?.oldRGBIsExactContainedWindow);
  for(const image of q.images)assert.equal(sha256(fs.readFileSync(path.join(sourceRoot,'packet',image.file))),image.sha256);
  const oldScore=prior.scoreOccurrences.find(x=>x.parentTotalMarked)?.value??prior.scoreOccurrences[0]?.value;
  assert.equal(oldScore,q.scoreEvidence.referenceParentScore);
  const proposal=index.candidates.find(x=>x.questionNumber===q.number);
  const result={questionNumber:q.number,originalQuestionId:q.sourceQuestionId,finalSourceContentDigest:q.sourceContentDigest,provisionalQuestionDigest:digest(prior),finalQuestionDigest:digest(q),changedOriginalTextFields:changedFields,sourceImageLocations:{prior:prior.images,final:q.images},cropComparison:crop,originalScore:oldScore,finalSourceHolds:q.sourceAmbiguityHolds,sourceCandidateMeaningReview:{decision:q.number===5?'removed isolated trailing degree extraction artifact; mathematical expressions/order/choices unchanged':'student source statement,choices and sharedcontext unchanged; original crop RGB fully contained in final crop',visualInspection:crop.sameBytes?'unchanged captured crop':'Root viewed final expanded crop; only restored left margin, no altered inner question or mathematical givens',notGradeOrRightsApproval:true}};
  if(proposal){
    const b=bindCandidate(path.join(authorRoot,proposal.candidatePath));
    for(const k of ['candidateFileSha256','candidateDigest','studentDigest','assetDigest'])assert.equal(b[k],proposal[k]);
    Object.assign(result,{twinExternalId:b.candidate.twinExternalId,authorCandidate:bound(b.candidateFile),candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,newScore:b.candidate.score,authorSourceSnapshotPreserved:true,sourceSnapshotRelation:'exact captured provisional input; effective final source joined separately',sourceMathLiteralAccuracyHold:q.number===6?'source sin32 literal0.5229 retained; independently generated new trig table requires fresh numerical check':null});
  }else{assert.equal(q.number,20);result.preAuthorExclusion={record:consideration.ledger.find(x=>x.questionNumber===20),evidence:bound(authorRoot+'consideration-ledger.json')};}
  return result;
});
const result={kind:'source-author-version-join/v1',examId:final.examId,sourceWorkerCommit:'4cc9278da',authorCommit:'bf8b132fb1e78bbdb8f1b6e55e1db99d1321147d',sourceFinal:bound(finalPath),sourceProvisional:bound(oldPath),sourceFinalManifest:bound(sourceRoot+'source-manifest.json'),authorIndex:bound(authorRoot+'candidate-index.json'),authorFreeze:bound(authorRoot+'author-freeze.json'),cropAudit:bound(base+'gyeonggu-source-crop-containment-r1.json'),sourceParents:23,newAuthored:22,preAuthorExcluded:[20],originalPointTotal:rows.reduce((s,r)=>s+r.originalScore,0),newDraftPointTotal:rows.reduce((s,r)=>s+(r.newScore??0),0),mathAndGradeIndependentReviews:0,fullVerified:0,loadable:0,productionWrites:false,frozenInputsModified:false,nativeRightsSimilarityStillPending:true,rows};
assert.equal(result.originalPointTotal,100);assert.equal(result.newDraftPointTotal,93);
fs.writeFileSync(base+'gyeonggu-source-author-join-r1.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({sourceParents:23,newAuthored:22,excluded:[20],originalScore:100,newScore:93,isolatedExtractionArtifactOnly:5,exactSameCrops:12,expandedMarginCrops:11,allPriorRGBContainedExactly:true,fullVerified:0,loadable:0}));
