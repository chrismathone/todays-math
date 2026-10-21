import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { svgLabels } from '@/lib/figure/svgLabels';

it('captures actual sanitized and MathJax-rendered opt-in grids',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-grid-20261022-r1/';
 const base={version:'elem-1',kind:'scatterPlot',gridStep:5,xMin:20,xMax:100,xStep:10,yMin:20,yMax:100,yStep:10,xLabel:'수학(점)',yLabel:'과학(점)',points:[[40,45],[55,70],[90,95]]};
 const cases=[{id:'scores',spec:base},
  {id:'language',spec:{...base,xMin:30,yMin:30,xLabel:'국어(점)',yLabel:'영어(점)',points:[[35,45],[60,85],[95,70]]}},
  {id:'different-spans',spec:{...base,xMin:30,points:[[35,25],[60,85],[95,70]]}},
  {id:'limits-title',spec:{...base,title:'두 과목의 점수',points:[[20,20],[100,100]]}},
  {id:'negative-technical',spec:{...base,xMin:-20,xMax:60,yMin:-30,yMax:50,xStep:20,yStep:20,xLabel:'가로값',yLabel:'세로값',points:[[-15,-20],[55,45]]}},
  {id:'twelve',spec:{...base,points:Array.from({length:12},(_,i)=>[40+i*5,40+((i*7)%12)*5])}}];
 const source=['scripts/figure/elem_advanced.py','scripts/figure/graph_scene.py','scripts/figure/elementary.py','scripts/figure/engine-catalog.json','vendor/figure-engine/core/figure_quality.py','src/lib/figure/renderFigureSpec.ts','src/lib/figure/mathjaxSubstitute.ts'];
 const hashes=()=>Object.fromEntries(source.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
 const before=hashes();const rows=[];
 for(const row of cases){
  const render=await renderFigureSpec(row.spec,{strict:true});expect(render.ok,JSON.stringify(render)).toBe(true);
  if(!render.ok)throw Error(render.error);
  const file=`actual-${row.id}.svg`;fs.writeFileSync(out+file,render.svg,{flag:'wx'});
  rows.push({...row,file,labels:svgLabels(render.svg),svgSHA256:crypto.createHash('sha256').update(render.svg).digest('hex')});
 }
 expect(hashes()).toEqual(before);
 fs.writeFileSync(out+'actual-current.json',JSON.stringify({technicalOnly:true,newQuestionCredits:0,dbWrites:0,sourceSHA256:before,sourcesUnchanged:true,rows},null,2)+'\n',{flag:'wx'});
});
