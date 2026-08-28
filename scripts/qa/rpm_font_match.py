# -*- coding: utf-8 -*-
"""RPM 그림 글꼴과 후보 글꼴을 **글자 그림으로** 맞댄다.

    python scripts/qa/rpm_font_match.py [나갈.png]

폭 지문만으로는 못 가른다(부분집합 글꼴의 폭이 설치본과 미세하게 다르다).
그래서 **원본 지면에서 글자를 오려 내고**, 같은 글자를 후보 글꼴로 그려
**겹치는 넓이(IoU)** 로 잰다. 눈으로 「비슷해 보인다」고 하지 않는다.

원본 글자는 PDF 에 박힌 글꼴로 그려지므로, 오려낸 그림이 곧 정본이다.
"""

from __future__ import annotations

import os
import sys
from collections import defaultdict

import pymupdf
from PIL import Image

ROOT = r"N:\개인\강아\교재자료\RPM\22"
BOOK = "RPM 중학 2-2 학생용.pdf"
WANTED_FONTS = ("EHhabu-Plain", "EHsang-Plain")
#: 견줄 글자 — 획이 뚜렷이 갈리는 것들.
CHARS = "0123456789ABCDEFGRSacm"
DPI = 900
PAGES = 40

CANDIDATES = [
    ("HancomEQN", "'HancomEQN'"),
    ("HyhwpEQ", "'HyhwpEQ'"),
    ("Times New Roman", "'Times New Roman'"),
    ("Cambria", "'Cambria'"),
    ("Georgia", "'Georgia'"),
    ("Batang", "'Batang'"),
    ("Book Antiqua", "'Book Antiqua'"),
    ("Constantia", "'Constantia'"),
    ("Palatino Linotype", "'Palatino Linotype'"),
    ("Bookman Old Style", "'Bookman Old Style'"),
    ("Century Schoolbook", "'Century Schoolbook'"),
    ("Garamond", "'Garamond'"),
]


def cut_originals() -> dict[str, Image.Image]:
    """원본 지면에서 글자 하나하나를 오려 낸다 (글자마다 가장 큰 표본 하나)."""

    doc = pymupdf.open(os.path.join(ROOT, BOOK))
    best: dict[str, tuple[float, pymupdf.Rect, int]] = {}
    for page_no in range(min(PAGES, doc.page_count)):
        page = doc[page_no]
        for block in page.get_text("rawdict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    if not any(w in span["font"] for w in WANTED_FONTS):
                        continue
                    for char in span["chars"]:
                        ch = char["c"]
                        if ch not in CHARS:
                            continue
                        rect = pymupdf.Rect(char["bbox"])
                        if rect.width < 1 or rect.height < 1:
                            continue
                        if ch not in best or span["size"] > best[ch][0]:
                            best[ch] = (span["size"], rect, page_no)
    out: dict[str, Image.Image] = {}
    scale = DPI / 72.0
    for ch, (_, rect, page_no) in best.items():
        pix = doc[page_no].get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=rect)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        out[ch] = _tight(img)
    return out


def _tight(img: Image.Image) -> Image.Image:
    """글자 잉크의 최소 상자로 자르고 흑백으로."""

    gray = img.convert("L").point(lambda v: 0 if v < 140 else 255, "1")
    box = gray.point(lambda v: 255 - v).getbbox()
    return gray.crop(box) if box else gray


def iou(a: Image.Image, b: Image.Image, size: int = 96) -> float:
    """두 글자 그림의 겹침 비율 — 높이를 맞추고 가운데를 맞춰 견준다."""

    def norm(img: Image.Image) -> Image.Image:
        width = max(1, round(img.width * size / img.height))
        return img.convert("L").resize((width, size), Image.LANCZOS).point(
            lambda v: 255 if v < 128 else 0, "1")

    x, y = norm(a), norm(b)
    width = max(x.width, y.width)
    canvas_x = Image.new("1", (width, size), 0)
    canvas_y = Image.new("1", (width, size), 0)
    canvas_x.paste(x, ((width - x.width) // 2, 0))
    canvas_y.paste(y, ((width - y.width) // 2, 0))
    px, py = canvas_x.load(), canvas_y.load()
    inter = union = 0
    for j in range(size):
        for i in range(width):
            a1, b1 = px[i, j], py[i, j]
            if a1 or b1:
                union += 1
                if a1 and b1:
                    inter += 1
    return inter / union if union else 0.0


def main() -> int:
    originals = cut_originals()
    if not originals:
        print("원본 글자를 못 모았다")
        return 1
    print(f"원본에서 오려낸 글자 {len(originals)}종: {''.join(sorted(originals))}")
    os.makedirs(".tmp-orca/glyphs", exist_ok=True)
    for ch, img in originals.items():
        img.save(f".tmp-orca/glyphs/orig-{ord(ch):02x}.png")
    print("→ .tmp-orca/glyphs/ 에 저장했다. 후보 렌더는 node 쪽에서 한다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
