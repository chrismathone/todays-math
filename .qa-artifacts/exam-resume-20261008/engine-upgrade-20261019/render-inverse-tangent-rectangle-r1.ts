import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inverseTangentRectangle as family} from '../../../src/lib/examStudy/families/middle/inverseTangentRectangle';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
async function main(){
 const b='.qa-artifacts/exam-resume-20261008/',out=b+'inverse-tangent-rectangle-prototype-20261020-r1/';fs.mkdirSync(out);
 const sources=['src/lib/examStudy/families/middle/inverseTangentRectangle.ts','src/contracts/examStudy.contract.ts','src/lib/examStudy/requirements.ts','src/lib/examStudy/families/middle/index.ts','src/lib/examStudy/releaseEligibility.ts','src/__tests__/unit/examStudyInverseTangentRectangle.test.ts','src/__tests__/unit/examStudyInverseMinimum.test.ts'];
 const before=Object.fromEntries(sources.map(p=>[p,sha256(fs.readFileSync(p))])),students=[],privateDrafts=[];
 fs.writeFileSync(out+'source-before.json',JSON.stringify(before,null,2)+'\n',{flag:'wx'});
 for(let i=0;i<10;i++){
  const item=family.generate(0,i),name=`case${String(i+1).padStart(2,'0')}`;assert(family.verify(item).valid);
  fs.writeFileSync(out+name+'.spec.json',JSON.stringify(item.figureSpec,null,2)+'\n',{flag:'wx'});
  const result=await renderFigureSpec(item.figureSpec,{strict:true});
  if(!result.ok){fs.writeFileSync(out+name+'.failed.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});throw new Error(result.error);}
  assert.equal(result.droppedDimensions?.length??0,0);fs.writeFileSync(out+name+'.svg',result.svg,{flag:'wx'});
  const student={caseId:name,course:'중3',curriculum:'2015',format:'단답형',content:item.content,figure:{path:name+'.svg',sha256:sha256(Buffer.from(result.svg)),intendedWidthMm:70}};
  students.push({...student,studentDigest:sha256(JSON.stringify(student))});privateDrafts.push({caseId:name,draft:item,renderStrict:true,droppedDimensions:[]});
 }
 for(const[p,h]of Object.entries(before))assert.equal(sha256(fs.readFileSync(p)),h,p);
 fs.writeFileSync(out+'student-only10.json',JSON.stringify({kind:'review-only-engine-prototype-student-cases/v1',students,authorAnswersIncluded:false,newManualQuestions:0,newAuthoredFigureCounts:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(out+'private-drafts10.json',JSON.stringify({privateDrafts,sourceBefore:before,sourceAfter:before,newManualQuestions:0,newAuthoredFigureCounts:0,publicReleaseHeld:true,dbWrites:0},null,2)+'\n',{flag:'wx'});
 const dest='C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008/'+out;fs.mkdirSync(dest,{recursive:true});
 for(const name of ['student-only10.json',...students.map(s=>s.figure.path)])fs.copyFileSync(out+name,dest+name,fs.constants.COPYFILE_EXCL);
 console.log(JSON.stringify({actualStrictVectors:10,studentOnlyCopied:10,authorPrivateCopied:false,newManualQuestions:0,newCountedFigures:0}));
}
main().catch(err=>{console.error(err);process.exitCode=1;});
