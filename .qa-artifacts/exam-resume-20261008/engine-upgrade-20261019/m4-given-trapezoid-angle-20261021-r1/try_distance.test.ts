/** Bounded A120 template: separate the14-radius mark from its real-metric text. */
import fs from 'node:fs';
import { expect,it } from 'vitest';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { withLabelMetrics } from '@/lib/figure/mathjaxSubstitute';
it('tests all54 original shapes with an interior A-label and every given dimension retained',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m4-given-trapezoid-angle-20261021-r1/';
 const baseline=JSON.parse(fs.readFileSync('src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json','utf8'));
 const results=[];
 for(const row of baseline.mode1){
  const spec=structuredClone(row.output.figureSpec);spec.angles={angA:{vertex:'A',points:['B','D'],radius:14,label_distance:30,label:'120°'}};
  const result=await renderFigureSpec(spec,{strict:true});
  const name=`candidate-r14-d30-p${row.p}-c${row.c}.svg`;if(result.ok)fs.writeFileSync(out+name,result.svg,{flag:'wx'});
  results.push({p:row.p,c:row.c,spec,measuredSpec:withLabelMetrics(spec),...(result.ok?{ok:true,svg:name}:result)});
  fs.writeFileSync(out+'distance-layout-experiments.json',JSON.stringify({QAOnly:true,productionChanged:false,results,newQuestionCredits:0},null,2)+'\n');
 }
 expect(results.filter(r=>!r.ok)).toEqual([]);
});
