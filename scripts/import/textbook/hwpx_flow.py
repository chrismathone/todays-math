# -*- coding: utf-8 -*-
"""HWPX → 문단의 흐름 (교과서 이관 · 2026-10-07).

`scripts/vendor/testchanger/hwp_extract.py` 의 `stream_of` 는 글 · 수식 · 미주만 낸다. 교과서 자료는 그것으로 모자라다:

- **문항 번호가 작은 그림**인 책이 있다(YBM «실력 UP 문제» — 23×27 픽셀 BMP 의 «1», «2»). 글에는 번호가 없다.
- **그림 문제**를 가려야 한다 — 문단 안 그림의 크기와 바이너리 이름이 있어야 오려 낼 수 있다.
- 표 안의 글(정답 칸 · 보기 상자)과 표 밖의 글을 갈라야 할 때가 있다.

그래서 문단마다 `Para` 하나를 낸다 — 문서 순서 그대로, 머리말 · 꼬리말은 뺀다.
수식은 한글 수식 문법 그대로 `$…$` 로 감싼다(LaTeX 로 바꾸는 일은 적재 쪽 — `src/lib/math/hwpEquation.ts`).
"""
from __future__ import annotations

import dataclasses
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

HP = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"
HC = "{http://www.hancom.co.kr/hwpml/2011/core}"
_SKIP = {HP + "header", HP + "footer"}

_CIRCLED_FOLD = str.maketrans(
    {**{chr(0x2780 + i): chr(0x2460 + i) for i in range(10)}, **{chr(0x24F5 + i): chr(0x2460 + i) for i in range(10)}}
)

#: 이보다 작은 그림은 «글자 대신 쓴 그림»(번호 · 기호)으로 본다 — HWPUNIT(1/7200 인치). 4,000 ≈ 14mm.
GLYPH_PICTURE_MAX = 4000


@dataclasses.dataclass
class Picture:
    bin_id: str
    width: int
    height: int

    @property
    def is_glyph(self) -> bool:
        return 0 < self.width <= GLYPH_PICTURE_MAX and 0 < self.height <= GLYPH_PICTURE_MAX


@dataclasses.dataclass
class Para:
    text: str
    pictures: list[Picture]
    #: 문단이 (공백을 빼고) 그림으로 시작한다 — 번호 그림의 자리
    lead_picture: Picture | None
    #: 표 안의 문단이면 1 이상(겹친 표는 더 크다)
    table_depth: int
    #: 미주 · 각주의 글(기출 완료본은 정답을 미주에 넣었다)
    notes: list[str]
    #: 한글 도형(선 · 호 · 곡선 · 다각형 …)의 수 — 그림 파일 없이 **그린 그림**이다. 그림 문제를 가릴 때 센다
    shapes: int = 0


def _size(node) -> tuple[int, int]:
    for tag in (HP + "sz", HP + "orgSz", HP + "curSz"):
        found = node.find(tag)
        if found is not None:
            try:
                width = int(found.get("width", "0"))
                height = int(found.get("height", "0"))
            except ValueError:
                continue
            if width and height:
                return width, height
    return 0, 0


def _note_text(node) -> str:
    parts: list[str] = []
    for el in node.iter():
        if el.tag == HP + "t":
            parts.append("".join(el.itertext()))
        elif el.tag == HP + "script":
            parts.append(f"${(el.text or '').strip()}$")
    return "".join(parts).strip()


class _Walker:
    def __init__(self) -> None:
        self.paras: list[Para] = []

    def walk(self, node, depth: int) -> None:
        for child in node:
            if child.tag in _SKIP:
                continue
            if child.tag == HP + "p":
                self.paragraph(child, depth)
            else:
                self.walk(child, depth)

    def paragraph(self, p, depth: int) -> None:
        buf: list[str] = []
        pictures: list[Picture] = []
        notes: list[str] = []
        lead: Picture | None = None
        shapes = 0

        def emit_text(value: str) -> None:
            buf.append(value)

        def flush() -> None:
            """여기까지를 문단 하나로 낸다 — 표 · 글상자를 만나면 그 앞까지 끊고, 그 안의 문단을 **그 자리에서** 읽는다
            (문서 차례 그대로. 번호가 글상자에 있고 물음이 바깥 문단에 있는 책이 있다)."""
            nonlocal lead, shapes
            text = re.sub(r"[ \t 　]+", " ", "".join(buf)).strip()
            # 보기 번호를 한 계열로 — `➀`(U+2780) · `⓵`(U+24F5) 계열을 `①` 로(YBM 은 한 문항 안에 섞어 썼다)
            text = text.translate(_CIRCLED_FOLD)
            if text or pictures or notes or shapes:
                self.paras.append(Para(text, list(pictures), lead, depth, list(notes), shapes))
            buf.clear()
            pictures.clear()
            notes.clear()
            lead = None
            shapes = 0

        def visit(node) -> None:
            nonlocal lead, shapes
            for el in node:
                tag = el.tag
                if tag in _SKIP:
                    continue
                if tag == HP + "t":
                    text = el.text or ""
                    for g in el:
                        if g.tag == HP + "tab":
                            text += " "
                        elif g.tag == HP + "lineBreak":
                            text += "\n"
                        text += g.tail or ""
                    emit_text(text)
                elif tag == HP + "equation":
                    script = el.find(HP + "script")
                    value = (script.text or "").strip() if script is not None else ""
                    if value:
                        emit_text(f"${value}$")
                elif tag == HP + "pic":
                    img = el.find(HC + "img")
                    width, height = _size(el)
                    picture = Picture(img.get("binaryItemIDRef", "") if img is not None else "", width, height)
                    pictures.append(picture)
                    if lead is None and not "".join(buf).strip():
                        lead = picture
                elif tag in (HP + "endNote", HP + "footNote"):
                    notes.append(_note_text(el))
                elif tag == HP + "tbl":
                    flush()
                    self.walk(el, depth + 1)
                elif tag in (HP + "line", HP + "arc", HP + "curve", HP + "connectLine"):
                    shapes += 1
                elif tag in (HP + "rect", HP + "ellipse", HP + "polygon", HP + "container", HP + "drawText", HP + "subList"):
                    # 글상자 · 묶음 안의 문단. 글이 없는 도형(삼각형 · 원 …)은 그린 그림으로 센다
                    if tag in (HP + "ellipse", HP + "polygon", HP + "container") or (
                        tag == HP + "rect" and el.find(HP + "drawText") is None
                    ):
                        shapes += 1
                    flush()
                    self.walk(el, depth)
                else:
                    visit(el)

        visit(p)
        flush()


def read_paras(hwpx: Path) -> list[Para]:
    """문서 순서의 문단들. 섹션이 여럿이면 차례대로 잇는다."""
    with zipfile.ZipFile(hwpx) as z:
        sections = sorted(
            (n for n in z.namelist() if re.match(r"Contents/section\d+\.xml$", n)),
            key=lambda n: int(re.search(r"(\d+)", n).group(1)),
        )
        walker = _Walker()
        for name in sections:
            walker.walk(ET.fromstring(z.read(name)), 0)
    return walker.paras


def binary_items(hwpx: Path) -> dict[str, str]:
    """`binaryItemIDRef` → zip 안의 파일 이름(`BinData/image3.png`)."""
    with zipfile.ZipFile(hwpx) as z:
        names = [n for n in z.namelist() if n.startswith("BinData/")]
    out: dict[str, str] = {}
    for name in names:
        stem = Path(name).stem
        out[stem] = name
    return out
