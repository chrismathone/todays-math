import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {expect,it} from 'vitest';
import {generateMiddleProblem} from '@/lib/middle/generate';
import {renderFigureSpec} from '@/lib/figure/renderFigureSpec';
const out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const sha=(b:string|Buffer)=>crypto.createHash('sha256').update(b).digest('hex');
it('rebinds 144 previously independently solved student SVGs to the current producer and renderer',async()=>{
 const prior=JSON.parse(fs.readFileSync(path.join(out,'actual-current-private.json'),'utf8'));
 const files=['src/lib/middle/m3Stat2.ts','src/lib/examStudy/adapters.ts','src/lib/figure/renderFigureSpec.ts','scripts/figure/elem_advanced.py','scripts/figure/elementary.py','scripts/figure/graph_scene.py','vendor/figure-engine/core/figure_quality.py'];
 const sources=files.map(p=>({path:p,sha256:sha(fs.readFileSync(p))}));
 const rows=[];
 expect(prior.rows).toHaveLength(144);
 for(const r of prior.rows){
  const current=generateMiddleProblem(r.key,r.seed,r.variant);expect(current).toEqual(r.output);
  const rendered=await renderFigureSpec(current.figureSpec!,{strict:true});expect(rendered.ok).toBe(true);
  if(!rendered.ok)throw Error(rendered.error);
  const original=fs.readFileSync(path.join(out,r.svg.file),'utf8');
  expect(sha(original)).toBe(r.svg.sha256);expect(rendered.svg).toBe(original);
  rows.push({id:r.id,outputIdentical:true,SVG_SHA256:sha(rendered.svg),SVGIdentical:true});
 }
 expect(sources.every(r=>sha(fs.readFileSync(r.path))===r.sha256)).toBe(true);
 fs.writeFileSync(path.join(out,'current-rebind-r1.json'),JSON.stringify({utc:new Date().toISOString(),sourceSHA256:sources,rows,outputs:144,strictSVGs:144,previousSealedStudentInputSHA256:sha(fs.readFileSync(path.join(out,'student-inputs-sealed.json'))),previousComparisonSHA256:sha(fs.readFileSync(path.join(out,'independent-comparison-r1.json'))),newBlindSolves:0,newManualAuthorshipOrApprovalCredits:0,previousExposureRetained:true,dbWrites:0,sourcesUnchanged:true},null,2)+'\n',{flag:'wx'});
},180000);
