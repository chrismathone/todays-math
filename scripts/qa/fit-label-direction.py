"""**RPM 은 이등분선을 «수평 쪽으로 얼마나» 당기는가** — 계수를 정본에서 맞춘다.

    python scripts/qa/fit-label-direction.py .tmp-orca/rpm-labels.json

## 왜 이 모형인가

RPM 지면을 확대해 보면 꼭짓점 이름표는 분명 **바깥쪽 대각 방향**에 있는데, 각도로
재면 **축(수평)에 더 가깝다**. 실측(2-2 p.45 평행사변형):

    A 이등분선 125° → 실제 159.8°   B 215° → 189.8°
    C 305° → 343.2°                 D  35° →  12.1°

넷 다 **수평 쪽으로 23~38° 당겨져** 있다. 전권 통계도 같은 말을 한다 —
어긋남이 «±45° 한 칸»에 39.2% 몰리고, 「수평으로 당김」이 47.5%(수직 37.2%)이며,
8방위 분포가 축(E·W·N·S) **70.6%** 대 대각선 29.4% 다. 이등분선을 그대로 쓰면
그 분포가 고르게 나와야 한다(우리 엔진이 실제로 그렇다 — 대각선 47.7%).

**글자는 가로로 쓴다.** 옆에 붙이면 읽기 쉽고 자리도 덜 먹는다 — 그래서 조판자는
이등분선 방향을 그대로 쓰지 않고 수평 쪽으로 당긴다. 그 «얼마나»를 여기서 맞춘다.

## 모형

세로 성분만 `k` 배로 눌러 다시 정규화한다(0<k<1 이면 수평 쪽으로 당겨진다):

    당김(θ, k) = atan2(k · sinθ, cosθ)

`k=1` 이면 이등분선 그대로. 격자로 훑어 **각도 오차 중앙값**이 가장 작은 `k` 를 고른다.

⚠️ 이 값은 **꼭짓점 이름표에서만** 뽑는다. 각 크기(`x`)·치수(`4 cm`)는 규칙이 다르다.
⚠️ 표본은 라벨 상자 **중심** 기준이다 — 거리가 0.6배로 짧아 상자 중심의 세로 위치가
   각도를 크게 흔든다. 그래서 이 계수는 «시각적 방향」이 아니라 **«우리가 자리를 잡을
   때 쓰는 바로 그 좌표계»에서의 값**이다. 엔진이 같은 기준으로 쓰면 맞다.
"""
from __future__ import annotations

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from label_placement import quantile  # noqa: E402


def is_point_name(text: str) -> bool:
    return len(text) == 1 and text.isascii() and text.isupper()


def pulled(deg: float, k: float) -> float:
    t = math.radians(deg)
    return math.degrees(math.atan2(k * math.sin(t), math.cos(t))) % 360


def err(a: float, b: float) -> float:
    return abs(((a - b + 180) % 360) - 180)


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else ".tmp-orca/rpm-labels.json"
    with open(path, encoding="utf-8") as fh:
        rows = json.load(fh)
    pairs = [
        (r["bis_deg"], r["abs_deg"])
        for r in rows
        if is_point_name(r.get("text", ""))
        and r.get("bis_deg") is not None
        and r.get("abs_deg") is not None
    ]
    if len(pairs) < 200:
        print(f"표본이 {len(pairs)}개뿐이다 — 못 맞춘다.")
        sys.exit(1)
    print(f"표본 {len(pairs)}개 (꼭짓점 이름표만)")
    print()
    print("   k      오차 중앙   75%     90%   |  ≤22.5° 안")
    best = None
    for i in range(1, 21):
        k = i / 10
        errs = [err(pulled(b, k), a) for b, a in pairs]
        med = quantile(errs, 0.5)
        row = (
            f"  {k:.1f}   {med:7.1f}°  {quantile(errs, 0.75):5.1f}°"
            f"  {quantile(errs, 0.9):5.1f}°  |"
            f"  {sum(1 for e in errs if e <= 22.5) / len(errs) * 100:5.1f}%"
        )
        print(row + ("   ← 가장 좋다" if best is None or med < best[1] else ""))
        if best is None or med < best[1]:
            best = (k, med)
    print()
    print(f"**가장 잘 맞는 k = {best[0]:.1f}** (오차 중앙 {best[1]:.1f}°)")
    base = [err(b, a) for b, a in pairs]
    print(f"참고 — 당기지 않으면(k=1) 오차 중앙 {quantile(base, 0.5):.1f}°")


if __name__ == "__main__":
    main()
