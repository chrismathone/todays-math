import fs from 'node:fs';
import path from 'node:path';
import { inverseEquationDegree as f, inverseEquationDegreeStudyMetadata as metadata } from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/examStudy/families/middle/inverseEquationDegree.ts';
import {studyReleaseHold} from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/examStudy/releaseEligibility.ts';
import {studyCurriculumHold} from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/examStudy/curriculumEligibility.ts';
const P=path.dirname(process.argv[1]); const read=(s:string)=>JSON.parse(fs.readFileSync(path.join(P,s),'utf8').replace(/^\uFEFF/,''));
const out:any[]=[]; const ck=(name:string,pass:boolean,detail?:any)=>out.push({name,pass,detail}); const clone=(v:any)=>structuredClone(v);
const producer=read('private/generated26.json').questions;
for(let n=0;n<26;n++){
 const d=f.generate(0,n); ck(`${n+1}/actual-root-generated-payload`,JSON.stringify(d)===JSON.stringify(Object.fromEntries(Object.entries(producer[n]).filter(([k])=>k!=='n'))));
 ck(`${n+1}/canonical-positive`,f.verify(d).valid);
 const mutants:any[]=[['target',{content:d.content.replace('일차방정식','이차방정식')}],['lhs',{content:d.content.replace('(ax-','(2ax-')}],['rhs',{content:d.content.replace('=ax+','=2ax+')}],['x2',{content:d.content.replace('x^2','x^3')}],['answer',{answer:'0'}],['numeric-answer',{answer:Number(d.answer)}],['solution',{solution:d.solution+' 따라서 다른 답도 가능하다.'}],['params',{parameters:{...d.parameters,r:9}}],['params-string',{parameters:{...d.parameters,r:String(d.parameters.r)}}],['params-extra',{parameters:{...d.parameters,extra:1}}],['params-null',{parameters:null}],['type',{questionType:'객관식'}],['difficulty',{difficulty:'응용'}],['basis',{difficultyBasis:[]}],['figure',{figureSpec:{}}],['rubric',{rubric:{}}],['distractors',{distractors:[]}],['format-text',{content:d.content+' '}],['zero-linear',{content:d.content.replace(/\$\(ax-[^$]+\$/, '$(ax-2)(x+1)=ax+2x^2-2x+1$')}]];
 for(const [name,change] of mutants) ck(`${n+1}/reject/${name}`,!f.verify({...clone(d),...change}).valid);
 for(const k of ['p','q','r','s','t']) {const v=clone(d);v.parameters[k]=NaN;ck(`${n+1}/NaN/${k}`,!f.verify(v).valid)}
 // Additional structurally irrelevant data is not a validated schema: observe only, do not call semantic approval.
}
for(const seed of [0,1,-1,25,-26,Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER])for(const variant of [0,1,25,26,Number.MAX_SAFE_INTEGER]) ck(`repro/${seed}/${variant}`,JSON.stringify(f.generate(seed,variant))===JSON.stringify(f.generate(seed,variant)));
for(const [seed,v] of [[NaN,0],[Infinity,0],[1.5,0],[0,-1],[0,NaN],[0,Infinity],[0,1.5],[Number.MAX_SAFE_INTEGER+1,0]]) {let threw=false;try{f.generate(seed,v)}catch{threw=true}ck(`invalid-seed/${seed}/${v}`,threw)}
const domain:any=f.paramDomain; const a=domain.enumerate(),b=domain.enumerate(); a[0].p=99;ck('domain-copy',b[0].p!==99&&domain.enumerate()[0].p!==99); const d=f.generate(0,0), params=f.canonicalParams(d); Object.assign(params,{r:99});ck('canonical-copy',d.parameters.r!==99);
for(const level of ['full','component'])for(const source of ['native','authored'])for(const id of [f.id,'renamed'])for(const version of ['1','approved','future']){const forged:any={...f,id,version,source,confidence:1,gradeApproved:true,curriculumApproved:true,nativeApproved:true,fulfills:[{requirement:'algebra.inverse-equation-degree',level}]};ck(`release/${level}/${source}/${id}/${version}`,studyReleaseHold(forged)?.status==='review-only-template');for(const course of ['초3','초4','초5','초6','중1','중2']) ck(`grade/${level}/${source}/${id}/${version}/${course}`,studyCurriculumHold({...forged,course})?.status==='excluded-required-out-of-grade-method');}
ck('metadata-held',metadata.liveFamilyKey===null&&!metadata.loadable&&!metadata.rightsApproved&&!metadata.nativeProvenanceApproved&&metadata.proposedCurriculumScope.proposalIsNotApproval);
fs.writeFileSync(path.join(P,'own-core-results.json'),JSON.stringify({runtime:'absolute current ROOT module + explicit ROOT/src @ alias; no parent tests run',checks:out,counts:{unique:out.length,passed:out.filter(x=>x.pass).length,failed:out.filter(x=>!x.pass).length}},null,2));console.log(JSON.stringify({count:out.length,failures:out.filter(x=>!x.pass)}));
