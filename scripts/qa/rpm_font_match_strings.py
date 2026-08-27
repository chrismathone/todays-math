# -*- coding: utf-8 -*-
"""RPM 글꼴 찾기 **2판 — 문자열 통째로 견준다.**

    python scripts/qa/rpm_font_match_strings.py            # 원본 문자열을 오려 낸다
    python scripts/qa/rpm_font_match_strings.py --score    # 후보와 겹쳐 점수를 낸다

## 왜 글자 단위를 버렸나

1판은 글자 하나하나를 오려 내 견줬는데, **부분집합 CID 글꼴의 `ToUnicode` 가
어긋나** 「`D` 라고 적힌 자리에 `C` 가 그려진」 표본이 섞였다(눈으로 확인).
그 표본으로 점수를 내면 어느 후보든 0.5 근처로 뭉개져 **아무것도 안 갈린다.**

그래서 **문자열 통째로** 본다 — 어떤 글자인지 몰라도 되고, PDF 가 그린 그림과
브라우저가 그린 그림을 바로 견주면 된다. 글자 사이 간격까지 함께 재는 셈이라
지문이 오히려 강해진다.
"""

from __future__ import annotations

import glob
import json
import os
import sys

import pymupdf
from PIL import Image

ROOT = r"N:\개인\강아\교재자료\RPM\22"
BOOKS = ["RPM 중학 2-2 학생용.pdf", "RPM 중학 1-2 학생용.pdf"]
DPI = 900
PAGES = 60
OUT = ".tmp-orca/strings"
#: 이 글자들만 든 span 을 쓴다 — 우리 라벨에 실제로 나오는 부류.
OK_CHARS = set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
               "abcdefghijklmnopqrstuvwxyz+-=°'′ ()")


def tight(img: Image.Image) -> Image.Image:
    gray = img.convert("L").point(lambda v: 0 if v < 140 else 255, "1")
    box = gray.point(lambda v: 255 - v).getbbox()
    return gray.crop(box) if box else gray


def cut() -> None:
    os.makedirs(OUT, exist_ok=True)
    for old in glob.glob(f"{OUT}/*"):
        os.remove(old)
    picked: list[dict] = []
    seen: set[tuple[str, bool]] = set()
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
                        if len(text) < 3 or len(text) > 10:
                            continue
                        if any(ch not in OK_CHARS for ch in text):
                            continue
                        italic = "Italic" in font
                        key = (text, italic)
                        if key in seen:
                            continue
                        rect = pymupdf.Rect(span["bbox"])
                        if rect.width < 6 or rect.height < 4:
                            continue
                        seen.add(key)
                        index = len(picked)
                        pix = page.get_pixmap(
                            matrix=pymupdf.Matrix(DPI / 72.0, DPI / 72.0), clip=rect)
                        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                        tight(img).save(f"{OUT}/orig-{index:03d}.png")
                        picked.append({"i": index, "text": text, "italic": italic,
                                       "font": font, "size": span["size"]})
                        if len(picked) >= 40:
                            break
    json.dump(picked, open(f"{OUT}/index.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"원본 문자열 {len(picked)}개를 오려 냈다 → {OUT}/")
    for row in picked[:12]:
        print(f'  [{row["i"]:03d}] "{row["text"]}"  {"이탤릭" if row["italic"] else "정자체"}'
              f'  {row["font"]}')


def score() -> None:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from rpm_font_match import iou  # noqa: E402

    rows = json.load(open(f"{OUT}/index.json", encoding="utf-8"))
    cands = sorted({os.path.basename(p).rsplit("-", 1)[0][5:]
                    for p in glob.glob(f"{OUT}/cand-*.png")})
    if not cands:
        print("후보 렌더가 없다 — rpm_font_render_strings.mjs 를 먼저 돌려라")
        return
    for italic in (False, True):
        subset = [r for r in rows if r["italic"] == italic]
        if not subset:
            continue
        print(f"\n{'이탤릭' if italic else '정자체'} — 표본 {len(subset)}개")
        table: list[tuple[float, str, int]] = []
        for cand in cands:
            scores = []
            for row in subset:
                a = f"{OUT}/orig-{row['i']:03d}.png"
                b = f"{OUT}/cand-{cand}-{row['i']:03d}.png"
                if os.path.exists(b):
                    scores.append(iou(Image.open(a), tight(Image.open(b))))
            if len(scores) >= max(3, len(subset) // 2):
                table.append((sum(scores) / len(scores), cand, len(scores)))
        table.sort(reverse=True)
        for value, cand, count in table[:8]:
            print(f"  {value:.4f}  {cand.replace('_', ' '):26} 표본 {count}")


if __name__ == "__main__":
    if "--score" in sys.argv:
        score()
    else:
        cut()
