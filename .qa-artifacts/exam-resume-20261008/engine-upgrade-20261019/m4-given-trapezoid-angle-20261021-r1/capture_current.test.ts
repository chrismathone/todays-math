import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { M2_GEO_QUAD } from '@/lib/middle/m2GeoQuad';
import { generateMiddleProblem } from '@/lib/middle/generate';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { withLabelMetrics } from '@/lib/figure/mathjaxSubstitute';
it('records54 actual given-A cases with both dimensions under strict MathJax rendering',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m4-given-trapezoid-angle-20261021-r1/';
 const files=['src/lib/middle/m2GeoQuad.ts','src/lib/middle/generate.ts','src/lib/middle/figureDims.ts','src/lib/examStudy/adapters.ts','src/lib/figure/renderFigureSpec.ts','src/lib/figure/mathjaxSubstitute.ts','src/lib/figure/mathjaxLabel.ts',
  ...fs.readdirSync('scripts/figure').filter(p=>p.endsWith('.py')).map(p=>'scripts/figure/'+p),
  ...fs.readdirSync('vendor/figure-engine/core').filter(p=>p.endsWith('.py')).map(p=>'vendor/figure-engine/core/'+p)];
 const hashes=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
 const before=hashes();const key='2-2|여러 가지 사각형|08';const handler=M2_GEO_QUAD.find(e=>e.key===key)!.handler;
 const rows=[];
 for(let p=4;p<=12;p++)for(let c=4;c<=14;c+=2){
  const values=[.75,(p-4+.5)/9,(c/2-2+.5)/6];let used=0;
  const output=handler(()=>{if(used>=3)throw Error('unexpected RNG');return values[used++]!;});expect(used).toBe(3);
  const render=await renderFigureSpec(output.figureSpec,{strict:true});expect(render.ok,JSON.stringify(render)).toBe(true);
  if(!render.ok)throw Error(render.error);expect(render.droppedDimensions).toBeUndefined();
  expect(render.svg.match(/data-label="\d+°"/g)).toEqual(['data-label="120°"']);
  const name=`actual-current-p${p}-c${c}.svg`;fs.writeFileSync(out+name,render.svg,{flag:'wx'});
  rows.push({p,c,output,measuredSpec:withLabelMetrics(output.figureSpec),svg:name,svgSHA256:crypto.createHash('sha256').update(render.svg).digest('hex')});
 }
 const actualAPI=Array.from({length:100},(_,i)=>{const seed=20261021+i*7919;return{seed,output:generateMiddleProblem(key,seed,0)};});
 expect(hashes()).toEqual(before);
 fs.writeFileSync(out+'actual-current-outputs.json',JSON.stringify({sourceSHA256:before,sourcesUnchanged:true,rows,actualAPI,strictGivenDimensionsPreserved:true,newQuestionCredits:0,DBWrites:0},null,2)+'\n',{flag:'wx'});
});
