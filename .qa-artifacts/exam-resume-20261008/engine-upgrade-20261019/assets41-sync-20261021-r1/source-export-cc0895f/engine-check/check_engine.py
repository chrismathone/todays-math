# -*- coding: utf-8 -*-
"""엔진 반영 확인 — 아래 명세들을 대상 저장소의 render_spec.py 로 그려 기대 출력(expected/*.json)과 바이트 대조한다.

    python check_engine.py <대상 저장소 루트>          # 대조
    python check_engine.py <math-figure-editor 루트> --save   # 기대 출력 다시 만들기(앱에서만)

기대 출력은 math-figure-editor 엔진(2026-10-21, 이미지 생성 조각 41종)으로 만든 것이다. 모두 «같음»이면 엔진이 한 치 오차 없이 같다.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCENE = {"version": 2, "points": {"A": [325, 293], "B": [528, 377], "C": [708, 62], "D": [700, 243]},
         "segments": {"AB": ["A", "B"], "BD": ["B", "D"], "AC": ["A", "C"], "AD": ["A", "D"], "DC": ["D", "C"]},
         "labels": {"A": "A", "B": "B", "C": "C"}, "background": "transparent"}
CASES = {
    "grid": {"version": "graph-1", "xRange": [0, 16], "yRange": [0, 10], "axes": False, "width": 520, "height": 360,
             "grid": {"step": 1},
             "segments": [{"from": [0, 3], "to": [3, 9], "arrow": True}, {"from": [4, 6], "to": [2.5, 1], "arrow": True},
                          {"from": [8, 9], "to": [12, 7], "arrow": True}],
             "labels": [{"at": [1.6, 6], "text": "$\\vec{a}$", "dx": -10}, {"at": [3.2, 3.4], "text": "$\\vec{b}$", "dx": -12}]},
    "assets": dict(SCENE, assets=[{"asset": "building", "from": "D", "to": "C"},
                                  {"asset": "house", "at": "A", "anchor": "base", "width": 44}]),
    "assets-3d": dict(SCENE, assets=[{"asset": "building-3d", "from": "D", "to": "C"},
                                     {"asset": "house-3d", "at": "A", "anchor": "base", "width": 50}]),
    "perspective": dict(SCENE, angles={"rB": {"vertex": "B", "points": ["A", "D"], "right": True, "perspective": True}}),
    "units": {"version": 2, "points": {"A": [0, 0], "B": [200, 0], "v": [100, 20], "w": [100, -20]},
              "segments": {"AB": ["A", "B"]},
              "labels": {"v": {"text": "30 m", "dx": 0, "dy": 0}, "w": {"text": "5 g", "dx": 0, "dy": 0}},
              "background": "transparent"},
    "right-refused": dict(SCENE, angles={"rB": {"vertex": "B", "points": ["A", "D"], "right": True}}),
    "solid-object-refused": dict(SCENE, assets=[{"asset": "can", "at": "A", "width": 30}]),
}


def render(root: str, spec: dict) -> str:
    script = os.path.join(root, "scripts", "figure", "render_spec.py")
    run = subprocess.run([sys.executable, script], input=json.dumps(spec).encode("utf-8"), capture_output=True)
    return run.stdout.decode("utf-8")


def main() -> int:
    root = sys.argv[1]
    save = "--save" in sys.argv
    os.makedirs(os.path.join(HERE, "expected"), exist_ok=True)
    bad = 0
    for name, spec in CASES.items():
        path = os.path.join(HERE, "expected", f"{name}.json")
        got = render(root, spec)
        if save:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(got)
            print("저장", name, len(got))
            continue
        with open(path, encoding="utf-8") as f:
            want = f.read()
        same = got == want
        bad += not same
        print(("같음" if same else "다름"), name, len(got), "" if same else f"(기대 {len(want)})")
    if not save:
        print("결과:", "모두 같음" if not bad else f"{bad}개 다름")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
