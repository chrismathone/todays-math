import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
async function main(){
 assert(!process.env.VERCEL,'Local replay only; never invoke hosted rendering from this probe');
 const b='.qa-artifacts/exam-resume-20261008/',out=b+'vector-render-replay-probe-20261020-r1/';fs.mkdirSync(out);
 const paths=[b+'gyeongsin-authoring-group4-r1/q06.json',b+'gyeongsin-authoring-group5-r2/q05.json'],rows=[];
 for(const file of paths){const c=bindCandidate(file);for(const[a,asset]of c.assets.entries()){const spec=readJson(asset.sourceSpecPath);assert.equal(spec.version,2);assert.equal(asset.resources?.length??0,0);const result=await renderFigureSpec(spec,{strict:true});assert(result.ok,result.ok?'':result.error);assert.equal(result.droppedDimensions?.length??0,0);const actual=sha256(Buffer.from(result.svg));fs.writeFileSync(out+`q${c.candidate.questionNumber}-${a+1}.replayed.svg`,result.svg,{flag:'wx'});rows.push({candidate:file,candidateFileSha256:c.candidateFileSha256,candidateDigest:c.candidateDigest,studentDigest:c.studentDigest,assetDigest:c.assetDigest,specSha256:asset.specSha256,expectedSvgSha256:asset.svgSha256,replayedSvgSha256:actual,exactByteParity:actual===asset.svgSha256,strict:true,droppedDimensions:[]});}}
 fs.writeFileSync(out+'receipt-r1.json',JSON.stringify({utc:new Date().toISOString(),rows,strictLocalRendererInvocations:rows.length,exactMatches:rows.filter(x=>x.exactByteParity).length,inputsModified:false,newManualQuestions:0,newAuthoredFigures:0,mathematicalApproval:false,gradeApproval:false,nativeReaderParity:false,rightsApproval:false,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({cases:rows.length,exactMatches:rows.filter(x=>x.exactByteParity).length,mathOrGradeApproval:false,newManualFigures:0}));
}
main().catch(err=>{console.error(err);process.exitCode=1;});
