# -*- coding: utf-8 -*-
"""**점 이름표가 제 점에서 얼마나 밀렸나** — 19장 전량을 잰다.

## 왜 있나

원장님이 문4 를 짚으셨다(2026-09-05): 「B 위치를 옮겨야할듯? 치수선에 가려서 B가 너무
멀리 있는데」. 자동 배치가 직각 표시와 아래 치수 「1」을 둘 다 피하려다 B 를 **D 쪽으로
멀리** 밀어냈고, 지면에서 B 가 어느 점인지 안 보였다.

원장님이 화면에서 찾아 주시는 것은 **대개 부류의 하나**다. 그래서 하나를 고치고 끝내지
않고, 「밀린 이름표」를 세는 축을 세운다.

## 무엇을 재나 — **엔진에게 물어본다**

거리를 SVG 에서 되짚지 않는다. `resolve()` 가 점 좌표와 이름표 자리를 **둘 다** 돌려주므로
그것을 그대로 쓴다(규칙을 옮겨 적으면 조판과 자가 갈라진다).

    밀림 = |이름표 자리 − 그 점| / 글자 크기

글자 크기로 나누는 이유: 그림마다 배율이 달라 px 로 재면 큰 그림이 늘 나쁘게 나온다.

## 🔴 이 자가 «아니오»를 낼 수 있는가

판정 전에 **일부러 밀어 놓은 스펙**을 댄다(양성 대조). 그게 안 걸리면 판정을 거부한다 —
0 은 「깨끗」과 「못 셈」을 안 가른다.
"""
from __future__ import annotations

import json
import math
import pathlib
import sys

# 저장소 어디에서 부르든 같은 엔진을 쓰게 — 절대경로도 깊이도 박지 않는다.
def _repo_root() -> pathlib.Path:
    """`package.json` 이 있는 곳까지 올라간다 — 깊이를 세면 폴더를 옮길 때 조용히 틀린다."""
    here = pathlib.Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "package.json").is_file():
            return parent
    raise SystemExit("[중단] 저장소 뿌리를 못 찾았다 (package.json 없음)")


sys.path.insert(0, str(_repo_root() / "vendor" / "figure-engine"))
from core.figure_scene import compile_figure_spec  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

HERE = pathlib.Path(__file__).parent

#: 이 배수를 넘으면 「멀다」.
#:
#: 🔴 **손으로 고르지 않았다 — 분포에서 골랐다.** 처음엔 근거 없이 1.9 로 뒀는데,
#:    원장님이 짚으신 옛 q04 의 B 를 실제로 재 보니 **1.98** 이었다. 문턱이 결함에
#:    0.08 밖에 안 떨어져 있으면, 조금만 덜 밀린 같은 부류를 그대로 놓친다.
#:
#:    실측(19장 · 이름표 85개):
#:      정상 최대  1.43  (q10 T · q07 A · q08 D · q12 F · q08 A — 눈으로 확인, 전부 제 점에 붙어 있다)
#:      결함       1.98  (원장님이 짚은 옛 q04 의 B)
#:    사이 1.43~1.98 이 **비어 있으므로** 그 가운데를 쓴다.
FAR = 1.70


def measure(spec: dict) -> list[tuple[str, float]]:
    scene = compile_figure_spec(spec)
    r = scene.resolve()
    fs = float(spec.get("style", {}).get("font_size", scene.style.font_size))
    out: list[tuple[str, float]] = []
    for name, pos in r.label_positions.items():
        pt = r.points.get(name)
        if pt is None:
            continue
        d = math.dist((pt.x, pt.y), pos)
        out.append((name, d / fs))
    return sorted(out, key=lambda t: -t[1])


def main() -> int:
    # ── 양성 대조 — 일부러 멀리 민 이름표가 걸려야 한다 ────────────────────
    probe = {
        "version": 2,
        "points": {"A": [0, 0], "B": [100, 0], "C": [0, 80]},
        "segments": {"AB": ["A", "B"], "AC": ["A", "C"], "BC": ["B", "C"]},
        "labels": {"A": "A", "B": "B",
                   "C": {"text": "C", "dx": 60, "dy": 40}},
    }
    hits = [n for n, d in measure(probe) if d > FAR]
    if "C" not in hits:
        print(f"[중단] 눈금이 안 걸린다 ({measure(probe)}) — 판정을 거부한다")
        return 2
    print(f"눈금 통과 — 일부러 민 이름표가 {dict(measure(probe))['C']:.2f}배로 걸렸다\n")

    rows = []
    for path in sorted((HERE / "spec").glob("q*.json")):
        spec = json.loads(path.read_text(encoding="utf-8"))
        for name, d in measure(spec):
            rows.append((path.stem, name, d))
    rows.sort(key=lambda t: -t[2])

    far = [r for r in rows if r[2] > FAR]
    print(f"{'그림':>6} {'점':>4} {'밀림(글자배수)':>14}")
    for stem, name, d in rows[:12]:
        mark = "  ← 멀다" if d > FAR else ""
        print(f"{stem:>6} {name:>4} {d:14.2f}{mark}")
    print(f"\n이름표 {len(rows)}개 · {FAR}배 넘게 밀린 것 {len(far)}개")
    if far:
        for stem, name, d in far:
            print(f"   · {stem} 의 {name} ({d:.2f}배)")
    return 1 if far else 0


raise SystemExit(main())
