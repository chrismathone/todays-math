/** QA-only layouts; never changes production or approves a native image. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
it('compares separated whole-angle arcs and scoped clear-label placement',async()=>{
 const base=JSON.parse(fs.readFileSync('src/__tests__/fixtures/m2Bisector-before-given-angle-20261021.json','utf8'));
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m3-given-angle-20261021-r1/';
 const results=[];
 for(const candidate of [{id:'plain38',radius:38,half:14,clear:false},{id:'clear38',radius:38,half:14,clear:true},{id:'clear50',radius:50,half:22,clear:true}]){
  for(const row of base.mode1){
   const spec=structuredClone(row.output.figureSpec);
   spec.angles={a1:{vertex:'O',points:['A','P'],radius:candidate.half,arcs:1},a2:{vertex:'O',points:['P','B'],radius:candidate.half,arcs:1},
    givenAOB:{vertex:'O',points:['A','B'],radius:candidate.radius,label:`${row.w}°`},ax:spec.angles.ax};
   if(candidate.clear)spec.style={...spec.style,clear_angle_labels:true};
   const result=await renderFigureSpec(spec,{strict:true});
   const name=`experiment-${candidate.id}-w${row.w}.svg`;
   if(result.ok)fs.writeFileSync(out+name,result.svg,{flag:'wx'});
   results.push({candidate,w:row.w,spec,ok:result.ok,...(result.ok?{svg:name,svgSHA256:crypto.createHash('sha256').update(result.svg).digest('hex')}:result)});
   fs.writeFileSync(out+'layout-experiments.json',JSON.stringify({QAOnly:true,productionChanged:false,newQuestionCredits:0,results},null,2)+'\n');
   expect(result.ok,JSON.stringify(result)).toBe(true);
  }
 }
});
