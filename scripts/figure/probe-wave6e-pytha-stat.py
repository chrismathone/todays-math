"""6E-중2피타고라스통계엔진 실렌더 판정 — **실제 문제 생성기가 낸 스펙**을 그린다.

물결 6 계획 §「끝내는 조건」의 "그림 실렌더 시트"다. `docs/planning/tracks/
wave6-geometry-sheet/index.html`(main 세션)과 같은 무늬 — 스펙을 손으로 다시
짓지 않고, `scripts/qa/dump-wave6e-figures.ts` 가 실제 `generateMiddleProblem`
호출로 뽑은 것을 그대로 렌더한다(양성). 새 kind `boxPlot`·`scatterPlot` 은
**던져야 하는 것**(음성)도 같이 대 본다 — 09 §「실렌더 판정」의 양쪽 원칙.

    npx tsx scripts/qa/dump-wave6e-figures.ts > scripts/qa/_wave6e-figures.json
    PYTHONIOENCODING=utf-8 python scripts/figure/probe-wave6e-pytha-stat.py

산출: docs/planning/tracks/wave6e-pytha-stat-sheet/index.html
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DUMP = ROOT / "scripts" / "qa" / "_wave6e-figures.json"
OUT_DIR = ROOT / "docs" / "planning" / "tracks" / "wave6e-pytha-stat-sheet"
RENDER = ROOT / "scripts" / "figure" / "render_spec.py"


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
        return "", f"엔진 출력을 못 읽음: {p.stdout[:200]!r} / {p.stderr[:200]!r}"
    if "svg" in got:
        return got["svg"], ""
    return "", str(got.get("error", "알 수 없는 오류"))


# ── 음성 대조군 — boxPlot·scatterPlot 은 새 kind 라 **던지는 것**도 확인한다 ──
def s_bad_box_order() -> dict:
    """다섯 수가 순서가 아니다 — 던져야 한다."""
    return {
        "version": "elem-1",
        "kind": "boxPlot",
        "values": [80, 74, 62, 88, 96],
        "axisMin": 60,
        "axisMax": 100,
        "axisStep": 10,
    }


def s_bad_box_out_of_range() -> dict:
    """값이 축 범위 밖이다 — 던져야 한다."""
    return {
        "version": "elem-1",
        "kind": "boxPlot",
        "values": [62, 74, 80, 88, 96],
        "axisMin": 65,
        "axisMax": 100,
        "axisStep": 10,
    }


def s_bad_scatter_out_of_range() -> dict:
    """점이 축 범위 밖이다 — 던져야 한다."""
    return {
        "version": "elem-1",
        "kind": "scatterPlot",
        "points": [[10, 20], [80, 30]],
        "xMin": 0,
        "xMax": 60,
        "xStep": 10,
        "yMin": 0,
        "yMax": 80,
        "yStep": 10,
    }


def s_bad_scatter_unknown_key() -> dict:
    """모르는 키 — 조용히 무시하면 오타가 영영 안 보인다."""
    return {
        "version": "elem-1",
        "kind": "scatterPlot",
        "points": [[10, 20], [20, 30]],
        "xMin": 0,
        "xMax": 60,
        "xStep": 10,
        "yMin": 0,
        "yMax": 80,
        "yStep": 10,
        "color": "red",
    }


NEGATIVE_CASES = [
    ("④ 던져야 하는 것", "boxPlot 다섯 수가 순서 아님", s_bad_box_order),
    ("④ 던져야 하는 것", "boxPlot 값이 축 범위 밖", s_bad_box_out_of_range),
    ("④ 던져야 하는 것", "scatterPlot 점이 축 범위 밖", s_bad_scatter_out_of_range),
    ("④ 던져야 하는 것", "scatterPlot 모르는 키", s_bad_scatter_unknown_key),
]


def main() -> None:
    if not DUMP.exists():
        sys.exit(
            f"덤프가 없다: {DUMP} — 먼저 npx tsx scripts/qa/dump-wave6e-figures.ts > {DUMP}"
        )
    cards = json.loads(DUMP.read_text(encoding="utf-8"))

    blocks: list[str] = []
    drew = throwed = wrong = 0
    last_group = ""

    def emit(group: str, name: str, spec: dict, should_draw: bool) -> None:
        nonlocal drew, throwed, wrong, last_group
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

    for c in cards:
        emit(c["group"], c["name"], c["spec"], True)
    for group, name, fn in NEGATIVE_CASES:
        emit(group, name, fn(), False)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    html = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>6E 피타고라스·통계 실렌더 판정</title><style>
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
<h1>6E 피타고라스·통계 실렌더 판정 — 그림 {drew} · 던짐 {throwed} · 기대와 다름 {wrong}</h1>
<p style="font-size:13px;color:#666">피타고라스 정리 16유형 중 그림 있는 9(①) ·
산포도·상자그림과 산점도 17유형 중 그림 있는 8(②)을 <b>실제 생성기가 낸
스펙 그대로</b> 렌더한다. <code>boxPlot</code>·<code>scatterPlot</code> 은
이 물결이 새로 짠 kind라 던져야 하는 것 4개(④)도 같이 댄다.</p>
{''.join(blocks)}
</body></html>"""
    (OUT_DIR / "index.html").write_text(html, encoding="utf-8")
    print(f"\n→ {OUT_DIR / 'index.html'}   (그림 {drew} · 던짐 {throwed} · 기대와 다름 {wrong})")
    if wrong:
        sys.exit(1)


if __name__ == "__main__":
    main()
