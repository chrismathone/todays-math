# -*- coding: utf-8 -*-
"""입체 kind 셋(hollowSolid·cutCuboid·revolvePlan)의 RPM 재현 산출기.

    python scripts/figure/probe-solid-kinds.py [출력디렉터리=C:/tmp/solid-kinds]
    node scripts/figure/render-svg-shots.mjs <출력디렉터리>/jobs.json

RPM 중학 1-2 의 표본 문항(유형07 0845~0848 · 유형08 0849~0851 · 유형14 · 유형20
0891)을 **모양만** 재현한다 — 본문·수치는 원본과 다르게 두었다(브리프 지시).
산출물이 아니라 산출기를 저장소에 남긴다(shot-round-ratio.py 와 같은 이유) —
원장님 육안 확정(D-07) 때 언제든 다시 낼 수 있어야 한다.

렌더는 제품과 같은 경로(render_spec.py → sanitize_svg)를 탄다 — 여기서만 되는
그림을 만들지 않기 위해서다.
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
    ("0845-cyl-in-cyl", {"version": "elem-1", "kind": "hollowSolid",
     "outer": {"shape": "cylinder", "r": 4, "h": 9}, "inner": {"shape": "cylinder", "r": 1.5}}),
    ("0846-box-in-box", {"version": "elem-1", "kind": "hollowSolid",
     "outer": {"shape": "cuboid", "w": 4, "d": 3, "h": 4.5}, "inner": {"shape": "cuboid", "w": 2.2, "d": 1.4}}),
    ("0847-cyl-in-cube", {"version": "elem-1", "kind": "hollowSolid",
     "outer": {"shape": "cuboid", "w": 5, "d": 5, "h": 5}, "inner": {"shape": "cylinder", "r": 1.6}}),
    ("0848-tall-box-in-box", {"version": "elem-1", "kind": "hollowSolid",
     "outer": {"shape": "cuboid", "w": 4, "d": 2.5, "h": 7}, "inner": {"shape": "cuboid", "w": 1.6, "d": 1.2}}),
    ("0849-top-front-notch", {"version": "elem-1", "kind": "cutCuboid", "w": 12, "d": 9, "h": 9,
     "cut": {"x": 3, "w": 5, "d": 3, "h": 6}}),
    ("0850-cube-notch", {"version": "elem-1", "kind": "cutCuboid", "w": 9, "d": 9, "h": 9,
     "cut": {"x": 5, "w": 4, "d": 3.5, "h": 4.5}}),
    ("0851-front-groove", {"version": "elem-1", "kind": "cutCuboid", "w": 11, "d": 6, "h": 9,
     "cut": {"x": 2, "w": 3.5, "d": 1.8}}),
    ("type08-corner-cut", {"version": "elem-1", "kind": "cutCuboid", "w": 8, "d": 8, "h": 8,
     "cut": {"x": 4.5, "w": 3.5, "d": 3, "h": 3.5}}),
    ("type14-1-rect", {"version": "elem-1", "kind": "revolvePlan",
     "pieces": [{"shape": "rect", "w": 3, "h": 5}]}),
    ("type14-2-tri", {"version": "elem-1", "kind": "revolvePlan",
     "pieces": [{"shape": "rightTri", "w": 3.5, "h": 5}]}),
    ("type14-3-trap", {"version": "elem-1", "kind": "revolvePlan",
     "pieces": [{"shape": "rightTrap", "w": 4, "w2": 2.5, "h": 4.5}]}),
    ("type14-4-semi", {"version": "elem-1", "kind": "revolvePlan",
     "pieces": [{"shape": "semicircle", "r": 3}]}),
    ("0738-4-steps", {"version": "elem-1", "kind": "revolvePlan",
     "pieces": [{"shape": "rect", "w": 4, "h": 2.5}, {"shape": "rect", "w": 2, "h": 3}]}),
    ("0891-tri-dims", {"version": "elem-1", "kind": "revolvePlan",
     "pieces": [{"shape": "rightTri", "w": 5, "h": 7, "wLabel": "5 cm", "hLabel": "7 cm"}]}),
]


def main() -> None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    out_dir = sys.argv[1] if len(sys.argv) > 1 else r"C:/tmp/solid-kinds"
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
