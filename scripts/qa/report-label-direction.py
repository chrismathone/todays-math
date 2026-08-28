"""**꼭짓점 라벨을 «어느 방향»에 놓는가** — RPM 정본과 우리 그림을 한 표로 견준다.

    python scripts/qa/report-label-direction.py .tmp-orca/rpm-labels.json .tmp-orca/our-labels.json

원장님 지시(2026-08-28): 「A B C 라벨 같은거 위치가 제일 중요해. **꼭짓점의 위치에
따라 적절하게 있어야 한단 말야.** 그걸 RPM에서 학습하란 얘기야」.

## 앞 회차가 못 본 것

앞서 잰 것은 「**안쪽이냐 바깥이냐**」라는 **이진 축** 하나뿐이었다. 그 축은
「위 꼭짓점이면 위, 왼아래 꼭짓점이면 왼아래」라는 **방향 규칙**을 구조적으로 못 본다 —
바깥이기만 하면 어느 쪽이든 통과하기 때문이다. 그래서 여기서는 **방향 자체**를 센다.

## 무엇을 묻나

⑴ **라벨 방향이 8방위에 몰리는가?** 몰린다면 RPM 은 이등분선을 그대로 쓰는 게 아니라
   **여덟 칸 중 하나로 스냅**한다는 뜻이다(그러면 우리도 스냅해야 한다).
⑵ 몰린다면 **어느 칸이 흔한가** — 위·아래·좌우 중 어디를 좋아하나.
⑶ **이등분선에서 어느 쪽으로 얼마나 도는가**(부호 있는 편차). 한쪽으로 치우치면
   그건 잡음이 아니라 **규칙**이다.
⑷ 꼭짓점에 붙은 **변 수별**로 갈리는가(변 2개=다각형 꼭짓점 / 3개 이상=대각선이 모임).

⚠️ **표본을 눈으로 봐야 한다.** 이 표는 어디를 볼지 알려 줄 뿐이다.
"""
from __future__ import annotations

import json
import math
import sys
from collections import Counter

sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from label_placement import COMPASS8, quantile, snap8  # noqa: E402

# 꼭짓점 이름으로 볼 글자 — **홑 대문자**만. 각 크기(`x`)·치수(`4 cm`)는 규칙이 다르다.
def is_point_name(text: str) -> bool:
    return len(text) == 1 and text.isascii() and text.isupper()


def load(path: str) -> list:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def histogram(rows: list, key: str, title: str, width: int = 46) -> list[str]:
    """각도 히스토그램 — 10°씩. **몰림이 있으면 눈에 보인다.**"""
    bins = [0] * 36
    for r in rows:
        v = r.get(key)
        if v is None:
            continue
        bins[int((v % 360) // 10)] += 1
    top = max(bins) or 1
    out = [title]
    names = {0: "동", 9: "북", 18: "서", 27: "남"}
    for i, n in enumerate(bins):
        mark = f" ← {names[i]}" if i in names else ""
        bar = "█" * round(n / top * width)
        out.append(f"  {i * 10:3d}°~ {n:5d} {bar}{mark}")
    return out


def compass_table(rows: list, title: str) -> list[str]:
    out = [title]
    cnt = Counter(snap8(r.get("abs_deg")) for r in rows if r.get("abs_deg") is not None)
    total = sum(cnt.values()) or 1
    for name in ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]:
        n = cnt.get(name, 0)
        out.append(f"  {name:>2}  {n:5d}  {n / total * 100:5.1f}%  " + "█" * round(n / total * 200))
    return out


def snap_agreement(rows: list, title: str) -> list[str]:
    """실제 방향의 8방위 == 이등분선의 8방위 인가."""
    same = 0
    total = 0
    off = Counter()
    for r in rows:
        a, b = r.get("abs_deg"), r.get("bis_deg")
        if a is None or b is None:
            continue
        total += 1
        sa, sb = snap8(a), snap8(b)
        if sa == sb:
            same += 1
        else:
            ia, ib = COMPASS8.index(sa), COMPASS8.index(sb)
            off[((ia - ib) + 4) % 8 - 4] += 1
    out = [title]
    if total == 0:
        out.append("  (잴 것이 없다)")
        return out
    out.append(f"  같은 칸 {same}/{total} = **{same / total * 100:.1f}%**")
    for k in sorted(off):
        out.append(f"  {k * 45:+4d}° 칸  {off[k]:5d}  {off[k] / total * 100:5.1f}%")
    return out


def signed_shape(rows: list, title: str) -> list[str]:
    vals = [r["signed"] for r in rows if r.get("signed") is not None]
    out = [title]
    if not vals:
        return out + ["  (잴 것이 없다)"]
    pos = sum(1 for v in vals if v > 0)
    out.append(f"  표본 {len(vals)} · 반시계(+) {pos / len(vals) * 100:.1f}% · "
               f"시계(−) {(len(vals) - pos) / len(vals) * 100:.1f}%")
    for q in (0.1, 0.25, 0.5, 0.75, 0.9):
        out.append(f"  {int(q * 100):3d}%  {quantile(vals, q):+6.1f}°")
    out.append(f"  |편차| 중앙 {quantile([abs(v) for v in vals], 0.5):.1f}°")
    return out


def by_incident(rows: list, title: str) -> list[str]:
    out = [title]
    groups: dict[int, list] = {}
    for r in rows:
        groups.setdefault(r.get("incident", 0), []).append(r)
    for k in sorted(groups):
        g = [r for r in groups[k] if r.get("signed") is not None]
        if len(g) < 20:
            continue
        vals = [abs(r["signed"]) for r in g]
        same = sum(1 for r in g if snap8(r["abs_deg"]) == snap8(r["bis_deg"]))
        out.append(f"  변 {k}개  {len(g):5d}개 · 같은 칸 {same / len(g) * 100:5.1f}%"
                   f" · |편차| 중앙 {quantile(vals, 0.5):5.1f}°"
                   f" · 75% {quantile(vals, 0.75):5.1f}°")
    return out


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    for path in args:
        rows = [r for r in load(path) if is_point_name(r.get("text", ""))]
        print("=" * 72)
        print(f"{path} — **꼭짓점 이름표만** {len(rows)}개")
        print("=" * 72)
        print("\n".join(compass_table(rows, "\n── ⑵ 라벨이 앉는 8방위 (절대)")))
        print("\n".join(snap_agreement(
            rows, "\n── ⑴ 실제 방향의 칸 == 외각 이등분선의 칸 인가")))
        print("\n".join(signed_shape(
            rows, "\n── ⑶ 이등분선에서 어느 쪽으로 얼마나 도나 (+ 반시계)")))
        print("\n".join(by_incident(rows, "\n── ⑷ 붙은 변 수별")))
        print("\n".join(histogram(
            rows, "abs_deg", "\n── 절대 각도 분포 (몰리면 «스냅»이 있다는 뜻)")))
        print()


if __name__ == "__main__":
    main()
