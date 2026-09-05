# -*- coding: utf-8 -*-
"""원본 지면의 한 구역을 크게 렌더한다 (읽기 전용).

「원본에 테두리 상자가 있다」 같은 **주석의 단언**을 눈으로 확인할 때 쓴다.
이 저장소는 「없다·있다를 적기 전에 원본 지면을 한 번 렌더해 보라」를 여러 번 적었다.

    python render_region.py <쪽> <x0> <y0> <x1> <y1> <나갈파일>
"""
from __future__ import annotations

import pathlib
import sys

import pymupdf

SRC = pathlib.Path(
    "N:/개인/기출/2025 기출모음/2025년 2학기 중간고사 모음/pdf/중3"
    "/[정화중][3][25-2-중간][천재이] (완료).PDF"
)


def main() -> int:
    pno, x0, y0, x1, y1, out = sys.argv[1:7]
    doc = pymupdf.open(SRC)
    page = doc[int(pno) - 1]
    clip = pymupdf.Rect(float(x0), float(y0), float(x1), float(y1))
    page.get_pixmap(clip=clip, dpi=200).save(out)
    print(f"→ {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
