# -*- coding: utf-8 -*-
"""물결 4A 실렌더 시트 — `curveGraph`·`netCone` 을 **지면 등급 그대로** 찍어 본다.

    python scripts/figure/probe-curve-graph.py [출력=docs/planning/tracks/wave4a-curve-sheet]
    node scripts/qa/shot-sian.mjs \n        docs/planning/tracks/wave4a-curve-sheet/index.html \n        docs/planning/tracks/wave4a-curve-sheet/sheet.png 1240

산출물은 **커밋한다** — 스크롤백은 창이 닫히면 사라지고, 다음 사람이 「그때 무엇이
어떻게 보였나」를 다시 그려 보지 않고도 알 수 있어야 한다.

능력 목록을 적는 대신 **실제로 그린다**(이 저장소의 되풀이되는 교훈 — 목록은 샌다).
렌더는 제품과 같은 경로(`render_spec.py` → `sanitize_svg`)를 탄다.

## 왜 본문 글자를 옆에 찍나

그림이 화면에서 멀쩡한 것과 **종이에서 읽히는 것**은 다른 질문이다(2026-08-23).
`figureSvgFrame.ts` 가 viewBox 폭으로 등급(140/240/360/364px)을 가르므로, 그 등급을
여기서 **그대로 적용**하고 문항 본문(12.5px) 옆에 나란히 놓는다. 그림 속 이름표가
본문보다 작으면 눈으로 바로 보인다.

## 무엇이 한 장에 있어야 하나 (브리프)

반비례 · 이차함수 · 직선 겹치기 · 교점 · 점근선(축에 안 닿기) · 원뿔 전개도.
「던져야 하는 것」도 같이 찍는다 — 던지는 것이 안 던지면 그것도 결함이다.
"""
from __future__ import annotations

import io
import json
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    REPO, "docs", "planning", "tracks", "wave4a-curve-sheet"
)

# `src/lib/figure/figureSvgFrame.ts` 의 문턱·폭을 **그대로** 옮겨 적은 것이 아니라
# 여기서 다시 세우면 갈라진다 — 그래서 시험(`figureCurveGraph.test.ts`)이 두 곳을
# 대조한다. 이 시트는 «보는 물건»이므로 값이 여기 있어도 시험이 지켜 준다.
GRADES = ((160, 140, "compact"), (320, 240, "mid"), (380, 360, "wide"), (10**9, 364, "pair"))


def grade(svg: str) -> tuple[int, str]:
    m = re.search(r'viewBox="0 0 ([\d.]+)', svg)
    w = float(m.group(1)) if m else 10**9
    for lim, px, name in GRADES:
        if w <= lim:
            return px, f"{name} · viewBox {w:g} → {px}px"
    return 364, "pair"


# (묶음, 이름, 무엇을 보이나, 스펙)
SPECS = [
    ("① 반비례(쌍곡선)", "k=6 · 두 가지", "1·3사분면. 한 가지만 그리면 반비례가 아니다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 6, "label": "y=6/x"}],
      "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[2, 3]]}),
    ("① 반비례(쌍곡선)", "k=-8 · 2·4사분면", "k<0 이면 가지가 반대 사분면으로 간다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": -8, "label": "y=-8/x"}],
      "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[2, -4]]}),
    ("① 반비례(쌍곡선)", "k=12 · 넓은 범위", "점근선(좌표축)에 닿지 않게 잘린다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 12}],
      "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[3, 4], [-4, -3]]}),
    ("② 이차함수(포물선)", "y=x²", "꼭짓점 원점 · 위로 열림",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "quadratic", "a": 1, "label": "y=x^2"}],
      "xRange": [-4, 4], "yRange": [-2, 8], "marks": [[2, 4]]}),
    ("② 이차함수(포물선)", "y=-½(x-1)²+4", "평행이동 · 아래로 열림 · 꼭짓점 mark",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "quadratic", "a": -0.5, "p": 1, "q": 4}],
      "xRange": [-4, 6], "yRange": [-6, 6], "marks": [[1, 4], [3, 2]]}),
    ("② 이차함수(포물선)", "y=x²-9 · x축 교점", "「그래프와 x축의 두 교점」 유형",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "quadratic", "a": 1, "q": -9}],
      "xRange": [-5, 5], "yRange": [-9, 3], "marks": [[3, 0], [-3, 0]]}),
    ("③ 겹치기·교점", "반비례 + 정비례", "y=6/x 와 y=x 의 교점 (1-1 유형21)",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 6, "label": "y=6/x"}],
      "lines": [{"slope": 1, "yIntercept": 0, "label": "y=x"}],
      "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[-3, -2]]}),
    ("③ 겹치기·교점", "포물선 + 직선", "이차함수와 직선의 교점",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "quadratic", "a": 1, "q": -4}],
      "lines": [{"slope": 1, "yIntercept": -2}],
      "xRange": [-4, 4], "yRange": [-5, 6], "marks": [[2, 0], [-1, -3]]}),
    ("③ 겹치기·교점", "두 반비례 견주기", "|k| 가 크면 원점에서 멀다 (유형16)",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 4, "label": "y=4/x"},
                 {"type": "inverse", "k": 12, "label": "y=12/x"}],
      "xRange": [-6, 6], "yRange": [-6, 6]}),
    ("④ 한 벌인가", "linearGraph 직선 둘", "**같은** 축·눈금·화살촉·글자 — 곡선과 나란히 본다",
     {"version": "elem-1", "kind": "linearGraph",
      "lines": [{"slope": 1, "yIntercept": 2, "label": "y=x+2"},
                {"slope": -2, "yIntercept": 5, "label": "y=-2x+5"}],
      "xRange": [-4, 5], "yRange": [-3, 6], "marks": [[1, 3]]}),
    ("④ 한 벌인가", "linearGraph 좁은 범위", "옛 규칙이면 여기서 등급이 compact 로 떨어졌다",
     {"version": "elem-1", "kind": "linearGraph",
      "lines": [{"slope": 1, "yIntercept": 1}],
      "xRange": [-2, 2], "yRange": [-2, 2], "marks": [[1, 2]]}),
    ("④ 한 벌인가", "curveGraph 좁은 범위", "곡선도 같은 폭이어야 한다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "quadratic", "a": 1}],
      "xRange": [-2, 2], "yRange": [-1, 4], "marks": [[2, 4]]}),
    ("⑤ 원뿔 전개도", "r=3 · l=9 → 120°", "밑면 원이 호에 닿는다 · 모선과 중심각만 적는다",
     {"version": "elem-1", "kind": "netCone", "r": 3, "l": 9}),
    ("⑤ 원뿔 전개도", "r=4 · l=6 → 240°", "넓은 부채꼴",
     {"version": "elem-1", "kind": "netCone", "r": 4, "l": 6}),
    ("⑤ 원뿔 전개도", "r=2 · l=12 → 60° · 반지름까지", "발문이 반지름을 이미 말한 갈래",
     {"version": "elem-1", "kind": "netCone", "r": 2, "l": 12,
      "labels": ["slant", "angle", "radius"]}),
    ("⑤ 원뿔 전개도", "r=5 · l=9 → 200° · 각 없이", "「중심각을 구하시오」 갈래",
     {"version": "elem-1", "kind": "netCone", "r": 5, "l": 9, "labels": ["slant"]}),
    ("⑥ 던져야 하는 것", "쌍곡선 한 가지만", "범위가 3사분면 가지를 통째로 안 담는다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 6}], "xRange": [-1, 11], "yRange": [-1, 11]}),
    ("⑥ 던져야 하는 것", "가지가 실오라기", "k=30 이면 범위 안에 1칸만 보인다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 30}], "xRange": [-6, 6], "yRange": [-6, 6]}),
    ("⑥ 던져야 하는 것", "축에 붙는 쌍곡선", "k=1 이면 원점 가까이서 점근선에 닿아 보인다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 1}], "xRange": [-6, 6], "yRange": [-6, 6]}),
    ("⑥ 던져야 하는 것", "곡선 위가 아닌 mark", "y=6/x 위에 (2,4) 는 없다 — 검산 겸용",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "inverse", "k": 6}],
      "xRange": [-6, 6], "yRange": [-6, 6], "marks": [[2, 4]]}),
    ("⑥ 던져야 하는 것", "꼭짓점이 범위 밖", "포물선으로 안 읽힌다",
     {"version": "elem-1", "kind": "curveGraph",
      "curves": [{"type": "quadratic", "a": 1, "q": -18}],
      "xRange": [-4, 4], "yRange": [-6, 6]}),
    ("⑥ 던져야 하는 것", "모선 ≤ 반지름", "l=3, r=3 은 원뿔이 아니다",
     {"version": "elem-1", "kind": "netCone", "r": 3, "l": 3}),
    ("⑥ 던져야 하는 것", "중심각이 정수 도가 아님", "r=5, l=13 → 138.46°",
     {"version": "elem-1", "kind": "netCone", "r": 5, "l": 13}),
]

BODY = (
    "오른쪽 그림과 같이 반비례 관계의 그래프가 점 P 를 지날 때, "
    "점 P 의 좌표를 구하시오. (단, a 는 상수이다.)"
)


def render(spec: dict) -> tuple[str, str]:
    p = subprocess.run(
        [sys.executable, os.path.join(REPO, "scripts", "figure", "render_spec.py")],
        input=json.dumps(spec, ensure_ascii=False).encode("utf-8"),
        capture_output=True,
    )
    try:
        got = json.loads(p.stdout.decode("utf-8", "replace"))
    except Exception:
        return ("", f"렌더러가 JSON 을 안 냈다: {p.stdout[:200]!r} / {p.stderr[:200]!r}")
    return (got.get("svg", ""), got.get("error", ""))


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    groups: list[tuple[str, list[str]]] = []
    ok = bad = 0
    for group, name, note, spec in SPECS:
        svg, err = render(spec)
        want_throw = group.startswith("⑥")
        if svg:
            ok += 1
            px, note2 = grade(svg)
            fig = f'<div class="fig" style="max-width:{px}px">{svg}</div>'
            tag = f'<div class="tag">{note2}</div>'
            cls = "bad" if want_throw else "ok"
            verdict = "❗ 던져야 하는데 그렸다" if want_throw else ""
        else:
            bad += 1
            fig = f"<pre>{err[:400]}</pre>"
            tag = ""
            cls = "ok" if want_throw else "bad"
            verdict = "" if want_throw else "❗ 그려야 하는데 던졌다"
        card = (
            f'<section class="card {cls}"><h3>{name}</h3><p class="note">{note}</p>'
            f'<div class="row"><div class="body">{BODY}</div>{fig}</div>'
            f"{tag}<div class='verdict'>{verdict}</div></section>"
        )
        if not groups or groups[-1][0] != group:
            groups.append((group, []))
        groups[-1][1].append(card)
        print(("그림" if svg else "던짐") + f"  {group} / {name}" + (f"  ← {err[:80]}" if err else ""))

    sections = "".join(
        f'<h2>{g}</h2><div class="grid">{"".join(cards)}</div>' for g, cards in groups
    )
    html = (
        '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        "<title>물결 4A — curveGraph · netCone 실렌더</title><style>"
        'body{font-family:"Malgun Gothic",sans-serif;margin:20px;color:#1a2028;background:#fff}'
        "h1{font-size:18px}h2{font-size:14px;margin:22px 0 8px;color:#41525f}"
        ".grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}"
        ".card{border:1px solid #d7dee5;border-radius:6px;padding:10px}"
        ".card.bad{background:#fff6f5;border-color:#f0cfc9}"
        ".card h3{font-size:12px;margin:0 0 2px}"
        ".note{font-size:10px;color:#7a8794;margin:0 0 8px}"
        ".row{display:flex;gap:12px;align-items:flex-start}"
        # 문항 본문과 **같은 크기**다 — 그림 속 이름표가 이보다 작으면 종이에서 안 읽힌다.
        ".body{font-size:12.5px;line-height:1.625;flex:1 1 0;min-width:120px;"
        'font-family:"Batang",serif}'
        ".fig{flex:0 0 auto}.fig svg{width:100%;height:auto}"
        ".tag{font-size:10px;color:#7a8794;margin-top:6px}"
        ".verdict{font-size:11px;color:#a3382c;font-weight:700}"
        "pre{font-size:10px;white-space:pre-wrap;color:#6b7885;margin:0;flex:0 0 240px}"
        "</style></head><body>"
        "<h1>물결 4A — <code>curveGraph</code> · <code>netCone</code> 실렌더</h1>"
        f"<p>그림 {ok} · 던짐 {bad}. 제품 경로(render_spec.py)로 실제로 그렸고, "
        "폭은 <code>figureSvgFrame.ts</code> 등급을 그대로 먹였다. "
        "왼쪽 글은 문항 본문과 같은 12.5px 이다.</p>" + sections + "</body></html>"
    )
    path = os.path.join(OUT, "index.html")
    io.open(path, "w", encoding="utf-8").write(html)
    print(chr(10) + f"→ {path}   (그림 {ok} · 던짐 {bad})")


main()
