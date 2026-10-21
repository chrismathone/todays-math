import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { generateMiddleProblem } from '@/lib/middle/generate';
import { M2_GEO_SIM } from '@/lib/middle/m2GeoSim';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';

it('captures actual current20 handlers,100 API cases, strict current/old controls and explicit layout holds',async()=>{
const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m14-intersection-20261021-r1/';
const files=['src/lib/middle/m2GeoSim.ts','src/lib/middle/generate.ts','src/lib/middle/figureDims.ts','src/lib/examStudy/adapters.ts','src/lib/figure/renderFigureSpec.ts','src/lib/figure/mathjaxSubstitute.ts','scripts/figure/render_spec.py'];
const hashes=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before=hashes();
const key='2-2|평행선 사이의 선분의 길이의 비|10';
const handler=M2_GEO_SIM.find(e=>e.key===key)!.handler;
const modes10=[];
for(let mode=0;mode<2;mode++)for(let index=0;index<10;index++){
const values=[(mode+.5)/2,(index+.5)/10];let used=0;
const output=handler(()=>{if(used>=2)throw Error('unexpected RNG');return values[used++]!;});expect(used).toBe(2);
const render=await renderFigureSpec(output.figureSpec,{strict:true});
const oldSpec=structuredClone(output.figureSpec!) as {points:Record<string,unknown>;labels:Record<string,unknown>};
delete oldSpec.points.O;delete oldSpec.labels.O;
const oldStrict=await renderFigureSpec(oldSpec,{strict:true});
expect(render.ok).toBe(oldStrict.ok);
if(!render.ok){expect(render.error).toMatch(/dimension 'd_EF' has no collision-free layout/);expect(oldStrict).toEqual(render);}
const display=render.ok?render:await renderFigureSpec(output.figureSpec);
expect(display.ok,JSON.stringify(display)).toBe(true);if(!display.ok)throw Error(display.error);
const name=`r2-current-mode${mode}-pair${index}.svg`;fs.writeFileSync(out+name,display.svg,{flag:'wx'});
modes10.push({mode,index,output,strictResult:render.ok?{ok:true}:render,oldStrict:oldStrict.ok?{ok:true}:oldStrict,
  explicitLayoutHold:!render.ok,droppedDimensions:display.droppedDimensions??[],
  mathJaxSvg:name,svgSHA256:crypto.createHash('sha256').update(display.svg).digest('hex')});}
const actualAPI=Array.from({length:100},(_,i)=>{const seed=20261021+i*7919;return{seed,output:generateMiddleProblem(key,seed,0)};});
const after=hashes();expect(after).toEqual(before);
fs.writeFileSync(out+'actual-current-outputs-r2.json',JSON.stringify({sourceSHA256:before,sourcesUnchanged:true,actualAPI,modes10,
  displayedWithDroppedEFIsNotApproved:true,newQuestionCredits:0,DBWrites:0},null,2)+'\n',{flag:'wx'});
});
