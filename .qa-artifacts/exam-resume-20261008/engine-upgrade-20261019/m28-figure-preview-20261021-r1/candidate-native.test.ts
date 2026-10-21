/** Evaluate a hash-pinned candidate without replacing the production module. */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {renderFigureSpec} from '@/lib/figure/renderFigureSpec';
import {svgLabels} from '@/lib/figure/svgLabels';

const require = createRequire(import.meta.url);
require('tsx/cjs');
const ts = require('typescript');
const candidate = path.resolve('.qa-artifacts/exam-resume-20261008/m28-parameter-figure-candidate-20261021-r1/own-m2Quad.ts');
const bytes = readFileSync(candidate);
expect(createHash('sha256').update(bytes).digest('hex')).toBe('3ed5332cf5ff2e535c3aa3f641a3965b2db704d981a917fabd6dc26f0579b6b6');
const filename = path.resolve('src/lib/middle/__m28_candidate_evaluation__.cjs');
const mod = new Module(filename);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(ts.transpileModule(bytes.toString('utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, filename);
const entry = mod.exports.M2_QUAD.find(e => e.key === '2-2|평행사변형|15A');
const out = path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m28-figure-preview-20261021-r1/native');
mkdirSync(out,{recursive:true});
describe('off-line M28 candidate native rendering before any production adoption',()=>{
  for (const [x,p,q] of [[4,2,1],[7,2,2],[15,4,12]]) {
    it(`printed beta ${p*x+q}`,async()=>{
      const draws=[(x-4+.5)/12,(p-2+.5)/3,(q-1+.5)/12];let used=0;
      const task=entry.handler(()=>{if(used>=3)throw Error('extra RNG');return draws[used++];});
      const beta=p*x+q;
      const result=await renderFigureSpec(task.figureSpec,{strict:true,typeset:true});
      const row={candidate, candidateSha256:createHash('sha256').update(bytes).digest('hex'),
        x,p,q,beta,task,ok:result.ok,error:result.ok?null:result.error,
        labels:result.ok?svgLabels(result.svg):null,productionModuleReplaced:false,dbWrites:0};
      writeFileSync(path.join(out,`beta-${beta}.json`),JSON.stringify(row,null,2));
      if(result.ok)writeFileSync(path.join(out,`beta-${beta}.svg`),result.svg);
      expect(result.ok,result.ok?'':result.error).toBe(true);
      if(result.ok)expect(svgLabels(result.svg).map(l=>l.text).sort()).toEqual(['A','B','C','D']);
    });
  }
});
