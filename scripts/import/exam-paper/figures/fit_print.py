# -*- coding: utf-8 -*-
"""**지면에서 라벨이 본문보다 작지 않은가** — 재고 찍는다.

## 🔴 이 자는 두 번 틀렸다 — 그 자국을 남긴다

⑴ **좌표를 줄이는 길**: viewBox 를 좁히면 지면 배율이 오른다. 숫자는 맞았지만
   글자가 그림에 비해 커져 **라벨이 제자리에 못 앉았다** — 문5 의 `H` 가 삼각형
   밖으로 떨어져 나갔다. 되돌렸다.
⑵ **잰 것이 라벨이 아니었다**: `min(font-size)` 가 `<tspan>` 으로 들어간 **도(°)
   기호 위첨자**(16.8 x 0.63 = 10.58)를 집었다. 그래서 「18장 중 9장이 본문 미만」
   이라는 **거짓 경보**가 났고, 그걸 고치겠다고 글자를 키워 그림을 망쳤다.
   실제 라벨은 전부 16.8 단위다. **판정이 이상하면 재는 쪽을 먼저 의심하라.**

## 지금 재는 방법

`<text>` **여는 태그**의 `font-size` 만 본다(안쪽 tspan 은 위첨자라 장식이다).

    지면 px = 라벨단위 x 등급폭 / viewBox폭
    등급폭: viewBox <=160 -> 140 · <=320 -> 240 · 그 밖 -> 360
    (등급은 `src/lib/figure/figureSvgFrame.ts` 가 정한다)
"""
from __future__ import annotations

import json
import math
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
# SVG 는 **산출물**이라 커밋하지 않는다(정본은 spec/*.json 이고, 지면이 쓰는 것은 DB 의
# `figureSvg` 다). 그래서 폴더가 없을 수 있다 — 여기서 만든다.
(HERE / "svg").mkdir(exist_ok=True)
def _repo_root() -> pathlib.Path:
    """`package.json` 이 있는 곳까지 올라간다 — 깊이를 세면 폴더를 옮길 때 조용히 틀린다."""
    here = pathlib.Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "package.json").is_file():
            return parent
    raise SystemExit("[중단] 저장소 뿌리를 못 찾았다 (package.json 없음)")


REPO = _repo_root()
BODY_PX = 12.5

TEXT_OPEN = re.compile(r'<text\b[^>]*font-size="([0-9.]+)"')
VIEWBOX = re.compile(r'viewBox="0 0 ([0-9.]+) ([0-9.]+)"')


def render(spec: dict):
    r = subprocess.run(
        [sys.executable, str(REPO / "scripts" / "figure" / "render_spec.py")],
        input=json.dumps(spec).encode(), capture_output=True)
    try:
        return json.loads(r.stdout.decode("utf-8"))
    except Exception:
        return {"error": "판정 불가"}


def frame_px(vbw: float) -> float:
    return 140.0 if vbw <= 160 else (240.0 if vbw <= 320 else 360.0)


def measure(svg: str):
    vbw = float(VIEWBOX.search(svg).group(1))
    sizes = [float(x) for x in TEXT_OPEN.findall(svg)]
    if not sizes:
        return vbw, math.inf
    return vbw, min(sizes) * frame_px(vbw) / vbw


def main() -> int:
    # 눈금 — 일부러 작은 글자를 준 스펙이 걸려야 한다. 안 걸리면 이 자는 눈이 멀었다.
    probe = {"version": 2, "style": {"font_size": 4.0},
             "points": {"A": [0, 0], "B": [300, 0], "C": [0, 200]},
             "segments": {"AB": ["A", "B"], "AC": ["A", "C"], "BC": ["B", "C"]},
             "labels": {"A": "A", "B": "B", "C": "C"}}
    d = render(probe)
    if "error" in d:
        print("[중단] 눈금 스펙이 안 그려진다 — 판정을 거부한다")
        return 2
    gauge = measure(d["svg"])[1]
    if gauge >= BODY_PX:
        print(f"[중단] 눈금이 안 걸린다 ({gauge:.2f}px) — 판정을 거부한다")
        return 2
    print(f"눈금 통과 — 일부러 작게 준 스펙이 {gauge:.2f}px 로 걸렸다")

    rows, bad = [], 0
    for path in sorted((HERE / "spec").glob("q*.json")):
        spec = json.loads(path.read_text(encoding="utf-8"))
        d = render(spec)
        if "error" in d:
            print(f"[{path.stem}] 그리기 실패: {d['error']}")
            return 2
        vbw, px = measure(d["svg"])
        (HERE / "svg" / f"{path.stem}.svg").write_text(d["svg"], encoding="utf-8")
        if px is not math.inf and px < BODY_PX:
            bad += 1
        rows.append((path.stem, vbw, px))

    print(f"\n{'그림':>6} {'viewBox':>8} {'등급':>7} {'지면 px':>9}")
    for name, vbw, px in rows:
        grade = "compact" if vbw <= 160 else ("mid" if vbw <= 320 else "wide")
        shown = "  라벨없음" if px is math.inf else f"{px:9.2f}"
        mark = " [본문 미만]" if (px is not math.inf and px < BODY_PX) else ""
        print(f"{name:>6} {vbw:8.1f} {grade:>7} {shown}{mark}")
    finite = [r[2] for r in rows if r[2] is not math.inf]
    print(f"\n그림 {len(rows)}장 · 본문({BODY_PX}px) 미만 {bad}장 · "
          f"최소 {min(finite):.2f}px · 최대 {max(finite):.2f}px")
    return 1 if bad else 0


raise SystemExit(main())
