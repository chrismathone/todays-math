# -*- coding: utf-8 -*-
"""중1 「다면체와 회전체」 20유형 — **지금 엔진으로 무엇이 그려지나** 실렌더 판정.

    python scripts/figure/probe-mid1-solids.py [출력=C:/tmp/mid1-solids]

물결 3 계획 §8 이 「3C 는 실렌더 판정 후 kind 필요 여부를 정한다」고 했다.
가능 목록을 적는 대신 **실제로 그려 보고** 되는 것/던지는 것을 가른다
(이 저장소의 되풀이되는 교훈 — 목록은 샌다).

렌더는 제품과 같은 경로(`render_spec.py`)를 탄다.
"""
from __future__ import annotations

import io
import json
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else "C:/tmp/mid1-solids"

# (이름, 어느 유형에 쓰이나, 스펙)
SPECS = [
    ("각기둥 오각", "01~06 다면체", {"version": "elem-1", "kind": "prism", "sides": 5, "h": 9}),
    ("각뿔 육각", "01~06 다면체", {"version": "elem-1", "kind": "pyramid", "sides": 6, "h": 10}),
    ("정사면체", "08~10 정다면체", {"version": "elem-1", "kind": "pyramid", "sides": 3, "h": 9}),
    ("정육면체", "08~10 정다면체", {"version": "elem-1", "kind": "cuboid", "w": 8, "d": 8, "h": 8}),
    ("정팔면체(없음 확인)", "08~10 정다면체", {"version": "elem-1", "kind": "octahedron"}),
    ("정육면체 전개도", "11 정다면체의 전개도", {"version": "elem-1", "kind": "netCuboid", "w": 6, "d": 6, "h": 6}),
    ("원기둥", "13·18 회전체", {"version": "elem-1", "kind": "cylinder", "r": 4, "h": 9}),
    ("원뿔", "13·18 회전체", {"version": "elem-1", "kind": "cone", "r": 4, "h": 9}),
    ("구", "13·18 회전체", {"version": "elem-1", "kind": "sphere", "r": 5}),
    ("회전 전 반평면(직사각형)", "14 회전시킨 회전체", {"version": "elem-1", "kind": "revolvePlan", "pieces": [{"shape": "rect", "w": 4, "h": 8}]}),
    ("회전 전 반평면(직각삼각형)", "14 회전시킨 회전체", {"version": "elem-1", "kind": "revolvePlan", "pieces": [{"shape": "rightTri", "w": 4, "h": 8}]}),
    ("회전 전 반평면(사다리꼴)", "14 회전시킨 회전체", {"version": "elem-1", "kind": "revolvePlan", "pieces": [{"shape": "rightTrap", "w": 6, "w2": 3, "h": 7}]}),
    ("회전 전 반평면(반원)", "14 회전시킨 회전체", {"version": "elem-1", "kind": "revolvePlan", "pieces": [{"shape": "semicircle", "r": 4}]}),
    ("삼각기둥 전개도", "겉넓이19-05 전개도 기둥", {"version": "elem-1", "kind": "prism", "sides": 3, "h": 8, "net": True}),
    ("오각기둥 전개도", "겉넓이19-05 전개도 기둥", {"version": "elem-1", "kind": "prism", "sides": 5, "h": 8, "net": True}),
    ("원기둥 전개도", "17 회전체의 전개도", {"version": "elem-1", "kind": "netCylinder", "r": 3, "h": 8}),
    ("원뿔 전개도(없음 확인)", "17 회전체의 전개도", {"version": "elem-1", "kind": "netCone", "r": 3, "l": 8}),
]


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
    cards = []
    ok = bad = 0
    for name, uses, spec in SPECS:
        svg, err = render(spec)
        if svg:
            ok += 1
            body = svg
            tag = "그려짐"
            cls = "ok"
        else:
            bad += 1
            body = f"<pre>{err[:300]}</pre>"
            tag = "던짐"
            cls = "bad"
        print(f"{tag}  {name:24} ({uses})" + ("" if svg else f"  ← {err[:90]}"))
        cards.append(
            f'<section class="card {cls}"><h3>{name}<span>{uses}</span></h3>'
            f'<div class="fig">{body}</div><div class="tag">{tag}</div></section>'
        )
    html = (
        '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        "<title>중1 다면체와 회전체 — 지금 엔진으로 무엇이 그려지나</title><style>"
        'body{font-family:"Malgun Gothic",sans-serif;margin:20px;color:#1a2028}'
        "h1{font-size:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}"
        ".card{border:1px solid #d7dee5;border-radius:6px;padding:10px;text-align:center}"
        ".card.bad{background:#fff6f5;border-color:#f0cfc9}"
        ".card h3{font-size:12px;margin:0 0 6px}.card h3 span{display:block;font-weight:400;color:#7a8794;font-size:10px}"
        ".fig svg{width:150px;height:auto}.tag{font-size:10px;color:#7a8794;margin-top:6px}"
        "pre{font-size:10px;text-align:left;white-space:pre-wrap;color:#a3382c}"
        "</style></head><body><h1>중1 「다면체와 회전체」 — 지금 엔진으로 무엇이 그려지나</h1>"
        f"<p>그려짐 {ok} · 던짐 {bad}. 제품 경로(render_spec.py)로 실제로 그린 것이다.</p>"
        '<div class="grid">' + "".join(cards) + "</div></body></html>"
    )
    path = os.path.join(OUT, "index.html")
    io.open(path, "w", encoding="utf-8").write(html)
    print(chr(10) + f"→ {path}   (그려짐 {ok} · 던짐 {bad})")


main()
