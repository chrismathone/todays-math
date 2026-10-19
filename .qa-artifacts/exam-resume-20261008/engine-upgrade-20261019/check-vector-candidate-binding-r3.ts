import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
import {assertLocalReplayEnvironment,replayVectorCandidate} from '../../../scripts/import/exam-twin/vectorReplay.mjs';
async function main(){
 assertLocalReplayEnvironment(process.env);
 const b='.qa-artifacts/exam-resume-20261008/',out=b+'vector-replay-candidate-binding-20261020-r3/',original=bindCandidate(b+'gyeongsin-authoring-group4-r1/q06.json');fs.mkdirSync(out);
 const asset=original.assets[0],svg=fs.readFileSync(asset.sourceSvgPath,'utf8'),big=[...svg.matchAll(/<circle\b[^>]*\br="([\d.]+)"[^>]*>/gu)].sort((a,z)=>Number(z[1])-Number(a[1]))[0];assert.equal(Number(big[1]),78);const wrong=svg.replace(big[0],()=>big[0].replace(/\br="[\d.]+"/u,'r="79"'));
 const candidate=structuredClone(original.candidate);candidate.twinExternalId='exam-twin-control-pre-snapshot-race-q06';candidate.authorId='synthetic-pre-snapshot-control';candidate.metadata.controlOnly=true;candidate.figureArtifacts[0].specPath='figure.spec.json';candidate.figureArtifacts[0].svgPath='figure.svg';
 fs.writeFileSync(out+'candidate.json',JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});fs.writeFileSync(out+'figure.spec.json',fs.readFileSync(asset.sourceSpecPath),{flag:'wx'});fs.writeFileSync(out+'figure.svg',svg,{flag:'wx'});
 const target=path.resolve(out+'candidate.json'),read=fs.readFileSync,write=fs.writeFileSync;let reads=0,result,error,renderCalls=0;
 const protectedInputs=[original.candidateFile,asset.sourceSpecPath,asset.sourceSvgPath],before=Object.fromEntries(protectedInputs.map(p=>[p,sha256(read(p))]));
 // Simulate an external replacement immediately after binding reads the saved SVG.
 // Only this private copy is mutated, in this process; restore fs before recording evidence.
 fs.readFileSync=((file:fs.PathOrFileDescriptor,...args:unknown[])=>{const bytes=(read as Function)(file,...args);if(typeof file==='string'&&path.resolve(file)===target&&++reads===1)write(target,JSON.stringify({...candidate,twinExternalId:"exam-twin-replacement-candidate-control",content:"Different replaced content",answer:"99"}));return bytes;}) as typeof fs.readFileSync;
 try{result=await replayVectorCandidate(out+'candidate.json',async spec=>{renderCalls++;return renderFigureSpec(spec);});}catch(e){error=e;}finally{fs.readFileSync=read;}
 assert.equal(result,undefined);assert.match(String(error),/Input changed after binding/);assert.equal(renderCalls,0);
 for(const[p,h]of Object.entries(before))assert.equal(sha256(read(p)),h,p);
 fs.writeFileSync(out+'finding-r3.json',JSON.stringify({utc:new Date().toISOString(),finding:'R3 rejects controlled private candidate ID/content/answer replacement after first read before rendering or returning a valid receipt.',codeSha256:sha256(read('scripts/import/exam-twin/vectorReplay.mjs')),controlledReplacement:'Private candidate ID/content/answer replaced after binder first read; original copied vector unchanged',actualRendererAvailable:true,renderCalls,rejected:true,error:String(error),expectedBoundSvgSha256:asset.svgSha256,savedCopyAfterSha256:sha256(read(target)),sourceReads:reads,originalsBefore:before,originalsUnchanged:true,approvalsStillFalse:true,newManualQuestions:0,newAuthoredFigures:0,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({findingConfirmed:true,r3RejectedCandidateSemanticMismatch:true,onlyPrivateCopyMutated:true,dbWrites:0}));
}
main().catch(err=>{console.error(err);process.exitCode=1;});
