import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { expect, it } from 'vitest';
import { generateMiddleProblem } from '@/lib/middle/generate';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { withLabelMetrics, substituteLabels } from '@/lib/figure/mathjaxSubstitute';

it('reproduces the unchanged type12 input through raw and public local transports', async () => {
  const spec = generateMiddleProblem('2-2|평행사변형|12',31337,0).figureSpec!;
  const rows: unknown[] = [];
  for (const typeset of [false,true]) {
    const input=JSON.stringify(typeset ? withLabelMetrics(spec) : spec);
    const raw=await new Promise<{code:number|null,signal:string|null,out:string,err:string}>((resolve,reject)=>{
      const child=spawn(process.env.PYTHON_BIN??'python',['-B','scripts/figure/render_spec.py'],{
        env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'},windowsHide:true,stdio:['pipe','pipe','pipe']});
      let out='',err='';child.stdout.setEncoding('utf-8');child.stderr.setEncoding('utf-8');
      child.stdout.on('data',chunk=>{out+=chunk;});child.stderr.on('data',chunk=>{err+=chunk;});
      child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal,out,err}));child.stdin.end(input,'utf-8');
    });
    rows.push({typeset,raw});
    fs.writeFileSync('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m28-inset-geometry-20261021-r3/default12-diagnostic.json',JSON.stringify({spec,rows},null,2)+'\n');
    expect(raw.code).toBe(0);
    const parsed=JSON.parse(raw.out);expect(parsed.svg).toContain('<svg');
    if(typeset)expect(substituteLabels(parsed.svg).svg).toContain('<svg');
    for(let attempt=0;attempt<3;attempt++){
      const result=await renderFigureSpec(spec,{typeset});rows.push({typeset,attempt,result});
      fs.writeFileSync('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m28-inset-geometry-20261021-r3/default12-diagnostic.json',JSON.stringify({spec,rows},null,2)+'\n');
      expect(result.ok).toBe(true);
    }
  }
});
