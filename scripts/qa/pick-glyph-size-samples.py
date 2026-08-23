#!/usr/bin/env python
"""**그림 속 글자가 종이에서 본문보다 작은가** — 시안 표본을 규칙으로 뽑는다.

    python scripts/qa/pick-glyph-size-samples.py

산출물(커밋된다): `src/app/dev/figure-glyph-size/samples.generated.json`

── 왜 생성물인가 ─────────────────────────────────────────────────────────────

**표본을 손으로 고르면 «가장 나쁜 실데이터»가 안 들어온다.** 2026-08-19 에 범위
피커 시안이 정확히 그렇게 깨졌다(픽스처가 중2 17개뿐이라 학년 열 16행을 아무도
못 봤다). 그래서 **갈래가 실제로 내는 스펙 전량**을 렌더해서 규칙으로 뽑는다.

⚠️ **「나쁜 것만」 넣지 않는다.** 나쁜 것만 보여 드리면 원장님이 「전부 이렇구나」로
읽으신다. **멀쩡한 것도 같이** 넣어 대조가 되게 한다(음성 대조군 — 2026-08-20).

── 재는 법 ───────────────────────────────────────────────────────────────────

`viewBox` 폭과 그림 안 `font-size` 의 **최솟값**으로, 지면에서의 실제 글자 크기를
구한다. 등급별 지면 폭은 `src/lib/figure/figureSvgFrame.ts` 의 `FRAME` 과 같아야
한다 — 여기 적힌 수가 그것과 갈리면 시안이 거짓말이 된다. 그래서 **그 파일에서
읽어 대조하고, 다르면 멈춘다.**
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FIGDIR = os.path.join(ROOT, "scripts", "figure")
FRAME_TS = os.path.join(ROOT, "src", "lib", "figure", "figureSvgFrame.ts")
OUT = os.path.join(ROOT, "src", "app", "dev", "figure-glyph-size", "samples.generated.json")
COLLECTOR = os.path.join(HERE, "probe-table-width.ts")

BODY_PX = 12.5   # 본문 글자
PX_PER_MM = 3.75  # 240px / 64mm — 이 저장소가 쓰는 배율(`figureSvgFrame.ts` 주석)


def die(msg: str) -> None:
    sys.stdout.write(f"\n\U0001f534 {msg}\n")
    raise SystemExit(1)


def read_frame_widths() -> dict[str, tuple[int, int]]:
    """등급별 (화면 px, 지면 mm) 를 **제품 파일에서 읽는다** — 옮겨 적지 않는다."""
    src = open(FRAME_TS, encoding="utf-8").read()
    out: dict[str, tuple[int, int]] = {}
    for name in ("compact", "mid", "wide", "pair"):
        m = re.search(
            rf'{name}:\s*\n?\s*"[^"]*max-w-\[(\d+)px\][^"]*print:max-w-\[(\d+)mm\]',
            src,
        )
        if not m:
            die(f"`{name}` 등급의 폭을 {FRAME_TS} 에서 못 읽었다 — FRAME 모양이 바뀌었나")
        out[name] = (int(m.group(1)), int(m.group(2)))
    return out


def grade_of(vb: float, svg: str, cut: dict[str, int]) -> str:
    if re.search(r"<desc>\s*chartPair\s*</desc>", svg):
        return "pair"
    if vb <= cut["compact"]:
        return "compact"
    if vb <= cut["mid"]:
        return "mid"
    return "wide"


def read_cuts() -> dict[str, int]:
    src = open(FRAME_TS, encoding="utf-8").read()
    def num(name: str) -> int:
        m = re.search(rf"{name}\s*=\s*(\d+)", src)
        if not m:
            die(f"{name} 를 못 읽었다")
        return int(m.group(1))
    return {
        "compact": num("FIGURE_SVG_COMPACT_VIEWBOX"),
        "mid": num("FIGURE_SVG_MID_VIEWBOX"),
    }


def main() -> None:
    if not os.path.isdir(FIGDIR):
        die(f"FIGDIR 이 없다: {FIGDIR}")
    for f in os.listdir(ROOT):
        if f.startswith("MUTATION-IN-PROGRESS."):
            die(f"변이 회차 표지가 있다({f}) — 지금 뽑으면 변이본을 담는다")

    frame = read_frame_widths()
    cuts = read_cuts()
    sys.path.insert(0, FIGDIR)
    sys.path.insert(0, os.path.join(ROOT, "vendor", "figure-engine"))
    import elementary as E  # noqa: E402

    tmp = os.path.join(tempfile.gettempdir(), "glyph-specs.json")
    subprocess.run(
        ["npx", "tsx", COLLECTOR, tmp, "60"],
        cwd=ROOT, check=True, shell=(os.name == "nt"),
        stdout=subprocess.DEVNULL,
    )
    rows = json.load(open(tmp, encoding="utf-8"))["rows"]

    best: dict[tuple, dict] = {}
    drawn = 0
    for r in rows:
        fn = E._RENDER.get(r["spec"].get("kind"))
        if fn is None:
            continue
        try:
            svg = fn(r["spec"])
        except Exception:
            continue
        drawn += 1
        m = re.search(r'viewBox="0\s+0\s+([\d.]+)', svg)
        sizes = [float(x) for x in re.findall(r'font-size="([\d.]+)"', svg)]
        if not m or not sizes:
            continue                       # 글자 없는 그림은 이 물음의 대상이 아니다
        vb, small = float(m.group(1)), min(sizes)
        g = grade_of(vb, svg, cuts)
        px, mm = frame[g]
        key = (r["grade"], r["section"], r["spec"]["kind"])
        row = {
            "grade": r["grade"], "section": r["section"], "kind": r["spec"]["kind"],
            "tier": r["tier"], "seed": r["seed"],
            "viewBox": round(vb, 2), "fontUnits": small, "size": g,
            "screenPx": round(small * px / vb, 2),
            "paperPx": round(small * (mm * PX_PER_MM) / vb, 2),
            "svg": svg,
        }
        cur = best.get(key)
        if cur is None or row["paperPx"] < cur["paperPx"]:
            best[key] = row

    vals = sorted(best.values(), key=lambda v: v["paperPx"])
    if not vals:
        die("글자 있는 그림을 하나도 못 봤다 — 분모가 0이다")

    bad = [v for v in vals if v["paperPx"] < BODY_PX]
    ok = [v for v in vals if v["paperPx"] >= BODY_PX]

    # 나쁜 쪽 12 + **멀쩡한 쪽 4**(음성 대조). 등급이 골고루 들어가는지 검산한다.
    pick = bad[:12] + ok[:4]
    grades = {v["size"] for v in bad}
    missing = grades - {v["size"] for v in pick}
    if missing:
        die(f"나쁜 등급 {sorted(missing)} 이 표본에 없다 — 그 등급은 시안에서 안 보인다")

    payload = {
        "measuredOn": "2026-08-24",
        "bodyPx": BODY_PX,
        "pxPerMm": PX_PER_MM,
        "frame": {k: {"screenPx": v[0], "paperMm": v[1]} for k, v in frame.items()},
        "cuts": cuts,
        "totalSpecs": len(rows),
        "drawn": drawn,
        "withText": len(vals),
        "belowBody": len(bad),
        "samples": pick,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
        fh.write("\n")

    print(f"스펙 {len(rows)} · 그려짐 {drawn} · 글자 있는 종류 {len(vals)}")
    print(f"지면에서 본문({BODY_PX}px)보다 작다: **{len(bad)}** / {len(vals)}")
    print(f"표본 {len(pick)} (나쁜 것 {len(bad[:12])} + 멀쩡한 것 {len(ok[:4])}) → {OUT}")


main()
