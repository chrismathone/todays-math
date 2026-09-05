# -*- coding: utf-8 -*-
"""**그림이 지면에 적은 수와 맞는가** — 스펙 좌표를 되짚어 검산한다.

## 왜 있나

문2 를 손으로 좌표를 적어 그렸더니 $\\overline{AB}=6$·$\\overline{BC}=8$ 인데 **1:2** 로
나왔다. KaTeX 도 엔진도 그것을 결함으로 안 본다 — 좌표는 유효하고 그림은 멀쩡히
그려진다. **그럴듯하게 틀린 그림**이라 눈으로 봐야만 드러난다. 그래서 센다.

## 무엇을 재나

㉠ **각** — `angles` 의 라벨이 `NN°` 면 좌표에서 잰 각과 같아야 한다(허용 0.6°).
㉡ **길이 비** — `dimensions` 의 라벨이 순수한 수(또는 `12cm`)면, 한 그림 안에서
   **px/단위 배율이 하나**여야 한다(허용 1.5%). 배율 자체는 그림마다 달라도 된다.

## 🔴 이 판정기가 **못 보는 것**

- 라벨이 수가 아닌 것(`x`, `37cm` 같은 단위 혼용은 수만 뽑는다)은 못 잰다.
- **치수가 하나뿐인 그림은 비를 못 잰다** — 배율이 하나면 언제나 「일관」이다.
  그런 그림은 `치수 1개(비 못 잼)` 로 따로 찍는다. 0 을 「깨끗」으로 읽지 말 것.
- 발문이 주는 값 중 **그림에 안 적힌 것**(문6 의 `CD` 등)은 여기 안 온다.
"""
from __future__ import annotations

import json
import math
import pathlib
import re

HERE = pathlib.Path(__file__).parent
NUM = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*(?:cm|m)?\s*$")
DEG = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*°\s*$")

# 🔴 **기대 목록을 못 박는다.** 이것이 없어서 문12 를 통째로 빠뜨리고도
#    「스펙 17개 · 어긋남 0건」이 나왔다 — 분모를 안 적으면 «없는 것»이 안 보인다.
#    지면을 눈으로 세어 만든 목록이다(원본 상자 색인 `index.png` 로 대조).
EXPECTED = {"q01", "q02", "q04", "q05", "q06", "q07", "q08", "q09", "q10",
            "q11", "q12", "q13", "q14", "q15", "q16", "q17", "q18", "q19a", "q19b"}
# 문3 은 **글 상자**(㉠~㉣)라 그림이 아니다.
# 문14 는 원본이 지도 사진 위의 삼각형인데, 수학은 삼각형이 전부라 엔진으로 그렸다.
OUTSIDE = {"문3": "글 상자 — 그림이 아니다"}

ANGLE_TOL = 0.6      # 도
RATIO_TOL = 0.015    # 1.5%


def points_of(spec: dict) -> dict[str, tuple[float, float]]:
    out: dict[str, tuple[float, float]] = {}
    for name, item in (spec.get("points") or {}).items():
        if isinstance(item, list):
            out[name] = (float(item[0]), float(item[1]))
        elif isinstance(item, dict) and {"x", "y"} <= set(item):
            out[name] = (float(item["x"]), float(item["y"]))
    return out


def pair(item) -> tuple[str, str]:
    if isinstance(item, list):
        return str(item[0]), str(item[1])
    if "points" in item:
        return str(item["points"][0]), str(item["points"][1])
    return str(item["p1"]), str(item["p2"])


def check(path: pathlib.Path) -> list[str]:
    spec = json.loads(path.read_text(encoding="utf-8"))
    P = points_of(spec)
    bad: list[str] = []

    # ㉠ 각
    for name, item in (spec.get("angles") or {}).items():
        m = DEG.match(str(item.get("label", "")))
        if not m:
            continue
        v = item.get("vertex")
        p1, p2 = pair(item)
        if not all(k in P for k in (v, p1, p2)):
            bad.append(f"{name}: 점이 raw 가 아니라 못 잼")
            continue
        a = (P[p1][0] - P[v][0], P[p1][1] - P[v][1])
        b = (P[p2][0] - P[v][0], P[p2][1] - P[v][1])
        cos = (a[0] * b[0] + a[1] * b[1]) / (math.hypot(*a) * math.hypot(*b))
        got = math.degrees(math.acos(max(-1.0, min(1.0, cos))))
        want = float(m.group(1))
        if abs(got - want) > ANGLE_TOL:
            bad.append(f"{name}: 적힌 {want}° · 그림 {got:.1f}°")

    # ㉡ 길이 비 — 한 그림 안에서 px/단위 배율이 하나여야 한다
    scales: list[tuple[str, float]] = []
    for name, item in (spec.get("dimensions") or {}).items():
        m = NUM.match(str(item.get("label", "")))
        if not m:
            continue
        p1, p2 = pair(item)
        if p1 not in P or p2 not in P:
            continue
        px = math.dist(P[p1], P[p2])
        scales.append((name, px / float(m.group(1))))
    if len(scales) >= 2:
        lo = min(s for _, s in scales)
        hi = max(s for _, s in scales)
        if (hi - lo) / lo > RATIO_TOL:
            detail = " · ".join(f"{n}={s:.2f}px/단위" for n, s in scales)
            bad.append(f"길이 비가 어긋난다 ({detail})")
    return bad


def main() -> int:
    specs = sorted((HERE / "spec").glob("q*.json"))
    if not specs:
        print("[중단] 스펙이 없다 — 분모가 비면 «깨끗»이 공짜다")
        return 2
    have = {p.stem for p in specs}
    missing = sorted(EXPECTED - have)
    extra = sorted(have - EXPECTED)
    if missing:
        print(f"[중단] 기대 목록에 있는데 **없는 그림**: {', '.join(missing)}")
        return 2
    if extra:
        print(f"[중단] 기대 목록에 **없는** 그림이 있다: {', '.join(extra)} — 목록을 고치거나 지워라")
        return 2
    print(f"기대 목록 {len(EXPECTED)}장 전부 있다 (엔진 밖: {', '.join(OUTSIDE)})")

    # 🔴 양성 대조 — 일부러 틀린 스펙을 대 본다. 안 걸리면 이 판정기는 눈이 멀었다.
    probe = HERE / "spec" / "_probe.json"
    probe.write_text(json.dumps({
        "version": 2,
        "points": {"A": [0, 0], "B": [100, 0], "C": [0, 100]},
        "angles": {"bad": {"vertex": "A", "points": ["B", "C"], "label": "45°"}},
        "dimensions": {"d1": {"points": ["A", "B"], "label": "1"},
                       "d2": {"points": ["A", "C"], "label": "2"}},
    }, ensure_ascii=False), encoding="utf-8")
    gauge = check(probe)
    probe.unlink()
    if len(gauge) < 2:
        print(f"[중단] 눈금이 안 걸린다 ({gauge}) — 판정을 거부한다")
        return 2
    print(f"눈금 통과 — 일부러 틀린 스펙에서 {len(gauge)}건을 잡았다\n")

    total = 0
    onedim = []
    for p in specs:
        bad = check(p)
        spec = json.loads(p.read_text(encoding="utf-8"))
        n = sum(1 for i in (spec.get("dimensions") or {}).values()
                if NUM.match(str(i.get("label", ""))))
        if n == 1:
            onedim.append(p.stem)
        if bad:
            total += len(bad)
            print(f"[{p.stem}]")
            for b in bad:
                print(f"   · {b}")
    print(f"\n스펙 {len(specs)}개 · 어긋남 {total}건")
    if onedim:
        print(f"⚠️ 치수가 하나뿐이라 **비를 못 잰** 그림: {', '.join(onedim)}")
    return 1 if total else 0


raise SystemExit(main())
