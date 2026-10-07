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
_BOXES = {HP + name for name in ("rect", "ellipse", "polygon", "container", "drawText", "subList")}

_CIRCLED_FOLD = str.maketrans(
    {**{chr(0x2780 + i): chr(0x2460 + i) for i in range(10)}, **{chr(0x24F5 + i): chr(0x2460 + i) for i in range(10)}}
)

#: 이보다 작은 그림은 «글자 대신 쓴 그림»(번호 · 기호)으로 본다 — HWPUNIT(1/7200 인치). 4,000 ≈ 14mm.
GLYPH_PICTURE_MAX = 4000

#: 문단에 «띄워» 매어 둔 개체(글자처럼 취급하지 않는 표 · 글상자)가 문단의 첫 줄보다 이만큼 아래에 놓이면
#: 그 문단의 **글 뒤에** 읽는다 — HWPUNIT. 한 줄이 1,700 남짓이다.
#:
#: 지학사 «소단원 종합 문제»: 자료 표가 발문 문단의 **맨 앞 run** 에 매여 있고 자리는 «문단에서 4,132 아래»다.
#: XML 차례대로 읽으면 표가 발문보다 먼저 나와 **앞 문항의 끝에 붙고**, 그 문항은 자료 없이 글만 남는다
#: (01번이 «다음은 … 조사하여 나타낸 것이다. 이 자료의 중앙값은?» 뿐인 깨끗해 보이는 문항이 됐다).
FLOAT_BELOW_MIN = 1000

#: 보기 번호로 시작하는 칸 — 보기를 표로 짠 것
_CHOICE_HEAD = re.compile("^[①-⑩]")
#: 물음의 끝 — 이런 글이 든 칸은 자료가 아니라 문항이다(표로 지면을 짠 것)
_ASKS = re.compile(r"\?|구하시오|구하여라|고르시오|고르면|쓰시오|하시오|나타내시오|말하시오|답하시오|설명하시오")
#: 자료 표의 칸은 짧다 — 수식은 한 글자로 센다
DATA_CELL_MAX = 30


def _visible(text: str) -> int:
    return len(re.sub(r"\$[^$]*\$", "§", text))


@dataclasses.dataclass
class Picture:
    bin_id: str
    width: int
    height: int
    #: 문단의 글 안에서 이 그림이 놓인 자리(글자 수) — 보기 번호 뒤의 그림인지 가릴 때 쓴다. 모르면 -1
    offset: int = -1
    #: 잘라 보이기 — (왼, 위, 오른, 아래), 단위는 그림의 1/75 픽셀. 없으면 None
    clip: tuple[int, int, int, int] | None = None
    #: 글 뒤에 깔렸거나 쪽에 매인 그림 — 쪽 배경 · 장식이다(문항의 그림이 아니다)
    behind: bool = False
    #: 돌린 각(도) · 뒤집힘(가로, 세로)
    rotation: int = 0
    flip: tuple[bool, bool] = (False, False)
    #: 묶음 개체(`hp:container`) 안의 그림 — 글상자 · 선과 함께 묶여 있어 그림 파일만으로는 다 안 그려진다
    grouped: bool = False

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
    #: 이 문단이 **자료 표**의 칸이면 그 표의 번호(문서 안에서 1부터), 아니면 0.
    #: 문제은행은 본문에 표를 글로 적지 않는다(표는 그림으로 붙인다) — 자료 표가 든 문항은 글만으로는 못 싣는다.
    #: 칸의 글은 지금처럼 한 줄씩 그대로 낸다: 정답 칸의 «빠른 정답» 표도 같은 꼴이라, 여기서 뭉치면 그쪽이 깨진다.
    table_id: int = 0
    #: 묶음 개체 안의 그림 — `pictures` 와 따로 둔다(번호 그림 · 정답 칸을 가리는 규칙은 `pictures` 만 본다)
    group_pictures: list[Picture] = dataclasses.field(default_factory=list)
    #: `shapes` 로 센 도형 하나하나 — (종류, 가로, 세로) HWPUNIT. 번호 딱지 같은 작은 묶음과 진짜 그림을 가릴 때 쓴다
    shape_list: list[tuple[str, int, int]] = dataclasses.field(default_factory=list)


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


def _picture(el, *, grouped: bool = False) -> Picture:
    """`hp:pic` 하나 — 보이는 크기 · 잘림 · 놓인 꼴."""
    img = el.find(HC + "img")
    width, height = _size(el)
    clip = None
    node = el.find(HP + "imgClip")
    if node is not None:
        try:
            left, top, right, bottom = (int(node.get(key, "0")) for key in ("left", "top", "right", "bottom"))
            if right > left and bottom > top:
                clip = (left, top, right, bottom)
        except ValueError:
            clip = None
    pos = el.find(HP + "pos")
    behind = el.get("textWrap") == "BEHIND_TEXT" or (
        pos is not None and pos.get("vertRelTo") == "PAPER" and pos.get("treatAsChar") == "0"
    )
    info = el.find(HP + "rotationInfo")
    try:
        rotation = int(info.get("angle", "0")) if info is not None else 0
    except ValueError:
        rotation = 0
    flip = el.find(HP + "flip")
    flips = (flip.get("horizontal") == "1", flip.get("vertical") == "1") if flip is not None else (False, False)
    return Picture(
        img.get("binaryItemIDRef", "") if img is not None else "",
        width,
        height,
        clip=clip,
        behind=behind,
        rotation=rotation,
        flip=flips,
        grouped=grouped,
    )


#: 문단의 글에 그림의 자리를 적어 두는 글자 — 글을 다듬은 뒤 자리(글자 수)로 바꾸고 걷는다
_PIC_MARK = chr(2)


def _mark_offsets(text: str) -> tuple[str, list[int]]:
    """자리 글자가 든 글 → (자리 글자를 걷은 글, 자리들). 걷은 자리 양옆의 빈칸이 겹치면 하나로 줄인다."""
    parts = text.split(_PIC_MARK)
    out = parts[0]
    offsets: list[int] = []
    for part in parts[1:]:
        if out.endswith(" ") and part.startswith(" "):
            part = part[1:]
        offsets.append(len(out))
        out += part
    lead = len(out) - len(out.lstrip(" "))
    clean = out.strip()
    return clean, [min(max(0, offset - lead), len(clean)) for offset in offsets]


def _note_text(node) -> str:
    parts: list[str] = []
    for el in node.iter():
        if el.tag == HP + "t":
            parts.append("".join(el.itertext()))
        elif el.tag == HP + "script":
            parts.append(f"${(el.text or '').strip()}$")
    return "".join(parts).strip()


def _floats_below(node) -> bool:
    """글자처럼 취급하지 않는 개체가 문단 첫 줄보다 아래에 놓였나."""
    pos = node.find(HP + "pos")
    if pos is None or pos.get("treatAsChar") != "0" or pos.get("vertRelTo") != "PARA":
        return False
    try:
        offset = int(pos.get("vertOffset", "0"))
    except ValueError:
        return False
    # 음수는 부호 없는 32비트로 적혀 있다(`4294967240` = −56). 그대로 견주면 «문단 위로 살짝 올린 번호 상자»가
    # «아주 아래에 놓인 개체»가 돼, 번호가 발문 뒤로 밀리고 발문은 앞 문항의 끝에 붙는다(미래엔 «단원평가»).
    if offset >= 1 << 31:
        offset -= 1 << 32
    return offset >= FLOAT_BELOW_MIN


def _table_kind(cells: list[list[list["Para"]]]) -> str:
    """표가 무엇인가 — `data`(자료 표) · `layout`(지면을 짠 틀 · 보기 표 · 조건 상자)."""
    flat = [para for row in cells for cell in row for para in cell]
    texts = [para.text for para in flat if para.text]
    if not texts or any(_CHOICE_HEAD.match(text) for text in texts):
        return "layout"
    count = sum(len(row) for row in cells)
    nested = any(para.table_id for para in flat)
    if count == 1:
        # 칸 하나짜리는 테두리 상자다(<보기> · 조건). 다만 «제목 + 안쪽 자료 표»면 통째로 자료 표다
        own = sum(_visible(para.text) for para in flat if not para.table_id)
        return "data" if nested and own <= 60 else "layout"
    if any(_visible(text) > DATA_CELL_MAX or _ASKS.search(text) for text in texts):
        return "layout"
    return "data"


class _Walker:
    def __init__(self, counter: list[int] | None = None) -> None:
        self.paras: list[Para] = []
        #: 자료 표의 번호를 세는 자리 — 칸을 읽는 안쪽 워커와 같이 쓴다
        self.counter = counter if counter is not None else [0]

    def table(self, tbl, depth: int) -> None:
        cells: list[list[list[Para]]] = []
        # 바로 아래 줄만 — 칸 안에 든 안쪽 표의 줄은 그 칸을 읽는 워커가 읽는다
        for tr in tbl.findall(HP + "tr"):
            row: list[list[Para]] = []
            for tc in tr.findall(HP + "tc"):
                inner = _Walker(self.counter)
                inner.walk(tc, depth + 1)
                row.append(inner.paras)
            if row:
                cells.append(row)
        flat = [para for row in cells for cell in row for para in cell]
        if _table_kind(cells) == "data":
            self.counter[0] += 1
            for para in flat:
                para.table_id = self.counter[0]
        self.paras.extend(flat)

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
        group_pics: list[Picture] = []
        shape_list: list[tuple[str, int, int]] = []
        #: 자리 글자를 넣은 차례대로의 그림(묶음 안팎 모두)
        marked: list[Picture] = []
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
            # 그림의 자리 — 글에 적어 둔 자리 글자를 걷고 글자 수로 바꾼다(글은 전과 한 글자도 다르지 않다)
            text, offsets = _mark_offsets(text)
            for picture, offset in zip(marked, offsets):
                picture.offset = offset
            if text or pictures or notes or shapes or group_pics:
                self.paras.append(
                    Para(
                        text, list(pictures), lead, depth, list(notes), shapes,
                        group_pictures=list(group_pics), shape_list=list(shape_list),
                    )
                )
            buf.clear()
            pictures.clear()
            group_pics.clear()
            marked.clear()
            shape_list.clear()
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
                    picture = _picture(el)
                    pictures.append(picture)
                    marked.append(picture)
                    if lead is None and not "".join(buf).replace(_PIC_MARK, "").strip():
                        lead = picture
                    buf.append(_PIC_MARK)
                elif tag in (HP + "endNote", HP + "footNote"):
                    notes.append(_note_text(el))
                elif tag == HP + "tbl" or tag in _BOXES:
                    if _floats_below(el):
                        below.append(el)  # 이 문단의 글을 다 낸 뒤에 읽는다
                    else:
                        container(el)
                elif tag in (HP + "line", HP + "arc", HP + "curve", HP + "connectLine"):
                    shapes += 1
                    shape_list.append((tag.replace(HP, ""), *_size(el)))
                else:
                    visit(el)

        def container(el) -> None:
            """표 · 글상자 — 여기까지를 끊고 그 안의 문단을 읽는다."""
            nonlocal shapes
            tag = el.tag
            if tag == HP + "tbl":
                flush()
                self.table(el, depth)
                return
            # 글상자 · 묶음 안의 문단. 글이 없는 도형(삼각형 · 원 …)은 그린 그림으로 센다
            if tag in (HP + "ellipse", HP + "polygon", HP + "container") or (
                tag == HP + "rect" and el.find(HP + "drawText") is None
            ):
                shapes += 1
                shape_list.append((tag.replace(HP, ""), *_size(el)))
            if tag == HP + "container":
                # 묶음 안의 그림 — 글상자 · 선과 함께 묶인 그림이다. 여기까지의 글 끝에 놓인 것으로 적는다
                for pic in el.iter(HP + "pic"):
                    picture = _picture(pic, grouped=True)
                    group_pics.append(picture)
                    marked.append(picture)
                    buf.append(_PIC_MARK)
            flush()
            self.walk(el, depth)

        below: list = []
        visit(p)
        flush()
        for el in below:
            container(el)
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
