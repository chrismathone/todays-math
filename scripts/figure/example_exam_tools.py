"""Technical calibration only; not a bank question or approved student asset.

python -B scripts/figure/example_exam_tools.py <new-output-directory>
The engine path is owned by engine_path.py. No original image, API, or DB is used.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

from engine_path import engine_root

sys.path.insert(0, engine_root())

from core.figure_exam import FigureSet, ang, dim, foot, frame, seg, sss  # noqa: E402
from core.figure_svg import verify_figure  # noqa: E402


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) != 2:
        raise SystemExit('usage: example_exam_tools.py <new-output-directory>')
    out = Path(sys.argv[1])
    # Keep the example reversible: no replacing an existing authoring directory.
    if out.exists():
        raise SystemExit('output directory already exists')
    to = frame(20, 180, 10)
    ax, ay = sss(13, 15, 14)
    a, b, c = to(ax, ay), to(0, 0), to(14, 0)
    h = foot(a, b, c)
    key = 'calibration-triangle'
    verify_figure(key, lengths=[(13, a, b), (15, a, c), (14, b, c), (12, a, h)],
                  on_line=[(h, b, c)], angles=[(90, h, a, c)])
    figs = FigureSet()
    figs.spec(key, dict(A=a, B=b, C=c, H=h),
              dict(AB=seg('A', 'B'), BC=seg('B', 'C'), CA=seg('C', 'A'), AH=seg('A', 'H', dash='4 3')),
              angles=dict(right=ang('H', 'A', 'C', right=True)),
              dims=dict(ab=dim('A', 'B', '13'), ac=dim('A', 'C', '15'), bc=dim('B', 'C', '14')),
              labels=dict(A='A', B='B', C='C', H=dict(text='H', position='NW')))
    # AH=12 is checked internally, and is deliberately absent from numeric labels.
    report = figs.build(str(out))
    (out / (key + '.svg')).write_bytes(figs.svgs[key].encode('utf-8'))
    manifest = dict(kind='figure-engine-calibration/v1', assets=report, widths=figs.widths(),
                    printedGivenLengths=dict(AB=13, AC=15, BC=14), internalDerivedValues=dict(AH=12),
                    sourceExamId=None, unitUuid=None, liveFamily=None, gradeGate='not-assessed',
                    rightsGate='not-assessed', publishable=False, bankQuestionCount=0, dbWrites=0)
    (out / 'manifest.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode('utf-8'))
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == '__main__':
    main()
