import fs from 'node:fs';
import { it } from 'vitest';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { withLabelMetrics } from '@/lib/figure/mathjaxSubstitute';
it('diagnoses two new dimension conflicts plus four extent controls without dropping givens',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m4-given-trapezoid-angle-20261021-r1/';
 const baseline=JSON.parse(fs.readFileSync('src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json','utf8'));
 const results=[];
 for(const radius of [10,14,18])for(const [p,c] of [[11,4],[12,4],[4,4],[4,14],[12,14],[8,8]]){
  const original=baseline.mode1.find((r:{p:number,c:number})=>r.p===p&&r.c===c);
  const spec=structuredClone(original.output.figureSpec);spec.angles={angA:{vertex:'A',points:['B','D'],radius,label:'120°'}};
  const result=await renderFigureSpec(spec,{strict:true});
  const name=`candidate-r${radius}-p${p}-c${c}.svg`;if(result.ok)fs.writeFileSync(out+name,result.svg,{flag:'wx'});
  results.push({p,c,radius,spec,measuredSpec:withLabelMetrics(spec),...(result.ok?{ok:true,svg:name}:result)});
 }
 fs.writeFileSync(out+'radius-diagnostics.json',JSON.stringify({QAOnly:true,productionChanged:false,results,newQuestionCredits:0},null,2)+'\n',{flag:'wx'});
});
