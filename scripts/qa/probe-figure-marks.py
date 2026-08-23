# -*- coding: utf-8 -*-
"""FigureSpec v2 마크 문법(ticks·parallel·arcs·right) 실증 — 4종 실렌더.

    python scripts/qa/probe-figure-marks.py

원본 지면(RPM 2-2 삼각형의 성질·사각형 단원)의 **표기 문법만** 본다 — 좌표·수치는
베끼지 않는다.  크기·획 굵기 눈금은 벡터 실측(본선 0.80pt·마크 0.30pt·tick 4.25pt
≈ 직각기호 한 변)을 figure_scene.py 상수 주석에 적어 두었다.

산출물은 `C:/tmp/v2-marks/` (D-07 — 병합 검수 때 바로 본다):

  repro-<id>.svg   엔진이 낸 SVG (render_spec.py 실경로 통과)
  repro-<id>.png   Chromium 렌더 (지면과 같은 렌더러)

렌더 실패는 **던진다** — 조용한 폴백 금지.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = r"C:/tmp/v2-marks"
RENDER_SPEC = os.path.join(ROOT, "scripts", "figure", "render_spec.py")
SHOTS_MJS = os.path.join(ROOT, "scripts", "figure", "render-svg-shots.mjs")

SPECS: dict[str, dict] = {}

# ① 이등변삼각형 — 두 변 같음 tick 1개씩 + 밑각 호.
SPECS["iso-ticks"] = {
    "version": 2,
    "points": {"A": [120, 20], "B": [40, 170], "C": [200, 170]},
    "segments": {
        "AB": {"points": ["A", "B"], "ticks": 1},
        "AC": {"points": ["A", "C"], "ticks": 1},
        "BC": ["B", "C"],
    },
    "angles": {
        "b": {"vertex": "B", "points": ["A", "C"], "label": "50°"},
        "c": {"vertex": "C", "points": ["B", "A"], "label": "x"},
    },
    "labels": {"A": "A", "B": "B", "C": "C"},
}

# ② 각의 이등분선 — 두 반각에 이중 호(같은 각 표시).
SPECS["bisector-double-arc"] = {
    "version": 2,
    "points": {"A": [30, 160], "B": [230, 160], "C": [150, 30], "D": [123, 160]},
    "segments": {
        "AB": ["A", "B"], "CA": ["C", "A"], "CB": ["C", "B"], "CD": ["C", "D"],
    },
    "angles": {
        "a1": {"vertex": "C", "points": ["A", "D"], "arcs": 2},
        "a2": {"vertex": "C", "points": ["D", "B"], "arcs": 2},
    },
    "labels": {"A": "A", "B": "B", "C": "C", "D": "D"},
}

# ③ 사다리꼴 — 평행한 두 밑변에 » 표시 (둘 다 왼→오른 방향).
SPECS["trapezoid-parallel"] = {
    "version": 2,
    "points": {"A": [70, 40], "D": [190, 40], "B": [25, 160], "C": [235, 160]},
    "segments": {
        "AD": {"points": ["A", "D"], "parallel": 1},
        "BC": {"points": ["B", "C"], "parallel": 1},
        "AB": ["A", "B"],
        "DC": ["D", "C"],
    },
    "labels": {"A": "A", "B": "B", "C": "C", "D": "D"},
}

# ④ 직각삼각형의 내접원 — 반지름⊥접선 직각기호 + 직각 꼭짓점 직각기호.
#    3:4:5 (×40px): 내접원 r=40, I=(60,130), 접점 T=(60,170).  right:true 가
#    검산을 겸한다 — 좌표가 어긋나면 90° 가 아니어서 던진다.
SPECS["incircle-right"] = {
    "version": 2,
    "points": {
        "A": [20, 50], "B": [20, 170], "C": [180, 170],
        "I": [60, 130], "T": [60, 170],
    },
    "circles": {"inc": {"center": "I", "radius": 40}},
    "segments": {
        "AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"],
        "IT": ["I", "T"],
    },
    "angles": {
        "rB": {"vertex": "B", "points": ["A", "C"], "right": True},
        "rT": {"vertex": "T", "points": ["I", "C"], "right": True},
    },
    "labels": {"A": "A", "B": "B", "C": "C", "I": "I"},
}


def render_one(name: str, spec: dict) -> str:
    proc = subprocess.run(
        [sys.executable, RENDER_SPEC],
        input=json.dumps(spec, ensure_ascii=False).encode("utf-8"),
        capture_output=True, cwd=ROOT, timeout=60)
    result = json.loads(proc.stdout.decode("utf-8"))
    if "svg" not in result:
        raise RuntimeError(f"{name} 렌더 실패: {result.get('error', '?')[:300]}")
    return result["svg"]


def viewbox_wh(svg: str) -> tuple[int, int]:
    import re
    m = re.search(r'viewBox="0 0 ([0-9.]+) ([0-9.]+)"', svg)
    if not m:
        raise RuntimeError("viewBox 를 못 찾았다")
    return round(float(m.group(1))), round(float(m.group(2)))


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    jobs = []
    for name in sorted(SPECS):
        svg = render_one(name, SPECS[name])
        svg_path = os.path.join(OUT, f"repro-{name}.svg")
        with open(svg_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(svg)
        w, h = viewbox_wh(svg)
        scale = 3  # 확대해 마크 획을 또렷이 본다
        jobs.append({"svg": svg_path,
                     "png": os.path.join(OUT, f"repro-{name}.png"),
                     "w": w * scale, "h": h * scale})
        print(f"svg {name}: {w}x{h}")
    jobs_path = os.path.join(OUT, "shots.json")
    with open(jobs_path, "w", encoding="utf-8") as fh:
        json.dump(jobs, fh)
    shots = subprocess.run(["node", SHOTS_MJS, jobs_path],
                           capture_output=True, cwd=ROOT, timeout=180)
    if shots.returncode != 0:
        raise RuntimeError(
            f"render-svg-shots 실패: {shots.stderr.decode('utf-8', 'replace')[:400]}")
    print(shots.stdout.decode("utf-8", "replace").strip())


if __name__ == "__main__":
    main()
