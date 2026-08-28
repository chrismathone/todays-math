# -*- coding: utf-8 -*-
"""RPM 그림 글꼴과 **가장 가까운 설치 글꼴**을 찾는다 — 눈이 아니라 치수로.

    python scripts/qa/rpm_font_fingerprint.py

## 왜 이렇게 하나

원본 PDF 에 박힌 글꼴(`EHhabu-Plain` · `EHsang-Plain`)은 **부분집합이라 이름이
지워져 있고 `cmap` 도 없다.** 그래서 「이 글꼴이 무엇인가」를 이름으로 물을 수 없다.

대신 **글자 폭의 벡터**로 묻는다. 글꼴마다 `0`~`9`·`A`~`Z`·`a`~`z` 의 전진폭
비율이 다르고, 그 벡터는 사실상 지문이다. 원본 쪽 폭은 PDF 의 글자 원점 사이
거리에서 **실측**하고, 후보 쪽은 설치된 TTF 의 `hmtx` 에서 읽는다.

⚠️ **눈으로 고르지 않는다.** 「비슷해 보인다」는 판정은 재현되지 않고, 다음 사람이
   같은 조사를 다시 한다.
"""

from __future__ import annotations

import glob
import os
import sys
from collections import defaultdict

import pymupdf
from fontTools.ttLib import TTFont, TTCollection

ROOT = r"N:\개인\강아\교재자료\RPM\22"
BOOKS = [
    ("2-2", "RPM 중학 2-2 학생용.pdf"),
    ("1-2", "RPM 중학 1-2 학생용.pdf"),
]
#: 그림 글꼴만 본다 — 본문 한글 글꼴은 다른 물건이다.
WANTED = ("EHhabu-Plain", "EHsang-Plain")
PAGES = 60
FONT_DIR = r"C:\Windows\Fonts"


def measure_original() -> dict[str, float]:
    """원본 글자들의 **전진폭 ÷ 글자 크기** 를 글자마다 모은다."""

    samples: dict[str, list[float]] = defaultdict(list)
    for _, name in BOOKS:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            continue
        doc = pymupdf.open(path)
        for page_no in range(min(PAGES, doc.page_count)):
            page = doc[page_no]
            for block in page.get_text("rawdict")["blocks"]:
                for line in block.get("lines", []):
                    for span in line["spans"]:
                        if not any(w in span["font"] for w in WANTED):
                            continue
                        size = span["size"]
                        chars = span["chars"]
                        for this, nxt in zip(chars, chars[1:]):
                            ch = this["c"]
                            if not ch.isascii() or ch == " ":
                                continue
                            advance = nxt["origin"][0] - this["origin"][0]
                            if 0.05 < advance / size < 1.4:
                                samples[ch].append(advance / size)
    return {
        ch: sorted(values)[len(values) // 2]
        for ch, values in samples.items()
        if len(values) >= 4
    }


def candidate_widths(path: str) -> dict[str, dict[str, float]]:
    """설치 글꼴 하나(또는 모음)의 글자 폭(em)."""

    out: dict[str, dict[str, float]] = {}
    try:
        fonts = (TTCollection(path).fonts if path.lower().endswith((".ttc", ".otc"))
                 else [TTFont(path, fontNumber=0, lazy=True)])
    except Exception:
        return out
    for font in fonts:
        try:
            cmap = font.getBestCmap()
            upem = font["head"].unitsPerEm
            hmtx = font["hmtx"]
            order = font.getGlyphOrder()
            widths: dict[str, float] = {}
            for code, glyph in cmap.items():
                if code > 0x2FF or glyph not in order:
                    continue
                widths[chr(code)] = hmtx[glyph][0] / upem
            label = font["name"].getDebugName(4) or os.path.basename(path)
            if widths:
                out[label] = widths
        except Exception:
            continue
        finally:
            font.close()
    return out


def main() -> int:
    original = measure_original()
    if not original:
        print("원본 표본을 못 모았다 — N드라이브를 볼 수 있는지 확인하라")
        return 1
    print(f"원본에서 잰 글자 {len(original)}종 (전진폭 ÷ 글자크기, 중앙값)")
    for ch in "0123456789":
        if ch in original:
            print(f"    {ch} {original[ch]:.3f}", end="")
    print()

    rows: list[tuple[float, str, int]] = []
    for path in glob.glob(os.path.join(FONT_DIR, "*.tt[fc]")) + \
            glob.glob(os.path.join(FONT_DIR, "*.otf")):
        for label, widths in candidate_widths(path).items():
            shared = [ch for ch in original if ch in widths]
            if len(shared) < 8:
                continue
            error = sum(abs(widths[ch] - original[ch]) for ch in shared) / len(shared)
            rows.append((error, label, len(shared)))

    rows.sort()
    print("\n가까운 순서 (평균 폭 오차, em):")
    for error, label, count in rows[:15]:
        mark = "  ✅" if error < 0.005 else ("  ○" if error < 0.02 else "")
        print(f"  {error:.4f}  {label:44} 글자 {count}{mark}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
