import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { generateMiddleProblem,generateMiddleSet } from '@/lib/middle/generate';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';

it('seals144 final picture-only inputs without raw data or answer exposure',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-final-20261022-r1/';
 const prior='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-lattice-20261022-r1/';
 const types=['06','07','08','09','10','11','12','14','15'];
 const source=['src/lib/middle/m3Stat2.ts','src/lib/middle/generate.ts','src/lib/middle/studentInputIdentity.ts','src/lib/examStudy/adapters.ts','scripts/figure/elem_advanced.py','scripts/figure/engine-catalog.json','src/lib/figure/renderFigureSpec.ts','src/lib/figure/mathjaxSubstitute.ts'];
 const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
 const hashes=()=>Object.fromEntries(source.map(p=>[p,hash(fs.readFileSync(p,'utf8'))]));
 const before=hashes();const rows=[],student=[];
 const old=JSON.parse(fs.readFileSync(prior+'actual-current-private.json','utf8'));
 const oldById=new Map<string,{svg:{file:string;sha256:string}|null}>(old.rows.map((r:{id:string;svg:{file:string;sha256:string}|null})=>[r.id,r]));
 for(const type of types)for(let i=0;i<16;i++){
  const key=`3-2|상자그림과 산점도|${type}`,seed=20261022+i*7919,id=`${type}-s${i}`;
  const output=generateMiddleProblem(key,seed);
  expect(output.content).not.toContain('$(x, y)$:');
  const result=await renderFigureSpec(output.figureSpec,{strict:true});expect(result.ok,JSON.stringify(result)).toBe(true);
  if(!result.ok)throw Error(result.error);
  const file=`actual-${id}.svg`;fs.writeFileSync(out+file,result.svg,{flag:'wx'});
  const svg={file,sha256:hash(result.svg)};const oldSVG=oldById.get(id)!.svg;
  if(oldSVG)expect(result.svg).toBe(fs.readFileSync(prior+oldSVG.file,'utf8'));
  rows.push({id,key,seed,variant:0,familyId:`legacy:mid:${key}`,familyVersion:'20261022-scatter-grid-reading-without-coordinate-lists-r2',output,svg,priorSVGExact:oldSVG?true:null});
  // Student packet deliberately has no seed, figureSpec, points, answer, solution or facts.
  student.push({id,key,course:output.grade,unitSection:output.unitSection,content:output.content,svg});
 }
 const sets=types.map(type=>({key:`3-2|상자그림과 산점도|${type}`,seed:20261022,variantStart:0,output:generateMiddleSet(`3-2|상자그림과 산점도|${type}`,20261022,10)}));
 expect(hashes()).toEqual(before);
 const privateJSON=JSON.stringify({technicalOnly:true,newQuestionCredits:0,dbWrites:0,sourceSHA256:before,sourcesUnchanged:true,rows,sets},null,2)+'\n';
 const studentJSON=JSON.stringify({technicalOnly:true,newQuestionCredits:0,answersExposed:false,rawCoordinatesExposed:false,method:'Recover given data from actual SVG ticks and point disks; no pixel oracle',rows:student},null,2)+'\n';
 fs.writeFileSync(out+'actual-current-private.json',privateJSON,{flag:'wx'});
 fs.writeFileSync(out+'student-inputs-sealed.json',studentJSON,{flag:'wx'});
 fs.writeFileSync(out+'capture-seal.json',JSON.stringify({utc:new Date().toISOString(),sourceSHA256:before,privateSHA256:hash(privateJSON),studentSHA256:hash(studentJSON),actualAPI:rows.length,actualStrictSVG:rows.length,priorSVGExact:rows.filter(r=>r.priorSVGExact).length,sets:sets.length,operationalLoads:0},null,2)+'\n',{flag:'wx'});
});
