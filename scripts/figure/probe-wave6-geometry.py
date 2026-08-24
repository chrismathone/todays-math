"""물결 6 실렌더 판정 — **남은 158유형이 지금 엔진으로 그려지는가.**

왜 유형 세션보다 먼저 도는가: 남은 158 중 **141이 기하**다. 「스키마에 `arcs` 키가
있다」와 「작도 자국이 실제로 그려진다」는 다른 말이고, 그 차이는 **렌더해 봐야**
드러난다. 이걸 안 하고 다섯 세션을 띄우면 절반쯤 짜고 「그림이 없다」로 막힌다
(물결 3~5 에서 배운 순서다 — 3C·4A 판정이 실제로 그렇게 막아 줬다).

판정은 **양쪽**을 본다:
  · 그려져야 하는 것이 그려지나 (양성)
  · 안 되는 것이 **던지나** (음성) — 조용히 이상한 그림을 내면 그게 더 나쁘다

    PYTHONIOENCODING=utf-8 python scripts/figure/probe-wave6-geometry.py

산출: docs/planning/tracks/wave6-geometry-sheet/index.html
"""

from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "planning" / "tracks" / "wave6-geometry-sheet"
RENDER = ROOT / "scripts" / "figure" / "render_spec.py"

CX, CY, R = 120.0, 95.0, 70.0
DEG = math.pi / 180.0


def r2(v: float) -> float:
    return round(v * 100) / 100


def polar(deg: float, radius: float = R, cx: float = CX, cy: float = CY):
    """수학각(도) → SVG 좌표 (y-down). 엔진 `circle_pt` 와 같은 규약."""
    return [r2(cx + radius * math.cos(deg * DEG)), r2(cy - radius * math.sin(deg * DEG))]


def mid(p: list[float], q: list[float]) -> list[float]:
    """중점 — 엔진에 `midpoint` 점 종류가 없어 빌더가 계산한다."""
    return [r2((p[0] + q[0]) / 2), r2((p[1] + q[1]) / 2)]


def on_circle(deg: float, circle: str = "c"):
    return {"type": "on_circle", "circle": circle, "angle": r2(deg)}


def render(spec: dict) -> tuple[str, str]:
    """→ (svg, error). 엔진은 늘 0 으로 끝나고 JSON 한 줄만 낸다."""
    p = subprocess.run(
        [sys.executable, str(RENDER)],
        input=json.dumps(spec, ensure_ascii=False).encode("utf-8"),
        capture_output=True,
    )
    try:
        got = json.loads(p.stdout.decode("utf-8"))
    except Exception:
        return "", f"엔진 응답을 못 읽었습니다: {p.stdout[:200]!r} / {p.stderr[:200]!r}"
    return got.get("svg", ""), got.get("error", "")


# ─────────────────────────────────────────────────────────────
# 표본 — 남은 중단원마다 «그 단원의 대표 그림» 하나씩
# ─────────────────────────────────────────────────────────────


def s_base_angles() -> dict:
    """1-2 기본 도형 — 맞꼭지각·평각. 두 직선이 한 점에서 만난다."""
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {
            "O": [CX, CY],
            "A": polar(160), "B": polar(340),
            "C": polar(35), "D": polar(215),
        },
        "segments": {"AB": ["A", "B"], "CD": ["C", "D"]},
        "angles": {
            "x": {"vertex": "O", "points": ["B", "C"], "label": "x"},
            "y": {"vertex": "O", "points": ["A", "D"], "label": "y"},
        },
        "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "O": "O"},
    }


def s_position_parallel() -> dict:
    """1-2 위치 관계 — 평행선과 동위각·엇각. `parallel` 표시가 핵심."""
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {
            "A": [20, 60], "B": [220, 60],
            "C": [20, 140], "D": [220, 140],
            # ⚠️ X·Y 는 가로선과 t 의 **정확한** 교점이어야 한다. 눈대중으로 적었더니
            # 엔진이 「angle 'a' ray to 'Q' is not covered by a rendered segment」로
            # 잡았다 — 각의 변이 실제 선분 위에 없으면 그림이 거짓말을 한다.
            # t: P(60,20) → Q(180,180). y=60 → x=90 · y=140 → x=150.
            "P": [60, 20], "Q": [180, 180],
            "X": [90.0, 60.0], "Y": [150.0, 140.0],
        },
        "segments": {
            "l": {"points": ["A", "B"], "parallel": 1},
            "m": {"points": ["C", "D"], "parallel": 1},
            "t": {"points": ["P", "Q"]},
        },
        "angles": {
            "a": {"vertex": "X", "points": ["B", "Q"], "label": "65°"},
            "b": {"vertex": "Y", "points": ["D", "Q"], "label": "x"},
        },
        "labels": {"A": "l", "C": "m", "P": "t"},
    }


def s_construction() -> dict:
    """1-2 작도와 합동 — **컴퍼스 자국.** 각의 이등분선 작도.

    이게 이번 판정의 핵심이다. 작도는 「그리다 만 호」가 지면에 남아야 하는데,
    그 부류를 v2 가 그리는지 아무도 확인한 적이 없다.
    """
    A = [30.0, 160.0]
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {
            "A": A,
            "B": [220.0, 160.0],
            "C": [150.0, 30.0],
            # ⚠️ 호의 끝점은 **엔진이 계산한 원 위의 점**이어야 한다. 손으로 계산해
            # 소수 둘째 자리에서 반올림했더니 residual 0.0023 으로 던졌다.
            # (4D 브리프가 「호 끝점은 반드시 on_circle 로」라고 적어 둔 바로 그 자리다.)
            "P": on_circle(0, "k"),
            "Q": on_circle(39.6, "k"),
            "R": [190.0, 100.0],
        },
        "circles": {
            "k": {"center": "A", "radius": 60, "draw": False},
        },
        "segments": {"AB": ["A", "B"], "AC": ["A", "C"], "AR": ["A", "R"]},
        "arcs": {
            "j1": {"circle": "k", "from": "P", "to": "Q", "dir": "ccw"},
        },
        "labels": {"A": "A", "B": "B", "C": "C", "P": "P", "Q": "Q"},
    }


def s_polygon() -> dict:
    """1-2 다각형 — 오각형의 내각과 대각선."""
    pts = {}
    names = ["A", "B", "C", "D", "E"]
    for i, n in enumerate(names):
        pts[n] = polar(90 + i * 72, 68)
    segs = {f"s{i}": [names[i], names[(i + 1) % 5]] for i in range(5)}
    segs["AC"] = ["A", "C"]
    segs["AD"] = ["A", "D"]
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": pts,
        "segments": segs,
        "angles": {"b": {"vertex": "B", "points": ["A", "C"], "label": "x"}},
        "labels": {n: n for n in names},
    }


def s_sector() -> dict:
    """1-2 원과 부채꼴 — **부채꼴 색칠.** `regions` 가 닫힌 사슬을 받는가."""
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {"O": [CX, CY], "A": on_circle(0), "B": on_circle(120)},
        "circles": {"c": {"center": "O", "radius": R}},
        "segments": {"OA": ["O", "A"], "OB": ["O", "B"]},
        "arcs": {"ab": {"circle": "c", "from": "A", "to": "B", "dir": "ccw"}},
        "regions": {
            "shade": {
                "boundary": [
                    {"seg": ["O", "A"]},
                    {"arc": {"circle": "c", "from": "A", "to": "B", "dir": "ccw"}},
                    {"seg": ["B", "O"]},
                ],
                "fill": "#e8eef8",
            }
        },
        "angles": {"t": {"vertex": "O", "points": ["A", "B"], "label": "120°"}},
        "labels": {"O": "O", "A": "A", "B": "B"},
    }


def s_circum_incircle() -> dict:
    """2-2 외심과 내심 — 삼각형 + 외접원 + 수직이등분선 표시."""
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {
            "O": [CX, CY],
            # ⚠️ v2 에는 `midpoint` 점 종류가 **없다**(on_circle·intersection 둘뿐).
            # 중점은 빌더가 좌표로 계산해야 하는데, 그러려면 **끝점도 좌표여야** 한다 —
            # `on_circle` 은 좌표가 아니라 「엔진이 계산해 달라」는 스펙 조각이라
            # 중점을 낼 수 없다. 그래서 B·C 는 polar() 로 직접 찍는다.
            "A": on_circle(105),
            "B": polar(215), "C": polar(330),
            "M": mid(polar(215), polar(330)),
        },
        "circles": {"c": {"center": "O", "radius": R}},
        "segments": {
            "AB": ["A", "B"], "CA": ["C", "A"],
            # ⚠️ 각의 변은 **꼭짓점에서 시작하는 선분**이어야 한다. BC 를 통째로 그리면
            # M 이 그 «안»에 있어서 「ray to 'C' is not covered」로 던진다.
            # BM·MC 로 가르는 것이 수학적으로도 맞다 — 수직이등분선이 BC 를 M 에서 만난다.
            "BM": {"points": ["B", "M"], "ticks": 1},
            "MC": {"points": ["M", "C"], "ticks": 1},
            "OA": {"points": ["O", "A"], "ticks": 2},
            "OB": {"points": ["O", "B"], "ticks": 2},
            "OM": ["O", "M"],
        },
        "angles": {"r": {"vertex": "M", "points": ["O", "C"], "right": True}},
        "labels": {"A": "A", "B": "B", "C": "C", "O": "O", "M": "M"},
    }


def s_parallelogram() -> dict:
    """2-2 평행사변형 — 평행 표시 + 대각선 교점."""
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {
            "A": [40.0, 150.0], "B": [150.0, 150.0],
            "C": [200.0, 60.0], "D": [90.0, 60.0],
            "P": {"type": "intersection", "segments": ["AC", "BD"]},
        },
        "segments": {
            "AB": {"points": ["A", "B"], "parallel": 1},
            "DC": {"points": ["D", "C"], "parallel": 1},
            "AD": {"points": ["A", "D"], "parallel": 2},
            "BC": {"points": ["B", "C"], "parallel": 2},
            "AC": ["A", "C"], "BD": ["B", "D"],
        },
        "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "P": "P"},
    }


def s_centroid() -> dict:
    """2-2 삼각형의 무게중심 — 중선 셋과 교점. `midpoint`·`intersection` 이 핵심."""
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {
            "A": [120.0, 25.0], "B": [30.0, 165.0], "C": [215.0, 165.0],
            # v2 에 midpoint 가 없어 좌표로 계산한다 (위 외심 표본과 같은 사유).
            "D": mid([30.0, 165.0], [215.0, 165.0]),
            "E": mid([215.0, 165.0], [120.0, 25.0]),
            "G": {"type": "intersection", "segments": ["AD", "BE"]},
        },
        "segments": {
            "AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"],
            "AD": ["A", "D"], "BE": ["B", "E"],
            "BD": {"points": ["B", "D"], "ticks": 1},
            "DC": {"points": ["D", "C"], "ticks": 1},
        },
        "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "G": "G"},
    }


def s_pythagoras() -> dict:
    """2-2 피타고라스 정리 — 직각삼각형 + 직각 표시 + 치수."""
    return {
        "version": 2,
        "style": {"show_points": True},
        "points": {"A": [40.0, 40.0], "B": [40.0, 160.0], "C": [200.0, 160.0]},
        "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"]},
        "angles": {"b": {"vertex": "B", "points": ["A", "C"], "right": True}},
        "dimensions": {
            "ab": {"points": ["A", "B"], "label": "6 cm", "side": "auto"},
            "bc": {"points": ["B", "C"], "label": "8 cm", "side": "auto"},
        },
        "labels": {"A": "A", "B": "B", "C": "C"},
    }


# ── 음성 대조군 — **던져야** 하는 것 ────────────────────────
def s_bad_region_open() -> dict:
    """열린 사슬 — 「끝이 안 닫힌 색칠」은 던져야 한다."""
    s = s_sector()
    s["regions"]["shade"]["boundary"] = [{"seg": ["O", "A"]}]
    return s


def s_bad_unknown_key() -> dict:
    """모르는 키 — 조용히 무시하면 오타가 영영 안 보인다."""
    s = s_polygon()
    s["scatter"] = {"pts": [[1, 2]]}
    return s


def s_bad_dark_fill() -> dict:
    """어두운 색칠 — 지면에서 글자를 먹는다."""
    s = s_sector()
    s["regions"]["shade"]["fill"] = "#203040"
    return s


def s_bad_dangling_ref() -> dict:
    """없는 점을 가리킴."""
    s = s_pythagoras()
    s["segments"]["ZZ"] = ["A", "Z"]
    return s


CASES = [
    ("① 1-2 기하", "기본 도형 — 맞꼭지각", s_base_angles, True),
    ("① 1-2 기하", "위치 관계 — 평행선과 엇각", s_position_parallel, True),
    ("① 1-2 기하", "작도와 합동 — 컴퍼스 자국", s_construction, True),
    ("① 1-2 기하", "다각형 — 오각형 대각선", s_polygon, True),
    ("① 1-2 기하", "원과 부채꼴 — 부채꼴 색칠", s_sector, True),
    ("② 2-2 기하", "외심과 내심 — 외접원", s_circum_incircle, True),
    ("② 2-2 기하", "평행사변형 — 평행 표시·대각선", s_parallelogram, True),
    ("② 2-2 기하", "무게중심 — 중선과 교점", s_centroid, True),
    ("② 2-2 기하", "피타고라스 — 직각과 치수", s_pythagoras, True),
    ("③ 던져야 하는 것", "색칠 사슬이 열림", s_bad_region_open, False),
    ("③ 던져야 하는 것", "모르는 키", s_bad_unknown_key, False),
    ("③ 던져야 하는 것", "어두운 색칠", s_bad_dark_fill, False),
    ("③ 던져야 하는 것", "없는 점 참조", s_bad_dangling_ref, False),
]


def main() -> None:
    blocks: list[str] = []
    drew = throwed = wrong = 0
    last_group = ""
    for group, name, fn, should_draw in CASES:
        spec = fn()
        svg, err = render(spec)
        ok = bool(svg) and not err
        good = ok == should_draw
        if ok:
            drew += 1
        else:
            throwed += 1
        if not good:
            wrong += 1
        mark = "그림" if ok else "던짐"
        flag = "" if good else "   ← 기대와 다르다"
        print(f"{mark}  {group} / {name}{flag}" + (f"  · {err[:90]}" if err else ""))
        if group != last_group:
            blocks.append(f"<h2>{group}</h2>")
            last_group = group
        body = svg if ok else f'<p class="err">던짐: {err}</p>'
        cls = "card" if good else "card bad"
        blocks.append(
            f'<div class="{cls}"><div class="t">{name}'
            f'<span class="want">{"그려져야 함" if should_draw else "던져야 함"}</span>'
            f"</div>{body}</div>"
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    html = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>물결 6 기하 실렌더 판정</title><style>
body{{font-family:'Malgun Gothic',sans-serif;max-width:900px;margin:24px auto;padding:0 16px}}
h1{{font-size:19px}} h2{{font-size:15px;margin-top:26px;color:#444}}
.card{{display:inline-block;border:1px solid #ddd;border-radius:8px;padding:10px;
margin:8px;vertical-align:top;width:270px}}
.card.bad{{border-color:#b00020;background:#fff5f5}}
.t{{font-size:12px;color:#555;margin-bottom:6px}}
.want{{float:right;color:#999}}
.card svg{{max-width:250px;height:auto}}
.err{{color:#b00020;font-size:12px;margin:0}}
</style></head><body>
<h1>물결 6 기하 실렌더 판정 — 그림 {drew} · 던짐 {throwed} · 기대와 다름 {wrong}</h1>
<p style="font-size:13px;color:#666">남은 158유형 중 141이 기하다. 유형 세션을 띄우기 전에
「지금 엔진으로 그려지는가」를 <b>양쪽으로</b> 잰다 — 그려져야 할 것이 그려지나,
안 되는 것이 <b>던지나</b>.</p>
{''.join(blocks)}
</body></html>"""
    (OUT_DIR / "index.html").write_text(html, encoding="utf-8")
    print(f"\n→ {OUT_DIR / 'index.html'}   (그림 {drew} · 던짐 {throwed} · 기대와 다름 {wrong})")
    if wrong:
        sys.exit(1)


if __name__ == "__main__":
    main()
