# -*- coding: utf-8 -*-
"""원본 시험지 PDF 에서 **그림을 그대로** 꺼내 문항에 붙인다.

「기출은 그림 완전 이전이 생명」(원장님 2026-09-06). 종전 `make_specs.py` 는 발문이
주는 값으로 좌표를 **계산해 다시 그렸다** — 값은 맞지만 모양이 원본과 다르다.
원장님이 문10·12·13·14 를 화면에서 짚으셨고, 문14 는 원본이 **지도 사진**이라
도형 엔진으로는 재현이 아예 불가능하다. 이 판은 다시 그리지 않는다.

## 🔴 두 단이다 — 「가까운 마커가 임자」로 하면 거꾸로 걸린다

지면은 B4(728x1031pt) **두 단**이고 번호 마커는 x≈57(왼쪽) · x≈375(오른쪽)에 선다.
y 만 보면 **옆 단의 번호**를 임자로 집는다 — 2026-08-18 에 실제로 밟은 함정이다.
그래서 **같은 단 안에서** 자기 위의 마지막 마커를 임자로 삼는다.

## 문제지와 해설을 가른다

p7~p8 은 정답·해설이라 번호가 **1로 되돌아간다.** 되돌아가는 첫 페이지부터 버리고,
그 판단이 맞는지 「그 페이지 마커에 «정답»이 있는가」로 **한 번 더** 확인한다 —
근거가 하나뿐이면 다음 시험지에서 조용히 어긋난다.

## 무엇을 안 하나

크기로 거르지 않는다(작은 그림이 실제로 있다). 머리말 장식은 **첫 마커보다 위**라는
자리로만 버리고, 버린 것을 전부 찍는다 — 조용히 버리면 「다 꺼냈다」로 읽힌다.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import pymupdf

SRC = pathlib.Path(
    "N:/개인/기출/2025 기출모음/2025년 2학기 중간고사 모음/pdf/중3"
    "/[정화중][3][25-2-중간][천재이] (완료).PDF"
)
OUT = pathlib.Path(__file__).parent / "source"
NUM_RE = re.compile(r"^\s*(\d{1,2})\.\s")
#  단 경계 — 왼쪽 단은 x≈57, 오른쪽 단은 x≈375 에서 시작한다. 그 사이를 가른다.
COLUMN_SPLIT = 350.0
PT_TO_MM = 25.4 / 72.0


def lines_of(page: pymupdf.Page) -> list[dict]:
    out = []
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            out.append(
                {
                    "text": "".join(s["text"] for s in line["spans"]),
                    "x": line["bbox"][0],
                    "y": line["bbox"][1],
                }
            )
    return out


def main() -> int:
    # 편마다 원본·출력 폴더가 다르다(2026-09-12 — 둘째 편부터). 인자가 없으면 정화중 그대로.
    global SRC, OUT
    args = sys.argv[1:]
    if "--src" in args:
        SRC = pathlib.Path(args[args.index("--src") + 1])
    if "--out" in args:
        OUT = pathlib.Path(args[args.index("--out") + 1])
    if not SRC.exists():
        print(f"원본이 없다: {SRC}")
        return 2
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    doc = pymupdf.open(SRC)

    # ── 어느 쪽부터 해설인가 (근거 둘)
    page_max: list[int] = []
    page_min: list[int] = []
    page_has_answer: list[bool] = []
    for page in doc:
        nums = [int(NUM_RE.match(ln["text"]).group(1)) for ln in lines_of(page) if NUM_RE.match(ln["text"])]
        page_max.append(max(nums) if nums else 0)
        page_min.append(min(nums) if nums else 0)
        page_has_answer.append(any("정답" in ln["text"] for ln in lines_of(page)))
    # 🔴 **번호가 1로 되돌아가는 쪽**을 찾는다 — 그 쪽의 «최댓값»이 줄어드는지로 보면 안 된다.
    #    정답 쪽이 1…21 을 **다 나열**하면 최댓값은 안 줄어서(강동중·경산여중 2026-09-12)
    #    해설 시작을 못 찾고 멈췄다. 번호가 없는 쪽(표지·빈 쪽 — 경산여중 p8)은 판정에 안 쓴다.
    # 🔴 근거 둘을 **함께** 쓴다 — 먼저 번호로 고르고 나중에 «정답»으로 확인하면, 번호가
    #    엉뚱한 쪽을 집었을 때 그 확인이 **다음 후보로 못 넘어가고** 편 전체가 멈춘다.
    #    2026-09-13 대구동중: 문제지 p2 의 조건 상자 항목 「1. 2. 3.」(x=63·크기 11)이
    #    문항 번호(x=57·375·크기 9)로 읽혀 min=1 이 됐다. 진짜 해설은 p5 다.
    #    전수 대조(처리한 12편): 해설 시작 쪽은 **언제나** «정답»을 갖고 있고, 번호 규칙은
    #    그중 11편에서 같은 쪽을 고른다 — 둘을 함께 걸면 11편은 그대로고 대구동중만 고쳐진다.
    solution_from = None
    seen_max = 0
    restarts: list[int] = []
    for i in range(len(page_max)):
        if not page_max[i]:
            continue
        if seen_max and page_min[i] == 1:
            restarts.append(i)
            if page_has_answer[i]:
                solution_from = i
                break
        seen_max = max(seen_max, page_max[i])
    if solution_from is None:
        why = ""
        if restarts:
            why = (f" · 번호는 p{[i + 1 for i in restarts]} 에서 되돌아갔지만 그 쪽에 «정답»이 없다"
                   f" («정답»이 있는 쪽: {[i + 1 for i, a in enumerate(page_has_answer) if a] or '없음'})")
        print("해설 시작 쪽을 못 찾았다 — 멈춘다(전부 문제지로 읽으면 해설 그림이 섞인다)" + why)
        return 2
    print(f"문제지 p1~p{solution_from} · 해설 p{solution_from + 1}~p{doc.page_count}")

    rows: list[dict] = []
    dropped: list[dict] = []

    for pno in range(solution_from):
        page = doc[pno]
        markers = sorted(
            (ln["x"], ln["y"], int(NUM_RE.match(ln["text"]).group(1)))
            for ln in lines_of(page)
            if NUM_RE.match(ln["text"])
        )
        first_marker_y = min((m[1] for m in markers), default=None)
        images = [b for b in page.get_text("dict")["blocks"] if b["type"] == 1]

        for block in images:
            x0, y0, x1, y1 = block["bbox"]
            if first_marker_y is not None and y1 <= first_marker_y:
                dropped.append({"page": pno + 1, "bbox": [round(v) for v in block["bbox"]], "why": "머리말 영역"})
                continue
            column = 0 if (x0 + x1) / 2 < COLUMN_SPLIT else 1
            owner = None
            for mx, my, num in markers:
                if (0 if mx < COLUMN_SPLIT else 1) == column and my <= y0 + 1.0:
                    owner = num
            if owner is None:
                dropped.append({"page": pno + 1, "bbox": [round(v) for v in block["bbox"]], "why": "같은 단에 임자 마커 없음"})
                continue

            seen = sum(1 for r in rows if r["number"] == owner)
            name = f"q{owner:02d}" + (f"-{seen + 1}" if seen else "")
            path = OUT / f"{name}.png"
            path.write_bytes(block["image"])
            pix = pymupdf.Pixmap(path)
            rows.append(
                {
                    "number": owner,
                    "page": pno + 1,
                    "file": path.name,
                    "column": column,
                    "bbox": [round(v, 2) for v in (x0, y0, x1, y1)],
                    "widthPt": round(x1 - x0, 2),
                    "heightPt": round(y1 - y0, 2),
                    "widthMm": round((x1 - x0) * PT_TO_MM, 2),
                    "px": [pix.width, pix.height],
                    "dpi": round(pix.width / ((x1 - x0) / 72.0)),
                    "bytes": len(block["image"]),
                }
            )

    rows.sort(key=lambda r: (r["number"], r["file"]))
    (OUT / "index.json").write_text(
        json.dumps({"figures": rows, "dropped": dropped}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\n꺼낸 그림 {len(rows)}장 · 버린 것 {len(dropped)}장")
    for r in rows:
        print(
            f"  문{r['number']:2d}  p{r['page']} {'좌' if r['column'] == 0 else '우'}"
            f"  {r['file']:12s} {r['widthMm']:5.1f}mm  {r['px'][0]}x{r['px'][1]}px  {r['dpi']}dpi"
        )
    for d in dropped:
        print(f"  [버림] p{d['page']} {d['why']} bbox={d['bbox']}")
    have = {r["number"] for r in rows}
    last = max((m for m in page_max[:solution_from] if m), default=0)
    print(f"그림이 안 붙은 문항: {sorted(set(range(1, last + 1)) - have)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
