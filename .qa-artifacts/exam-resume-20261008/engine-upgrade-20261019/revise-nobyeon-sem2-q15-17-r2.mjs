import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',from=b+'nobyeon-sem2-authoring-group5-r1/',to=b+'nobyeon-sem2-authoring-group5-r2/';
fs.mkdirSync(to);
for(const n of [15,16,17]){
 const name='q'+n,prior=from+name+'.json',q=readJson(prior),old=bindCandidate(prior);
 const replace=s=>s.replaceAll('A~E','A부터 E까지').replaceAll('A~G','A부터 G까지').replaceAll('A~H','A부터 H까지');
 q.content=replace(q.content);q.solution=replace(q.solution);q.twinExternalId=q.twinExternalId.replace('group5-r1-','group5-r2-');q.sourceReference.newSourceReferenceId=q.sourceReference.newSourceReferenceId.replace('group5-r1-','group5-r2-');
 q.metadata.figureAuthoring.reproductionScript=b+'engine-upgrade-20261019/revise-nobyeon-sem2-q15-17-r2.mjs';
 for(const suffix of ['.figure.spec.json','.figure.svg'])fs.copyFileSync(from+name+suffix,to+name+suffix,fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(to+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const now=bindCandidate(to+name+'.json');assert.equal(now.assetDigest,old.assetDigest);assert.deepEqual(now.validation.studentMathNotationWarnings,[]);assert.equal(now.validation.metadataAnswerFormatMismatch,false);
 fs.writeFileSync(to+name+'-revision-receipt-r1.json',JSON.stringify({utc:new Date().toISOString(),prior:{path:prior,sha256:old.candidateFileSha256},current:{path:to+name+'.json',sha256:now.candidateFileSha256},reason:'Actual student raster dropped range tilde; use explicit Korean participant ranges before first blind exposure.',studentTextChanged:true,mathAndAnswerUnchanged:true,assetBytesUnchanged:true,newFiguresNotDoubleCounted:true,blindExposedBeforeRevision:false,loadable:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({currentAuthored:3,supersededPreserved:3,newAdditionalLogicalFigures:0,blindPending:true,loadable:0}));
