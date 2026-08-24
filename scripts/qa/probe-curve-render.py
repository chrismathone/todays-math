# -*- coding: utf-8 -*-
"""좌표평면·원뿔 전개도 kind 의 **산출물 표본** — 변이 시험의 ⑵ 단계가 쓴다.

    python scripts/qa/probe-curve-render.py

스펙마다 한 줄씩 `이름<TAB>결과` 를 UTF-8 로 찍는다. 결과는 SVG 를 요약한 것
(폭 · 글자 크기 · 요소 수 · 좌표 md5)이거나 던진 사유다.

## 왜 요약인가

변이가 **뜻을 바꿨는지**만 보면 되므로 SVG 전문을 견줄 필요는 없다. 다만 요약이
너무 성기면 「파일은 바뀌었는데 산출물은 그대로」를 놓친다 — 그래서 좌표 md5 까지
넣는다(2026-08-21 「⑵ 를 건너뛰면 멀쩡한 가드를 의심하게 된다」).

## 왜 하네스가 이 파일을 부르나

하네스가 표본을 제 안에 품으면, 하네스를 고칠 때 표본도 같이 흔들린다.
표본은 **커밋된 파일 하나**여야 다음 사람이 같은 것을 잰다.
"""
from __future__ import annotations

import hashlib
import io
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO, "vendor", "figure-engine"))
sys.path.insert(0, os.path.join(REPO, "scripts", "figure"))

SPECS: list[tuple[str, dict]] = [
    ("쌍곡선 k=6", {"version": "elem-1", "kind": "curveGraph",
                 "curves": [{"type": "inverse", "k": 6, "label": "y=6/x"}],
                 "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[2, 3]]}),
    ("쌍곡선 k=-8", {"version": "elem-1", "kind": "curveGraph",
                  "curves": [{"type": "inverse", "k": -8}],
                  "xRange": [-6, 6], "yRange": [-6, 6]}),
    ("쌍곡선 k=1(축에 붙음)", {"version": "elem-1", "kind": "curveGraph",
                        "curves": [{"type": "inverse", "k": 1}],
                        "xRange": [-6, 6], "yRange": [-6, 6]}),
    ("쌍곡선 한 가지만", {"version": "elem-1", "kind": "curveGraph",
                   "curves": [{"type": "inverse", "k": 6}],
                   "xRange": [-1, 11], "yRange": [-1, 11]}),
    ("포물선 a=1 q=-2", {"version": "elem-1", "kind": "curveGraph",
                      "curves": [{"type": "quadratic", "a": 1, "q": -2}],
                      "xRange": [-4, 4], "yRange": [-4, 6], "marks": [[2, 2]]}),
    ("포물선 꼭짓점 밖", {"version": "elem-1", "kind": "curveGraph",
                   "curves": [{"type": "quadratic", "a": 1, "q": -18}],
                   "xRange": [-4, 4], "yRange": [-6, 6]}),
    # 허용치를 재는 표본 — a 를 1e-6 흔들면 (1,1) 은 곡선 위가 아니다.
    ("포물선 a=0.999999 mark(1,1)", {"version": "elem-1", "kind": "curveGraph",
                                  "curves": [{"type": "quadratic", "a": 0.999999}],
                                  "xRange": [-4, 4], "yRange": [-2, 8], "marks": [[1, 1]]}),
    ("곡선 위가 아닌 mark", {"version": "elem-1", "kind": "curveGraph",
                      "curves": [{"type": "inverse", "k": 6}],
                      "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[2, 4]]}),
    ("곡선+직선 겹치기", {"version": "elem-1", "kind": "curveGraph",
                    "curves": [{"type": "inverse", "k": 6}],
                    "lines": [{"slope": 1, "yIntercept": 0}],
                    "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[-3, -2]]}),
    ("직선 좁은 범위", {"version": "elem-1", "kind": "linearGraph",
                   "lines": [{"slope": 1, "yIntercept": 1}],
                   "xRange": [-2, 2], "yRange": [-2, 2], "marks": [[1, 2]]}),
    ("직선 넓은 범위+라벨", {"version": "elem-1", "kind": "linearGraph",
                     "lines": [{"slope": 1, "yIntercept": 0, "label": "y=x"}],
                     "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[2, 2]]}),
    ("직선 위가 아닌 mark", {"version": "elem-1", "kind": "linearGraph",
                      "lines": [{"slope": 2, "yIntercept": -1}],
                      "xRange": [-4, 4], "yRange": [-4, 4], "marks": [[2, 2]]}),
    ("원뿔 전개도 3·9", {"version": "elem-1", "kind": "netCone", "r": 3, "l": 9}),
    ("원뿔 전개도 4·6", {"version": "elem-1", "kind": "netCone", "r": 4, "l": 6}),
    ("원뿔 전개도 2·12 전부", {"version": "elem-1", "kind": "netCone", "r": 2, "l": 12,
                        "labels": ["slant", "angle", "radius"]}),
    ("원뿔 l≤r", {"version": "elem-1", "kind": "netCone", "r": 3, "l": 3}),
    ("원뿔 정수 도 아님", {"version": "elem-1", "kind": "netCone", "r": 5, "l": 13}),
    # 통계 kind 도 같은 `_fixed_width_svg` 를 쓴다 — 폭 박기를 되돌리면 여기도 움직인다.
    ("히스토그램", {"version": "elem-1", "kind": "histogram",
                "classes": [10, 20, 30, 40, 50], "values": [3, 7, 9, 4]}),
]

_NUM = re.compile(r'(?:points|d|cx|cy|x1|y1|x2|y2|r|width|height)="([^"]+)"')


def summarize(svg: str) -> str:
    w = re.match(r'<svg viewBox="0 0 ([0-9.]+) ([0-9.]+)"', svg)
    sizes = sorted({m for m in re.findall(r'font-size="([0-9.]+)"', svg)})
    coords = hashlib.md5("|".join(_NUM.findall(svg)).encode("utf-8")).hexdigest()[:12]
    counts = {t: len(re.findall(f"<{t}[ /]", svg)) for t in
              ("line", "polyline", "polygon", "path", "circle", "text", "rect")}
    return (
        f"폭={w.group(1)} 높이={w.group(2)} 글자={','.join(sizes)} "
        f"{' '.join(f'{k}={v}' for k, v in counts.items())} 좌표={coords}"
    )


def main() -> None:
    out = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", newline="\n")
    from elementary import render_elementary

    for name, spec in SPECS:
        try:
            line = summarize(render_elementary(spec))
        except Exception as exc:
            line = f"던짐: {type(exc).__name__}: {exc}"
        out.write(f"{name}\t{line}\n")
    out.flush()


main()
