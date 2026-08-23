# -*- coding: utf-8 -*-
"""도형 kind 쌍의 **윤곽 거리**를 전 쌍 재어 «가장 가까운 짝»부터 찍는다.

    python scripts/qa/measure-shape-distance.py            # ⑧ 목록 (고르기)
    python scripts/qa/measure-shape-distance.py --all      # ⑧ + 정n각형 (② 목록)

## 왜 따로 있나

09 §4-19: 「좌표를 고치면 **전 쌍을 다시 재라** — 한 짝을 벌리다 다른 짝이 좁아진다.」
그런데 시험은 「전부 6px 넘음 ✅」만 찍는다. 그러면 **어디가 아슬아슬한지**를 다음에
도형을 더하는 사람이 **또 재야 한다.** 이 도구는 그 수를 남기는 자리다.

「전부 통과」가 아니라 **「가장 가까운 짝과 그 거리」**를 찍는다 — 문턱까지 얼마나
남았는지가 곧 「도형을 하나 더 넣을 여유가 있나」다.

## 이 도구가 답하는 물음

- ⑧(`namedShapes`, 고르기)에 도형을 더해도 되나 → `--` 기본 회차
- **정n각형을 ⑧ 에 넣으면 안 되는 이유** → `--all` 회차 (원에 수렴해 서로 안 갈린다)
"""
from __future__ import annotations

import io
import math
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO, "vendor", "figure-engine"))
sys.path.insert(0, os.path.join(REPO, "scripts", "figure"))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import elementary as E  # noqa: E402

SLOT = 44.0  # `_named_shapes` 가 쓰는 크기와 같다 — 다른 크기로 재면 다른 수가 나온다


def outline(kind: str) -> list[tuple[float, float]]:
    """윤곽을 변을 따라 촘촘히 뿌린 점들. 꼭짓점만 보면 「변 하나가 통째로 다른」 짝을
    못 본다(시험의 `shapeOutlines` 와 같은 뜻)."""
    pts = E._shape_points(kind, 0.0, 0.0, SLOT)
    # 무게중심을 원점으로 — 자리(슬롯 위치)가 아니라 **모양**을 견준다.
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    out: list[tuple[float, float]] = []
    n = len(pts)
    for i in range(n):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % n]
        for t in range(24):
            f = t / 24
            out.append((ax + (bx - ax) * f - cx, ay + (by - ay) * f - cy))
    return out


def hausdorff(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> float:
    def one(p: list[tuple[float, float]], q: list[tuple[float, float]]) -> float:
        return max(min(math.dist(x, y) for y in q) for x in p)

    return max(one(a, b), one(b, a))


def main() -> None:
    with_ngon = "--all" in sys.argv
    kinds = sorted(E._SHAPE_KINDS | (E._NGON_KINDS if with_ngon else frozenset()))
    label = "⑧ + 정n각형 (② 목록)" if with_ngon else "⑧ 고르기 목록"
    outs = {k: outline(k) for k in kinds}

    pairs: list[tuple[float, str, str]] = []
    for i, a in enumerate(kinds):
        for b in kinds[i + 1 :]:
            pairs.append((hausdorff(outs[a], outs[b]), a, b))
    pairs.sort()

    print(f"── {label} · {len(kinds)}종 · {len(pairs)}쌍 (슬롯 {SLOT:g}) ──\n")
    print("가장 닮은 짝부터 (문턱 6px):")
    for d, a, b in pairs[:10]:
        mark = "🔴" if d < E.SHAPE_MIN_DISTANCE else "  "
        print(f"  {mark} {a:12s} ↔ {b:12s} {d:6.2f}px")
    floor = pairs[0][0]
    print(f"\n바닥 = {floor:.2f}px · 문턱 {E.SHAPE_MIN_DISTANCE:g}px · "
          f"여유 {floor - E.SHAPE_MIN_DISTANCE:+.2f}px")
    bad = [(d, a, b) for d, a, b in pairs if d < E.SHAPE_MIN_DISTANCE]
    if bad:
        print(f"\n🔴 문턱 아래 {len(bad)}쌍 — 이 목록으로는 「고르시오」가 성립하지 않는다")
        for d, a, b in bad:
            print(f"     {a} ↔ {b} {d:.2f}px")
    else:
        print("\n✅ 전 쌍이 문턱 위 — 도형을 하나 더 넣을 여유는 위 «바닥»이 말한다")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
