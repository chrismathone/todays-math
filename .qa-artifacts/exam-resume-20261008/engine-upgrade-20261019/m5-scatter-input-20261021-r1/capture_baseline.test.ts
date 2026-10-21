import fs from 'node:fs';
import { expect, it } from 'vitest';
import { M3_STAT2 } from '@/lib/middle/m3Stat2';
import { generateMiddleProblem, generateMiddleSet } from '@/lib/middle/generate';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';

it('preserves actual scatter inputs before changing identity or rendering', async () => {
  const out = '.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-input-20261021-r1/';
  const types = new Set(['06','07','08','09','10','11','12','14','15']);
  const scoped = M3_STAT2.filter(e => e.rpmMinor === '상자그림과 산점도' && types.has(e.rpmType));
  expect(scoped).toHaveLength(9);
  const actualAPI = scoped.flatMap(e => Array.from({length:32}, (_, i) => {
    const seed = 20261021 + i * 7919;
    return {key:e.key, seed, output:generateMiddleProblem(e.key, seed)};
  }));
  const outside = M3_STAT2.filter(e => !scoped.includes(e)).flatMap(e => Array.from({length:5}, (_,i) => {
    const seed = 20261021 + i * 7919;
    return {key:e.key, seed, output:generateMiddleProblem(e.key, seed)};
  }));
  const sets = scoped.flatMap(e => [1, 7777, 20261021].map(seed => ({key:e.key, seed, output:generateMiddleSet(e.key, seed, 4)})));
  const sharedSets = M3_STAT2.filter(e => !scoped.includes(e)).map(e => ({key:e.key, seed:20261021, output:generateMiddleSet(e.key, 20261021, 4)}));
  const plots = [];
  for (const e of scoped) {
    const output = generateMiddleProblem(e.key, 20261021);
    const rendered = await renderFigureSpec(output.figureSpec, {strict:true});
    expect(rendered.ok, JSON.stringify(rendered)).toBe(true);
    if (!rendered.ok) throw Error(rendered.error);
    const file = `before-${e.rpmType}.svg`;
    fs.writeFileSync(out+file, rendered.svg, {flag:'wx'});
    plots.push({key:e.key, file, output});
  }
  const data = {beforeCommit:'e549cbd127aa91563d8bf1e4d97e0f32c8136447', technicalOnly:true, newQuestionCredits:0, dbWrites:0, actualAPI, outside, sets, sharedSets, plots};
  fs.writeFileSync('src/__tests__/fixtures/m3Scatter-before-input-identity-20261022.json',JSON.stringify(data,null,2)+'\n',{flag:'wx'});
});
