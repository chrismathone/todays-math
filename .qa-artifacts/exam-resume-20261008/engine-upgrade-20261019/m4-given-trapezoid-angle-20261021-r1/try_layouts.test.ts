import fs from 'node:fs';
import { expect,it } from 'vitest';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
it('compares actual103 baseline roles with54 given-A candidates under two label policies',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m4-given-trapezoid-angle-20261021-r1/';
 const baseline=JSON.parse(fs.readFileSync('src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json','utf8'));
 const results=[];
 for(const clear of [false,true])for(const row of baseline.mode1){
  const spec=structuredClone(row.output.figureSpec);
  spec.angles={angA:{vertex:'A',points:['B','D'],label:'120°'}};
  if(clear)spec.style={...spec.style,clear_angle_labels:true};
  const result=await renderFigureSpec(spec,{strict:true});
  const name=`candidate-clear${clear}-p${row.p}-c${row.c}.svg`;
  if(result.ok)fs.writeFileSync(out+name,result.svg,{flag:'wx'});
  results.push({clear,p:row.p,c:row.c,spec,...(result.ok?{ok:true,svg:name}:result)});
  fs.writeFileSync(out+'layout-experiments.json',JSON.stringify({QAOnly:true,productionChanged:false,results,newQuestionCredits:0},null,2)+'\n');
 }
 expect(results.filter(r=>!r.ok)).toEqual([]);
});
