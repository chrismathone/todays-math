# -*- coding: utf-8 -*-
"""끈으로 캔 묶기(원기둥 n개를 끈으로 두르기) — v2 순수 작도 재현기.

물결 2D 가 「에셋 can 은 옆모습이라 못 낸다 · 위에서 본 캔 에셋이 필요하다」로
남긴 자리다. **에셋은 필요 없다** — 위에서 본 캔은 그냥 원이고, 끈은 공통
외접선(선분)과 감기는 호다. 지금 v2(circles + segments + arcs)로 전부 그려진다.

    python scripts/figure/probe-can-tie.py [출력=C:/tmp/can-tie.html]

산출물이 아니라 산출기를 남긴다 — 유형을 낼 세션이 이 좌표 규칙을 그대로 쓴다.
실측 규약(2026-08-23): `on_circle` 의 angle 은 **수학 관례 + y 뒤집힘**이라
방향 (dx,dy) 의 각도는 `atan2(-dy, dx)` 다. 호 끝점은 반드시 `on_circle` 로
만들어야 한다 — 좌표를 반올림해 넣으면 엔진이 «원 위에 없다»로 던진다.
"""
from __future__ import annotations

import io
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def build(n: int, r: float = 34.0, cx: float = 110.0, cy: float = 115.0) -> dict:
    """캔 n개를 정n각형으로 놓고 바깥을 끈으로 두른 FigureSpec v2."""
    if n < 2:
        raise ValueError("캔은 2개 이상")
    if n == 2:
        cs = [(cx - r, cy), (cx + r, cy)]
    else:
        d = r / math.sin(math.pi / n)  # 이웃 중심 거리가 2r 이 되는 외접원 반지름
        cs = [
            (
                cx + d * math.cos(math.radians(-90 + 360 * k / n)),
                cy + d * math.sin(math.radians(-90 + 360 * k / n)),
            )
            for k in range(n)
        ]

    pts: dict = {}
    circles: dict = {}
    segs: dict = {}
    arcs: dict = {}
    for i, (x, y) in enumerate(cs):
        pts[f"O{i}"] = [round(x, 3), round(y, 3)]
        circles[f"c{i}"] = {"center": f"O{i}", "radius": r}

    for i in range(n):
        j = (i + 1) % n
        x1, y1 = cs[i]
        x2, y2 = cs[j]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        nx, ny = -dy / L, dx / L  # 중심선의 법선
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        # 바깥쪽(무게중심 반대편)을 고른다 — 끈은 밖으로 두른다
        if (mx + nx - cx) ** 2 + (my + ny - cy) ** 2 < (mx - cx) ** 2 + (my - cy) ** 2:
            nx, ny = -nx, -ny
        ang = round(math.degrees(math.atan2(-ny, nx)), 4)
        pts[f"T{i}a"] = {"type": "on_circle", "circle": f"c{i}", "angle": ang}
        pts[f"T{i}b"] = {"type": "on_circle", "circle": f"c{j}", "angle": ang}
        segs[f"s{i}"] = [f"T{i}a", f"T{i}b"]

    for j in range(n):
        i = (j - 1) % n
        arcs[f"a{j}"] = {
            "circle": f"c{j}",
            "from": f"T{i}b",
            "to": f"T{j}a",
            "dir": "ccw",
        }

    return {
        "version": 2,
        "points": pts,
        "circles": circles,
        "segments": segs,
        "arcs": arcs,
    }


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else "C:/tmp/can-tie.html"
    cells = []
    for n in (2, 3, 4, 6):
        spec = build(n)
        p = subprocess.run(
            [sys.executable, os.path.join(HERE, "render_spec.py")],
            input=json.dumps(spec).encode("utf-8"),
            capture_output=True,
            timeout=30,
        )
        res = json.loads(p.stdout.decode("utf-8"))
        if "svg" not in res:
            raise RuntimeError(f"캔 {n}개 렌더 실패: {res.get('error', '?')}")
        # 끈 길이 = 직선 n개(각 2r) + 호 전부(합쳐서 원 하나)
        length = 2 * spec["circles"]["c0"]["radius"] * n
        cells.append(
            f"<div style='display:inline-block;margin:10px;text-align:center'>"
            f"<div>캔 {n}개 — 끈 = 직선 {n}×2r + 원 하나(2πr)</div>{res['svg']}</div>"
        )
        print(f"OK  캔 {n}개 (직선 합 {length:.0f})")
    io.open(out, "w", encoding="utf-8").write(
        "<meta charset='utf-8'><style>svg{width:230px;height:auto}</style>"
        "<h3>끈으로 캔 묶기 — v2 순수 작도 (에셋 불필요)</h3>" + "".join(cells)
    )
    print("→", out)


if __name__ == "__main__":
    main()
