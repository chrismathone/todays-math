import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { M2_GEO_TRI } from '@/lib/middle/m2GeoTri';
import { generateMiddleProblem } from '@/lib/middle/generate';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { withLabelMetrics } from '@/lib/figure/mathjaxSubstitute';
it('records actual current21 handlers,100 API outputs and strict MathJax renders with measured specs',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m3-given-angle-20261021-r1/';
 const files=['src/lib/middle/m2GeoTri.ts','src/lib/middle/generate.ts','src/lib/examStudy/adapters.ts','src/lib/figure/renderFigureSpec.ts','src/lib/figure/mathjaxSubstitute.ts','src/lib/figure/mathjaxLabel.ts',
  ...fs.readdirSync('scripts/figure').filter(p=>p.endsWith('.py')).map(p=>'scripts/figure/'+p),
  ...fs.readdirSync('vendor/figure-engine/core').filter(p=>p.endsWith('.py')).map(p=>'vendor/figure-engine/core/'+p)];
 const hashes=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
 const before=hashes();const key='2-2|삼각형의 성질|09';
 const handler=M2_GEO_TRI.find(e=>e.key===key)!.handler;
 const rows=[];
 for(let index=0;index<21;index++){
  const values=[.75,(index+.5)/21];let used=0;
  const output=handler(()=>{if(used>=2)throw Error('unexpected RNG');return values[used++]!;});expect(used).toBe(2);
  const measuredSpec=withLabelMetrics(output.figureSpec);
  const render=await renderFigureSpec(output.figureSpec,{strict:true});expect(render.ok,JSON.stringify(render)).toBe(true);
  if(!render.ok)throw Error(render.error);
  const w=40+index*2;expect(render.svg.match(/data-label="\d+°"/g)).toEqual([`data-label="${w}°"`]);
  const name=`actual-current-w${w}.svg`;fs.writeFileSync(out+name,render.svg,{flag:'wx'});
  rows.push({w,output,measuredSpec,svg:name,svgSHA256:crypto.createHash('sha256').update(render.svg).digest('hex')});
 }
 const actualAPI=Array.from({length:100},(_,i)=>{const seed=20261021+i*7919;return{seed,output:generateMiddleProblem(key,seed,0)};});
 expect(hashes()).toEqual(before);
 fs.writeFileSync(out+'actual-current-outputs.json',JSON.stringify({sourceSHA256:before,sourcesUnchanged:true,rows,actualAPI,newQuestionCredits:0,DBWrites:0},null,2)+'\n',{flag:'wx'});
});
