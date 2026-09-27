# -*- coding: utf-8 -*-
"""큐브수학 개념 진도북 글자층 읽개 — 개념 용어 전수(트랙 elem56: 초5-1·5-2·6-1·6-2).

N 드라이브는 읽기만 한다. PDF 만 연다(.hwp 금지 · 한컴 COM 금지).

수식 글꼴 `EHsang` 은 한컴 사설 배치다. 아래 표는 지면 렌더로 하나씩 대조했다
(2026-09-28, 5-1 p76 «0.8>0.6» · «5/15 < 6/15», 6-1 p86 «%», 6-1 p130 «cm³» …).
🔴 `U+001F`='>' · `U+001D`='<' 이다. 옛 3-1 스크립트(`extract-cube-jindo31.py` ·
`learn-cube-units.py`)의 표는 둘이 **거꾸로**다 — 여기서는 지면을 따른다.

표에 없는 글자는 지어내지 않는다: `GARBLE` 로 바꾸고 줄에 `garbled` 표시를 단다.
세로로 쌓인 숫자(분수)·`EHboNA`(분수 약물)·`EHyak`·`EHChod` 도 같은 취급이다.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pymupdf

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BOOK_DIR = Path(r"N:\개인\강아\교재자료\큐브수학 개념\큐브수학 개념\진도북")
GRADES = ("5-1", "5-2", "6-1", "6-2")


def book_path(grade: str) -> Path:
    return BOOK_DIR / f"큐브수학 개념 {grade}_진도북.pdf"


GARBLE = "▯"

# EHsang(Plain·Bold) — 지면 대조로 확정한 것만.
EHSANG: dict[str, str] = {chr(0x11 + i): str(i) for i in range(10)}
EHSANG.update(
    {
        "\x1e": "=",
        "\x1f": ">",  # 5-1 p76 «0.8>0.6»
        "\x1d": "<",  # 5-1 p76 «5/15 < 6/15»
        "\x0c": "+",
        "\x0e": "-",
        "\x0f": ".",  # 소수점 0.6
        "\x1b": ":",  # 비 3:4
        "\x06": "%",
        "\x96": "÷",
        "@": "×",
        "\x99": "²",
        "\x9a": "³",
        "\t": "(",
        "\n": ")",
        "\x03": " ",
        "A": " ",  # 얇은 칸 — «1 cm²»
        " ": " ",
        "D": "c",
        "N": "m",
        "L": "k",
        "H": "g",
        "U": "t",
        "X": "W",
        "I": "h",
        "-": "L",  # 들이 «15 L»
        "±": "°",
        "\x81": "°C",
        '"': "A",  # 혈액형 A·B·O (6-1 p109)
        "#": "B",
        "0": "O",
    }
)


def decode_span(font: str, text: str) -> tuple[str, bool]:
    """(해독 글자, 깨짐 여부). 수식 글꼴이 아니면 그대로."""
    base = font.split("-KSC")[0]
    if not base.startswith("EH"):
        return text, False
    if base.startswith("EHsang"):
        out, bad = [], False
        for ch in text:
            if ch in EHSANG:
                out.append(EHSANG[ch])
            else:
                out.append(GARBLE)
                bad = True
        return "".join(out), bad
    # EHboNA(분수 약물) · EHboNB · EHyak · EHChod — 뜻을 확정하지 못했다.
    if text.strip() == "":
        return text, False
    return GARBLE, True


def is_accent(color: int) -> bool:
    """본문 검정(#231f20)·회색·흰색이 아닌 색 — 정의 용어 강조 후보."""
    r, g, b = (color >> 16) & 255, (color >> 8) & 255, color & 255
    if max(r, g, b) - min(r, g, b) < 24:  # 무채색(검정·회색·흰색)
        return False
    return True


def page_lines(page: pymupdf.Page) -> list[dict]:
    """줄마다 해독 글자 · span(글꼴·색·크기) · 깨짐 여부."""
    lines = []
    for bi, b in enumerate(page.get_text("rawdict")["blocks"]):
        for l in b.get("lines", []):
            spans = []
            base_y = None
            stacked = False
            for sp in l["spans"]:
                raw = "".join(c["c"] for c in sp["chars"])
                if raw == "":
                    continue
                font = sp["font"]
                if font.startswith("EHsang"):
                    # 분수: 같은 줄 안에서 숫자가 위아래로 쌓인다(분자·분모).
                    for c in sp["chars"]:
                        if c["c"] in EHSANG and "0" <= EHSANG[c["c"]] <= "9":
                            y = c["origin"][1]
                            if base_y is None:
                                base_y = y
                            elif abs(y - base_y) > 3.0:
                                stacked = True
                text, bad = decode_span(font, raw)
                spans.append(
                    {
                        "text": text,
                        "font": font.split("-KSC")[0],
                        "size": round(sp["size"], 1),
                        "color": sp["color"],
                        "flags": sp["flags"],
                        "garbled": bad,
                        "bbox": sp["bbox"],
                    }
                )
            if not spans:
                continue
            text = "".join(s["text"] for s in spans)
            lines.append(
                {
                    "block": bi,
                    "bbox": l["bbox"],
                    "text": text,
                    "spans": spans,
                    "garbled": any(s["garbled"] for s in spans) or stacked,
                    "stacked": stacked,
                }
            )
    return lines


BOOK_PAGE = re.compile(r"^(\d{3})$")


def book_page_label(page: pymupdf.Page, pno: int) -> str:
    """지면 쪽 번호(DINPro 세 자리). 못 찾으면 PDF 쪽 번호로(진도북은 둘이 같다)."""
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for sp in l["spans"]:
                if sp["font"].startswith("DINPro") and BOOK_PAGE.match(sp["text"].strip()):
                    if l["bbox"][1] > page.rect.height * 0.9:
                        return f"{sp['text'].strip()}쪽"
    return f"{pno:03d}쪽"
