import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { M2_PYTHA } from '@/lib/middle/m2Pytha';
import { renderFigureSpec } from '@/lib/figure/renderFigureSpec';
import { svgLabels } from '@/lib/figure/svgLabels';

const out = path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/pytha-given-upgrade-20261021-r1/native');
mkdirSync(out, {recursive:true});
describe('M2 given side labels survive the actual strict typeset renderer', () => {
  for (const type of ['09', '10']) {
    for (let i = 0; i < 10; i++) {
      it(`${type} triple index ${i}`, async () => {
        const entry = M2_PYTHA.find(e => e.key === `2-2|피타고라스 정리|${type}`)!;
        let draws = 0;
        const p = entry.handler(() => {
          if (draws++ !== 0) throw new Error('Unexpected random draw');
          return (i + .5) / 10;
        });
        const expected = [...p.content.matchAll(/\\overline\{[A-Z]{2}\}=([0-9]+)\\,\\mathrm\{cm\}/g)]
          .map(m => `${m[1]} cm`).sort();
        const result = await renderFigureSpec(p.figureSpec as never, {strict:true, typeset:true});
        expect(result.ok, result.ok ? '' : result.error).toBe(true);
        if (!result.ok) throw new Error(result.error);
        expect(result.droppedDimensions ?? []).toEqual([]);
        const labels = svgLabels(result.svg);
        expect(labels.filter(l => /^\d+ cm$/.test(l.text)).map(l => l.text).sort()).toEqual(expected);
        expect(labels.filter(l => /^[A-D]$/.test(l.text)).map(l => l.text).sort()).toEqual(['A','B','C','D']);
        const key = `type-${type}-triple-${i}`;
        writeFileSync(path.join(out, `${key}.svg`), result.svg);
        writeFileSync(path.join(out, `${key}.json`), JSON.stringify({key, type, tripleIndex:i,
          svgSha256:createHash('sha256').update(result.svg).digest('hex'),
          problemSha256:createHash('sha256').update(p.content).digest('hex'),
          answerSha256:createHash('sha256').update(p.answer).digest('hex'),
          expectedLabels:expected, labels, strict:true, typeset:true, droppedDimensions:[],
          technicalCalibrationOnly:true, gradeRightsOrPublicReleaseApproval:false, dbWrites:0}, null, 2));
      });
    }
  }
});
