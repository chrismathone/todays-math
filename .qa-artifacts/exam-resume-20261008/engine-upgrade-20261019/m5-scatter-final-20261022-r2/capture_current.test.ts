import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { generateMiddleProblem,generateMiddleSet } from '@/lib/middle/generate';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';

it('seals144 unseen picture-only inputs from new seeds without the prior point sets',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-final-20261022-r2/';
 const prior='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-lattice-20261022-r1/';
 const types=['06','07','08','09','10','11','12','14','15'];
 const source=['src/lib/middle/m3Stat2.ts','src/lib/middle/generate.ts','src/lib/middle/studentInputIdentity.ts','src/lib/examStudy/adapters.ts','scripts/figure/elem_advanced.py','scripts/figure/engine-catalog.json','src/lib/figure/renderFigureSpec.ts','src/lib/figure/mathjaxSubstitute.ts'];
 const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
 const hashes=()=>Object.fromEntries(source.map(p=>[p,hash(fs.readFileSync(p,'utf8'))]));
 const signature=(key:string,points:number[][])=>JSON.stringify([key,[...points].map(p=>[...p]).sort((a,b)=>a[0]!-b[0]!||a[1]!-b[1]!)]);
 const old=JSON.parse(fs.readFileSync(prior+'student-inputs-sealed.json','utf8'));
 const oldData=new Set<string>(old.rows.map((r:{key:string;figureSpec:{points:number[][]}})=>signature(r.key,r.figureSpec.points)));
 const seen=new Set<string>();
 const reservedSeeds=new Set([...Array.from({length:100},(_,i)=>20261022+i*3571),...Array.from({length:32},(_,i)=>20261022+i*7919),...Array.from({length:100},(_,i)=>20261021+i*7919)]);
 const before=hashes();const rows=[],student=[];let skipped=0;
 for(const type of types)for(let i=0;i<16;i++){
  const key=`3-2|상자그림과 산점도|${type}`,id=`${type}-fresh${i}`;
  let seed=20261022+104729+i*8191,output=generateMiddleProblem(key,seed),sig='';
  for(let tries=0;;tries++){
   if(tries>100)throw Error('fresh bounded sample space exhausted');
   sig=signature(key,output.figureSpec!.points as number[][]);
   if(!reservedSeeds.has(seed)&&!oldData.has(sig)&&!seen.has(sig))break;
   skipped++;seed++;output=generateMiddleProblem(key,seed);
  }
  seen.add(sig);expect(output.content).not.toContain('$(x, y)$:');
  const result=await renderFigureSpec(output.figureSpec,{strict:true});expect(result.ok,JSON.stringify(result)).toBe(true);
  if(!result.ok)throw Error(result.error);
  const file=`actual-${id}.svg`;fs.writeFileSync(out+file,result.svg,{flag:'wx'});
  const svg={file,sha256:hash(result.svg)};
  rows.push({id,key,seed,variant:0,familyId:`legacy:mid:${key}`,familyVersion:'20261022-scatter-grid-reading-without-coordinate-lists-r2',output,svg,priorPointSetExposed:false});
  // Only visible question text and vector figures. No seed/spec/points/answer/solution/facts.
  student.push({id,key,course:output.grade,unitSection:output.unitSection,content:output.content,svg});
 }
 const sets=types.map(type=>({key:`3-2|상자그림과 산점도|${type}`,seed:20261022+104729,output:generateMiddleSet(`3-2|상자그림과 산점도|${type}`,20261022+104729,10)}));
 expect(hashes()).toEqual(before);expect(seen.size).toBe(144);
 const privateJSON=JSON.stringify({technicalOnly:true,newQuestionCredits:0,dbWrites:0,sourceSHA256:before,sourcesUnchanged:true,rows,sets},null,2)+'\n';
 const studentJSON=JSON.stringify({technicalOnly:true,newQuestionCredits:0,answersExposed:false,rawDataCoordinatesExposed:false,priorPointSetExposed:false,method:'Read actual SVG numeric ticks and point disks; no raw data/spec or pixel oracle',rows:student},null,2)+'\n';
 fs.writeFileSync(out+'actual-current-private.json',privateJSON,{flag:'wx'});
 fs.writeFileSync(out+'student-inputs-sealed.json',studentJSON,{flag:'wx'});
 fs.writeFileSync(out+'capture-seal.json',JSON.stringify({utc:new Date().toISOString(),sourceSHA256:before,privateSHA256:hash(privateJSON),studentSHA256:hash(studentJSON),previousExposedInputSHA256:hash(fs.readFileSync(prior+'student-inputs-sealed.json','utf8')),actualAPI:rows.length,actualStrictSVG:rows.length,priorPointSetOverlap:0,skippedReservedOrDuplicate:skipped,sets:sets.length,operationalLoads:0},null,2)+'\n',{flag:'wx'});
});
