# -*- coding: utf-8 -*-
"""원본 지면의 **단 구조**와 번호 마커 자리를 본다 (읽기 전용).

첫 매핑이 틀렸다 — 문13·14 가 빠지고 문18 이 3장을 받았다. 「가까운 마커가 임자」가
두 단 지면에서 거꾸로 걸리는 자리다(CLAUDE.md 2026-08-18). 먼저 **단이 몇인지**,
그리고 어느 쪽이 해설 페이지인지 눈으로 확인한다.
"""
from __future__ import annotations

import pathlib
import re
import sys

import pymupdf

SRC = pathlib.Path(
    "N:/개인/기출/2025 기출모음/2025년 2학기 중간고사 모음/pdf/중3"
    "/[정화중][3][25-2-중간][천재이] (완료).PDF"
)
NUM_RE = re.compile(r"^\s*(\d{1,2})\.\s")


def main() -> int:
    doc = pymupdf.open(SRC)
    for pno, page in enumerate(doc, start=1):
        data = page.get_text("dict")
        marks = []
        xs = []
        for block in data["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                text = "".join(s["text"] for s in line["spans"]).strip()
                xs.append(round(line["bbox"][0]))
                m = NUM_RE.match(text)
                if m:
                    marks.append((round(line["bbox"][0]), round(line["bbox"][1]), int(m.group(1)), text[:34]))
        imgs = [
            (round(b["bbox"][0]), round(b["bbox"][1]), round(b["bbox"][2]), round(b["bbox"][3]))
            for b in data["blocks"]
            if b["type"] == 1
        ]
        head = " ".join(
            "".join(s["text"] for s in ln["spans"]).strip()
            for bl in data["blocks"][:2]
            if bl["type"] == 0
            for ln in bl["lines"][:1]
        )[:50]
        print(f"\n── p{pno}  머리 «{head}»")
        print(f"   줄 왼쪽끝 분포: {sorted(set(xs))[:14]}")
        print(f"   번호 마커: {marks}")
        print(f"   그림 bbox: {imgs}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
