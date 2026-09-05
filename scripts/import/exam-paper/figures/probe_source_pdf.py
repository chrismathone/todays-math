# -*- coding: utf-8 -*-
"""원본 시험지 PDF 의 **그림 재료**를 조사한다 (읽기 전용).

「기출은 그림 완전 이전이 생명」(원장님 2026-09-06)이라, 도형 엔진으로 다시 그리는
지금 방식(`make_specs.py`)을 원본 오려내기로 바꿀 수 있는지부터 본다.

⚠️ 경로에 한글이 있어 **셸로 넘기면 cp949 로 뭉개진다**(08 원장 §5.1). 여기 박아 둔다.
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
    if not SRC.exists():
        print(f"원본이 없다: {SRC}")
        return 2
    doc = pymupdf.open(SRC)
    print(f"쪽 수 {doc.page_count}")
    for i, page in enumerate(doc):
        blocks = page.get_text("dict")["blocks"]
        text_blocks = [b for b in blocks if b["type"] == 0]
        image_blocks = [b for b in blocks if b["type"] == 1]
        drawings = page.get_drawings()
        # 축에 나란한 곧은 선은 `is_empty` 가 참이다 — 세지 않으면 전개도가 통째로 빠진다
        # (CLAUDE.md 2026-08-19). 그래서 여기서는 **거르지 않고** 전부 센다.
        strokes = sum(len(d["items"]) for d in drawings)
        print(
            f" p{i + 1}: 지면 {page.rect.width:.1f}x{page.rect.height:.1f}"
            f" · 글자블록 {len(text_blocks)}"
            f" · 삽입이미지 {len(image_blocks)}"
            f" · 벡터 path {len(drawings)} (획 {strokes})"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
