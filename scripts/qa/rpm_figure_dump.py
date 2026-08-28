# -*- coding: utf-8 -*-
"""RPM 한 쪽의 그림 덩어리 하나를 **수치로** 펼친다 — 복제할 때 눈대중하지 않으려고.

    python scripts/qa/rpm_figure_dump.py <책> <쪽> <덩어리번호>

선·곡선의 좌표와 굵기, 글자의 내용·글꼴·크기·자리를 그대로 찍는다.
덩어리 번호는 `rpm_crop_figures.py` 가 만든 파일 이름의 끝 두 자리와 같다.

⚠️ 저작권 — 여기서 얻는 것은 **기하 구성**이다. 원본 본문을 우리 자료로 옮기지 않는다.
"""

from __future__ import annotations

import math
import os
import sys

import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rpm_crop_figures import FILES, MIN_SIDE, OFFSET, ROOT, merge  # noqa: E402


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    book, page_no, index = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    doc = pymupdf.open(os.path.join(ROOT, FILES[book]))
    page = doc[page_no + OFFSET]

    boxes = [pymupdf.Rect(d["rect"]) for d in page.get_drawings()]
    boxes = [b for b in boxes if b.width < page.rect.width * 0.9]
    clusters = [c for c in merge(boxes)
                if c.width >= MIN_SIDE and c.height >= MIN_SIDE]
    clusters.sort(key=lambda r: (round(r.y0 / 40), r.x0))
    if index >= len(clusters):
        print(f"덩어리가 {len(clusters)}개뿐이다")
        return 1
    target = clusters[index]
    print(f"덩어리 {index}: {[round(v, 1) for v in target]}"
          f"  ({target.width:.1f}x{target.height:.1f}pt)")

    print("\n── 선 ──  (x0,y0)→(x1,y1) · 길이 · 수평에서 각 · 굵기 · 점선")
    for drawing in page.get_drawings():
        if not target.contains(pymupdf.Rect(drawing["rect"])):
            continue
        dash = drawing.get("dashes") or ""
        for item in drawing["items"]:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                length = math.hypot(p2.x - p1.x, p2.y - p1.y)
                if length < 4:
                    continue
                deg = math.degrees(math.atan2(-(p2.y - p1.y), p2.x - p1.x)) % 360
                print(f"  ({p1.x:7.2f},{p1.y:7.2f}) → ({p2.x:7.2f},{p2.y:7.2f})"
                      f"  {length:6.1f}pt  {deg:6.1f}°  굵기 {drawing['width']:.2f}"
                      f"  {dash if dash and dash != '[] 0' else ''}")
            elif item[0] == "c":
                p1, p4 = item[1], item[4]
                print(f"  곡선 ({p1.x:7.2f},{p1.y:7.2f}) → ({p4.x:7.2f},{p4.y:7.2f})"
                      f"  굵기 {drawing['width']:.2f}"
                      f"  {dash if dash and dash != '[] 0' else ''}")

    print("\n── 글자 ──  내용 · 글꼴 · 크기 · 상자")
    grown = pymupdf.Rect(target.x0 - 18, target.y0 - 18,
                         target.x1 + 18, target.y1 + 18)
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                rect = pymupdf.Rect(span["bbox"])
                if not grown.intersects(rect) or span["size"] > 9.5:
                    continue
                print(f'  "{span["text"]}"  {span["font"]}  {span["size"]:.2f}pt'
                      f'  ({rect.x0:.1f},{rect.y0:.1f})-({rect.x1:.1f},{rect.y1:.1f})')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
