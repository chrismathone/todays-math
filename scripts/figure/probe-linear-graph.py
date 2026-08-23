# -*- coding: utf-8 -*-
"""linearGraph kind 의 RPM 재현 산출기 (물결 2C).

    python scripts/figure/probe-linear-graph.py [출력디렉터리=C:/tmp/linear-graph]
    node scripts/figure/render-svg-shots.mjs <출력디렉터리>/jobs.json

RPM 중학 2-1 일차함수 단원의 표본 문항(0891 점 안내선 · 0974 절편 ·
0882 두 직선 교점 · 0975 평행)을 **모양만** 재현한다 — 본문·수치는 원본과
다르게 두었다(브리프 지시). 산출물이 아니라 산출기를 저장소에 남긴다 —
원장님 육안 확정(D-07) 때 언제든 다시 낼 수 있어야 한다.

렌더는 제품과 같은 경로(render_spec.py → sanitize_svg)를 탄다.
"""
from __future__ import annotations

import glob
import io
import json
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _guard_no_mutation() -> None:
    """변이 하네스가 도는 동안 그리면 망가뜨린 코드로 시안을 만든다 (09 §4-22)."""
    marks = glob.glob(os.path.join(REPO, "MUTATION-IN-PROGRESS.*"))
    if marks:
        raise SystemExit(
            "변이 하네스가 도는 중입니다 — 지금 그리면 망가뜨린 코드로 그립니다:\n  "
            + "\n  ".join(os.path.basename(m) for m in marks)
        )


_guard_no_mutation()

# 재현 표본 — 이름은 「원본 문항(모양의 출처)」. 수치는 원본과 다르다.
SPECS: list[tuple[str, dict]] = [
    # 0891 — 양의 기울기 + 점 두 개를 점선 안내선으로 축에 잇는다.
    ("0891-pos-slope-marks", {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": 1, "yIntercept": -1}],
     "xRange": [-4, 5], "yRange": [-4, 4], "marks": [[4, 3], [-2, -3]]}),
    # 0974 — 음의 기울기, 절편 숫자만(안내선 없음).
    ("0974-neg-intercepts", {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": -3, "yIntercept": 6}],
     "xRange": [-2, 4], "yRange": [-2, 7], "marks": [[0, 6], [2, 0]]}),
    # 0882 — 두 직선이 만난다 + 식 라벨 + 교점 안내선.
    ("0882-two-lines-cross", {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": 1, "yIntercept": 2, "label": "y=x+2"},
               {"slope": -2, "yIntercept": 5, "label": "y=-2x+5"}],
     "xRange": [-4, 5], "yRange": [-3, 6], "marks": [[1, 3]]}),
    # 0975 — 평행 두 직선 + y절편 둘, 모눈 켠 판.
    ("0975-parallel-grid", {"version": "elem-1", "kind": "linearGraph",
     "lines": [{"slope": 2, "yIntercept": 3}, {"slope": 2, "yIntercept": -4}],
     "xRange": [-4, 4], "yRange": [-5, 5], "marks": [[0, 3], [0, -4], [2, 0]],
     "grid": True}),
]


def main() -> None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    out_dir = sys.argv[1] if len(sys.argv) > 1 else r"C:/tmp/linear-graph"
    os.makedirs(out_dir, exist_ok=True)
    jobs = []
    for name, spec in SPECS:
        r = subprocess.run(
            [sys.executable, os.path.join(REPO, "scripts", "figure", "render_spec.py")],
            input=json.dumps(spec).encode("utf-8"), capture_output=True, cwd=REPO,
        )
        out = json.loads(r.stdout.decode("utf-8"))
        if "svg" not in out:
            raise SystemExit(f"{name}: 렌더 실패 — {out.get('error')}")
        svg_path = os.path.join(out_dir, f"{name}.svg")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(out["svg"])
        head = out["svg"].split(">", 1)[0]
        vw, vh = (float(v) for v in head.split('viewBox="0 0 ', 1)[1].split('"', 1)[0].split())
        # 화면 배율 2배 — 육안 대조용.
        jobs.append({"svg": svg_path, "png": os.path.join(out_dir, f"{name}.png"),
                     "w": int(vw * 2), "h": int(vh * 2)})
        print(f"{name}: {int(vw)}×{int(vh)}")
    jobs_path = os.path.join(out_dir, "jobs.json")
    with open(jobs_path, "w", encoding="utf-8") as f:
        json.dump(jobs, f, ensure_ascii=False, indent=1)
    print(f"→ node scripts/figure/render-svg-shots.mjs {jobs_path}")


if __name__ == "__main__":
    main()
