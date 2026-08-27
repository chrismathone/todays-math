# -*- coding: utf-8 -*-
"""치수 점선이 **도형 바깥**에 있는가 — 전량 판정기.

원장님 지적(2026-08-27): 「길이 점선이 도형 안쪽으로 되어 있는 게 전부 있을
텐데 바깥으로 빼야겠다.」 화면에서 이등변삼각형의 치수 점선이 도형을 가로지르고
라벨이 겹쳐 보였다(`1111 cm`).

## 어떻게 재나 — 눈이 아니라 좌표로

`measured()` 가 그리는 점선은 `stroke-dasharray` 를 단 path/polyline 이다.
그 점들이 도형 다각형 **안**에 있으면 지면에서 도형을 가로지른다.
점 하나가 아니라 **점선 위 여러 점**을 보고, 안에 든 비율로 판정한다.

⚠️ 도형 윤곽선 자체도 점선일 수 있다(숨은 모서리 등). 그래서 **치수 점선만**
   고른다 — `measured()` 는 라벨 `<text>` 와 짝지어 나오므로, 라벨과 가까운
   점선만 센다.

쓰기:
  python scripts/qa/probe-dim-outside.py            # 전량
  python scripts/qa/probe-dim-outside.py --selftest # 이 판정기가 눈이 멀었나
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# 제품이 쓰는 도형 엔진 경로를 **그대로** 탄다 — core.figure_svg 는 저장소 밖
# 의존물이고, 못 찾으면 `measured()` 가 ModuleNotFoundError 로 죽는다. 그러면
# **치수가 있는 그림이 통째로 예외로 빠져** 이 판정기가 「잰 그림 3」만 내놓는다
# (실측 — 실제로는 143개다). 0 은 «깨끗»과 «못 셈»을 안 가른다.
_REPO = Path(__file__).resolve().parents[1].parent
for _p in (
    Path(_REPO, "vendor", "figure-engine"),
    Path(r"F:/시험지변환기"),
):
    if _p.is_dir():
        sys.path.insert(0, str(_p))
        break
else:
    raise SystemExit("🔴 도형 엔진을 못 찾았다 — 이 판정기는 아무것도 못 잰다")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "figure"))

_NUM = r"-?\d+(?:\.\d+)?"


def points_in_polygon(pts, poly):
    """다각형 안에 든 점 수 — 광선 교차."""
    inside = 0
    for x, y in pts:
        c = False
        j = len(poly) - 1
        for i in range(len(poly)):
            xi, yi = poly[i]
            xj, yj = poly[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi:
                c = not c
            j = i
        if c:
            inside += 1
    return inside


def parse_polygon(svg: str):
    """가장 큰 `<polygon points=…>` — 도형 윤곽."""
    best = None
    for m in re.finditer(r'<polygon[^>]*points="([^"]+)"', svg):
        pts = [
            tuple(float(v) for v in p.replace(",", " ").split())
            for p in re.findall(rf"{_NUM}[ ,]{_NUM}", m.group(1))
        ]
        if len(pts) < 3:
            continue
        area = abs(
            sum(
                pts[i][0] * pts[(i + 1) % len(pts)][1]
                - pts[(i + 1) % len(pts)][0] * pts[i][1]
                for i in range(len(pts))
            )
        ) / 2
        if best is None or area > best[0]:
            best = (area, pts)
    return best[1] if best else None


# `measured()` 가 그리는 치수 곡선의 지문. 저장소 밖 엔진
# (`vendor/figure-engine/core/figure_svg.py`)의 `meas()` 가 늘 이 셋으로 그린다.
#
# 🔴 **왜 «점선이면 치수»가 아닌가** — 지면의 점선은 세 부류다(2026-08-27 실측,
#    문형 2,300 이 내는 그림 936장 전량):
#      · `#000`    1.4  `6 4`  — **치수**            364건, **100% 가 수 라벨 곁**
#      · `#111111` 1~1.2 `5 4` — 숨은 모서리·분할선  538건
#      · `#111111` 0.4  `3 3`  — 직각·등변 표시      475건
#      · `#c8d7e4` 0.7  `4 3`  — 모눈                871건
#    「점선이 도형 안에 있다」로 재면 **숨은 모서리가 전부 결함으로 잡힌다** —
#    숨은 모서리는 **안에 있는 것이 옳다.** 실제로 그렇게 재서 141건이 나왔고
#    그 중 **125건이 오인**이었다(진짜는 13건). 열쇠를 «점선»에서 «치수의
#    지문»으로 바꾸면 분모(잰 그림 111)는 그대로고 결함만 갈린다.
#
#    ⚠️ 이 지문이 낡으면 이 판정기는 **조용히 0을 낸다**(치수를 하나도 못 찾으므로
#    `judge` 가 None 을 돌려준다). 그래서 `main()` 이 «치수를 가진 그림»의 수를
#    함께 찍고, 0이면 멈춘다 — 「깨끗」과 「못 셈」을 가르기 위해서다.
_MEASURED_STROKE = 'stroke="#000"'
_MEASURED_WIDTH = 'stroke-width="1.4"'


def parse_dashed_points(svg: str):
    """**치수** 점선의 좌표들 — 구조 점선(숨은 모서리·표시·모눈)은 세지 않는다."""
    out = []
    for m in re.finditer(r"<(path|polyline|line)\b([^>]*)>", svg):
        attrs = m.group(2)
        if "stroke-dasharray" not in attrs:
            continue
        if _MEASURED_STROKE not in attrs or _MEASURED_WIDTH not in attrs:
            continue
        nums = [float(v) for v in re.findall(_NUM, attrs.split("d=")[-1] if "d=" in attrs else attrs)]
        d = re.search(r'd="([^"]+)"', attrs)
        p = re.search(r'points="([^"]+)"', attrs)
        if d:
            vals = [float(v) for v in re.findall(_NUM, d.group(1))]
        elif p:
            vals = [float(v) for v in re.findall(_NUM, p.group(1))]
        else:
            vals = [
                float(re.search(rf'{a}="({_NUM})"', attrs).group(1))
                for a in ("x1", "y1", "x2", "y2")
                if re.search(rf'{a}="({_NUM})"', attrs)
            ]
        for i in range(0, len(vals) - 1, 2):
            out.append((vals[i], vals[i + 1]))
    return out


def judge(svg: str):
    """(안에 든 점, 전체 점). 전체가 0이면 잴 수 없다."""
    poly = parse_polygon(svg)
    if not poly:
        return None
    pts = parse_dashed_points(svg)
    if not pts:
        return None
    return points_in_polygon(pts, poly), len(pts)


_TRI = '<polygon points="10,10 90,10 50,90"/>'
_MEAS = 'stroke="#000" stroke-width="1.4" stroke-dasharray="6 4"'
_HIDDEN = 'stroke="#111111" stroke-width="1" stroke-dasharray="5 4"'

GAUGE = [
    # 삼각형 (10,10)-(90,10)-(50,90) 안쪽을 지나는 **치수** → 잡는다
    ("안쪽 치수를 잡는다", True, _TRI + f'<polyline points="30,30 60,40" {_MEAS}/>'),
    ("🔴 바깥 치수는 안 잡는다", False, _TRI + f'<polyline points="5,95 95,95" {_MEAS}/>'),
    # 🔴 **음성 대조** — 숨은 모서리는 안에 있는 것이 옳다. 이것을 잡으면
    #    2026-08-27 의 「141건」이 되돌아온다(그 중 125건이 이 부류였다).
    (
        "🔴 안쪽 숨은 모서리는 치수가 아니다",
        False,
        _TRI + f'<line x1="30" y1="30" x2="60" y2="40" {_HIDDEN}/>',
    ),
    # 🔴 같은 자리에 치수와 숨은 모서리가 **겹쳐** 있어도 치수만 센다.
    (
        "🔴 겹쳐 있어도 치수만 센다 (바깥 치수 + 안쪽 숨은선)",
        False,
        _TRI
        + f'<polyline points="5,95 95,95" {_MEAS}/>'
        + f'<line x1="30" y1="30" x2="60" y2="40" {_HIDDEN}/>',
    ),
]


def selftest():
    bad = 0
    for why, want, svg in GAUGE:
        got = judge(svg)
        hit = got is not None and got[0] > 0
        if hit != want:
            bad += 1
        print(f"  {'✅' if hit == want else '❌'} {why} — 기대 {want} / 실제 {hit}")
    print(
        f"\n✅ 눈금 {len(GAUGE)}건 전부 맞다"
        if bad == 0
        else f"\n❌ 눈금 {bad}건 어긋남 — 가드를 믿을 수 없다"
    )
    return 0 if bad == 0 else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    from elementary import render_elementary  # noqa: E402

    specs = json.loads(Path(sys.argv[sys.argv.index("--specs") + 1]).read_text("utf-8"))
    inside_total = tested = 0
    bad = []
    for s in specs:
        try:
            svg = render_elementary(s)
        except Exception:
            continue
        got = judge(svg)
        if got is None:
            continue
        tested += 1
        if got[0] > 0:
            inside_total += 1
            if len(bad) < 12:
                bad.append(f"{s.get('kind')}/{s.get('shape', '')} — 점 {got[0]}/{got[1]} 이 안쪽")
    print(f"잰 그림 {tested} · **치수 점선이 안쪽인 것 {inside_total}**")
    for b in bad:
        print("   " + b)
    # 🔴 «0» 이 «깨끗»인지 «못 셈»인지 가른다. 치수 지문(`_MEASURED_*`)이 낡으면
    #    한 장도 못 재면서 「안쪽 0」을 낸다 — 그때 멈춘다.
    if tested == 0:
        print("🔴 치수를 가진 그림을 **한 장도 못 찾았다** — 지문이 낡았다. 0은 «깨끗»이 아니다.")
        return 1
    return 1 if inside_total else 0


if __name__ == "__main__":
    raise SystemExit(main())
