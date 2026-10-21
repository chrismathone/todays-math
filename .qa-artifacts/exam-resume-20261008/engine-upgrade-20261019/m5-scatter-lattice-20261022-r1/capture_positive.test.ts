import fs from 'node:fs';
import crypto from 'node:crypto';
import { it,expect } from 'vitest';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { svgLabels } from '@/lib/figure/svgLabels';

it('also renders an increasing correlation example absent from the first four seeds',async()=>{
 const out='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-lattice-20261022-r1/';
 const student=JSON.parse(fs.readFileSync(out+'student-inputs-sealed.json','utf8'));
 const row=student.rows.find((r:{key:string;figureSpec:{points:number[][]}})=>r.key.endsWith('|08')&&r.figureSpec.points.every((p,i,a)=>i===0||p[1]!>a[i-1]![1]!));
 expect(row).toBeDefined();
 const render=await renderFigureSpec(row.figureSpec,{strict:true});expect(render.ok,JSON.stringify(render)).toBe(true);
 if(!render.ok)throw Error(render.error);
 const file=`positive-extra-${row.id}.svg`;fs.writeFileSync(out+file,render.svg,{flag:'wx'});
 fs.writeFileSync(out+'positive-extra-manifest.json',JSON.stringify({id:row.id,file,svgSHA256:crypto.createHash('sha256').update(render.svg).digest('hex'),labels:svgLabels(render.svg),parentActualPublicRun:true,independentOwnSVGRun:false,newQuestionCredits:0,DBWrites:0},null,2)+'\n',{flag:'wx'});
});
