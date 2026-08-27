# -*- coding: utf-8 -*-
"""RPM 한 쪽에서 **그림만** 오려 낸다 — 1:1 대조용. 커밋하지 않는다.

    python scripts/qa/rpm_crop_figures.py <책> <쪽> <나갈 디렉터리> [--dpi 300]

벡터 획(`get_drawings`)을 가까운 것끼리 묶어 덩어리마다 한 장씩 뽑는다.
글자는 안 센다 — 라벨은 획 상자를 넓혀 자연히 딸려 온다.

⚠️ 저작권 — 이 PNG 는 **우리 그림과 견주기 위한** QA 산출물이다. 저장소에 커밋하지
   않고(`.tmp-orca/` 아래), 원본의 본문·수치를 우리 자료로 옮기지 않는다.
"""

from __future__ import annotations

import os
import sys

import pymupdf

ROOT = r"N:\개인\강아\교재자료\RPM\22"
FILES = {
    "1-2": "RPM 중학 1-2 학생용.pdf",
    "2-2": "RPM 중학 2-2 학생용.pdf",
    "3-2": "RPM 중학 3-2 학생용.pdf",
}
# 쪽 번호 ↔ PDF 색인 차이 (rpm_page_png.py 와 같은 값이어야 한다).
OFFSET = -1
GAP = 14.0        # 이만큼 안에 있으면 한 덩어리
MIN_SIDE = 26.0   # 이보다 작은 덩어리는 표시·글머리표다
PAD = 7.0


def merge(boxes: list[pymupdf.Rect]) -> list[pymupdf.Rect]:
    """가까운 상자를 하나로 — 더 안 합쳐질 때까지 되풀이한다."""
    out = [pymupdf.Rect(b) for b in boxes]
    changed = True
    while changed:
        changed = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                a, b = out[i], out[j]
                grown = pymupdf.Rect(a.x0 - GAP, a.y0 - GAP, a.x1 + GAP, a.y1 + GAP)
                if grown.intersects(b):
                    out[i] = a | b
                    del out[j]
                    changed = True
                    break
            if changed:
                break
    return out


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    book, page_no, out_dir = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    dpi = 300
    if "--dpi" in sys.argv:
        dpi = int(sys.argv[sys.argv.index("--dpi") + 1])
    path = os.path.join(ROOT, FILES[book])
    doc = pymupdf.open(path)
    page = doc[page_no + OFFSET]

    boxes = [pymupdf.Rect(d["rect"]) for d in page.get_drawings()]
    boxes = [b for b in boxes if b.width < page.rect.width * 0.9]
    clusters = [
        c for c in merge(boxes)
        if c.width >= MIN_SIDE and c.height >= MIN_SIDE
    ]
    clusters.sort(key=lambda r: (round(r.y0 / 40), r.x0))

    os.makedirs(out_dir, exist_ok=True)
    scale = dpi / 72.0
    made = []
    for index, rect in enumerate(clusters):
        clip = pymupdf.Rect(rect.x0 - PAD, rect.y0 - PAD, rect.x1 + PAD, rect.y1 + PAD)
        clip = clip & page.rect
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=clip)
        name = os.path.join(out_dir, f"{book}-p{page_no}-{index:02d}.png")
        pix.save(name)
        made.append((name, round(clip.width, 1), round(clip.height, 1)))
    for name, w, h in made:
        print(f"{name}  {w}x{h}pt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
