# -*- coding: utf-8 -*-
"""RPM 그림 글자의 **실제 잉크 치수**를 픽셀에서 잰다.

    python scripts/qa/rpm_ink_metrics.py

## 왜 픽셀인가

`get_text("rawdict")` 의 글자 상자는 부분집합 CID 글꼴에서 **em 상자**를 돌려준다
(숫자 높이 ÷ 글자크기가 **1.187** 로 나왔다 — 잉크라면 있을 수 없는 값이다).
게다가 `ToUnicode` 가 어긋나서 `°` 가 `ù` 로 뽑힌다. 그러니 글자 이름으로도,
글자 상자로도 못 잰다.

지면을 900dpi 로 그려 **잉크 덩어리**를 직접 재면 둘 다 우회한다.
"""

from __future__ import annotations

import os
import statistics as st
import sys

import pymupdf
from PIL import Image

ROOT = r"N:\개인\강아\교재자료\RPM\22"
BOOKS = ["RPM 중학 2-2 학생용.pdf", "RPM 중학 1-2 학생용.pdf"]
DPI = 900
PAGES = 40


def blobs(img: Image.Image) -> list[tuple[int, int, int, int]]:
    """이어진 잉크 덩어리들의 상자 — 간단한 flood fill."""

    width, height = img.size
    px = img.load()
    seen = [[False] * width for _ in range(height)]
    out: list[tuple[int, int, int, int]] = []
    for y in range(height):
        for x in range(width):
            if px[x, y] or seen[y][x]:
                continue
            stack = [(x, y)]
            seen[y][x] = True
            x0 = x1 = x
            y0 = y1 = y
            while stack:
                cx, cy = stack.pop()
                x0, x1 = min(x0, cx), max(x1, cx)
                y0, y1 = min(y0, cy), max(y1, cy)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < width and 0 <= ny < height \
                                and not seen[ny][nx] and not px[nx, ny]:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
            out.append((x0, y0, x1, y1))
    return out


def main() -> int:
    digit_h: list[float] = []
    ring_h: list[float] = []
    ring_top: list[float] = []
    scale = DPI / 72.0
    for book in BOOKS:
        path = os.path.join(ROOT, book)
        if not os.path.exists(path):
            continue
        doc = pymupdf.open(path)
        for page_no in range(min(PAGES, doc.page_count)):
            page = doc[page_no]
            for block in page.get_text("dict")["blocks"]:
                for line in block.get("lines", []):
                    for span in line["spans"]:
                        font = span["font"]
                        if "EHsang" not in font and "EHhabu" not in font:
                            continue
                        text = span["text"]
                        # 「숫자 몇 개 + 도 기호 하나」 꼴만 본다 — `ù` 가 곧 `°` 다.
                        if len(text) < 2 or not text[:-1].isdigit():
                            continue
                        if text[-1] not in "ù°":
                            continue
                        rect = pymupdf.Rect(span["bbox"])
                        if rect.width < 8:
                            continue
                        pix = page.get_pixmap(
                            matrix=pymupdf.Matrix(scale, scale), clip=rect)
                        img = Image.frombytes(
                            "RGB", (pix.width, pix.height), pix.samples)
                        mono = img.convert("L").point(
                            lambda v: 0 if v < 140 else 255, "1")
                        parts = [b for b in blobs(mono)
                                 if (b[2] - b[0]) > 3 and (b[3] - b[1]) > 3]
                        if len(parts) < 2:
                            continue
                        unit = span["size"] * scale
                        parts.sort(key=lambda b: b[0])
                        ring = parts[-1]          # 가장 오른쪽이 도 기호
                        digits = parts[:-1]
                        if not digits:
                            continue
                        baseline = max(b[3] for b in digits)
                        digit_h.append(
                            st.median([(b[3] - b[1]) / unit for b in digits]))
                        ring_h.append((ring[3] - ring[1]) / unit)
                        ring_top.append((baseline - ring[3]) / unit)
    if not digit_h:
        print("표본을 못 모았다")
        return 1
    dh = st.median(digit_h)
    rh = st.median(ring_h)
    rt = st.median(ring_top)
    print(f"표본 {len(digit_h)}개")
    print(f"  숫자 잉크 높이  ÷ 글자크기 = {dh:.3f} em")
    print(f"  ° 잉크 높이     ÷ 글자크기 = {rh:.3f} em   (숫자의 {rh / dh:.2f}배)")
    print(f"  ° 아래끝이 밑선 위로       = {rt:.3f} em   (숫자 높이의 {rt / dh:.2f}배)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
