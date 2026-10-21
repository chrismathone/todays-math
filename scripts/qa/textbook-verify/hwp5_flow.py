# -*- coding: utf-8 -*-
"""HWP 5.0 바이너리 → 문단의 흐름 (교과서 원본 대조 · 2026-10-21).

이관(2026-10-07)은 Windows 의 한글로 HWP → HWPX 를 만들고 `hwpx_flow.py` 로 읽었다. 이 맥에는 한글이 없고
(CLAUDE.md 9번 — 한글 COM 도 쓰지 않는다) 원본은 외장 SSD 의 HWP 바이너리뿐이다. 그래서 바이너리를 직접 읽어
**`hwpx_flow.read_paras` 와 같은 꼴의 `Para`** 를 낸다 — 같은 가르기(`segment.py`)를 그대로 얹을 수 있게.

HWP 5.0 의 짜임(한컴 공개 문서 «한글 문서 파일 구조 5.0»):
  - OLE 파일. 본문은 `BodyText/Section{n}` — 머리의 압축 표지가 켜져 있으면 raw deflate.
  - 레코드 머리 32비트: 태그 10비트 · 깊이 10비트 · 크기 12비트(0xFFF 면 뒤 32비트가 크기).
  - 문단 = PARA_HEADER(66) 아래에 PARA_TEXT(67) · CTRL_HEADER(71) …. 글 안의 «확장 제어 글자»(표 · 개체 · 수식 · 각주 …)는
    **차례대로** 그 문단의 CTRL_HEADER 자식과 짝이 맞는다 — 그래서 수식 · 표가 글 안의 제자리에 들어간다.
  - 표 칸 · 글상자 · 각주의 글은 LIST_HEADER(72) 뒤에 같은 깊이로 이어지는 문단들이다.

`hwpx_flow` 와 같게 하는 것: 머리말 · 꼬리말은 뺀다 · 수식은 한글 수식 문법 그대로 `$…$` · 표 · 글상자를 만나면
그 앞까지 문단을 끊고 그 안의 문단을 그 자리에서 읽는다 · 문단 첫 줄보다 아래에 띄운 개체는 문단의 글 뒤에 ·
묶음 개체의 그림은 `group_pictures` · 작은 그림은 번호 그림(`Picture.is_glyph`) · 각주 · 미주의 글은 `notes`.
다른 것: 그림의 잘라 보이기 · 돌림은 읽지 않는다(대조에 안 쓴다).

🔴 이 모듈은 **읽기만** 한다. 원본 파일을 열 때 쓰기 권한을 쓰지 않는다.
"""
from __future__ import annotations

import dataclasses
import re
import struct
import sys
import zlib
from pathlib import Path

import olefile

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "import" / "textbook"))
from hwpx_flow import (  # noqa: E402
    _CIRCLED_FOLD,
    _PIC_MARK,
    FLOAT_BELOW_MIN,
    Para,
    Picture,
    _mark_offsets,
    _table_kind,
    read_paras as read_hwpx_paras,
)

TAG_PARA_HEADER = 66
TAG_PARA_TEXT = 67
TAG_CTRL_HEADER = 71
TAG_LIST_HEADER = 72
TAG_SHAPE_COMPONENT = 76
TAG_TABLE = 77
TAG_PICTURE = 85
TAG_EQEDIT = 88

#: 글 안에서 8 글자(16바이트)를 차지하는 제어 글자 — 확장(레코드가 따로 있다) · 인라인(레코드 없음)
EXTENDED = frozenset({1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23})
INLINE = frozenset({4, 5, 6, 7, 8, 9, 19, 20})

#: 개체 공통 속성의 «세로 기준»(비트 3-4) · «글 배치»(비트 21-23)
VERT_PAPER, VERT_PAGE, VERT_PARA = 0, 1, 2
WRAP_BEHIND_TEXT = 4


@dataclasses.dataclass
class Record:
    tag: int
    level: int
    payload: bytes
    offset: int
    children: list["Record"] = dataclasses.field(default_factory=list)


def records(data: bytes) -> list[Record]:
    out: list[Record] = []
    pos = 0
    while pos + 4 <= len(data):
        offset = pos
        header = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        tag, level, size = header & 0x3FF, (header >> 10) & 0x3FF, header >> 20
        if size == 0xFFF:
            size = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        if pos + size > len(data):
            raise ValueError(f"레코드가 스트림 밖으로 나간다 — {offset}")
        out.append(Record(tag, level, data[pos : pos + size], offset))
        pos += size
    return out


def tree(flat: list[Record]) -> list[Record]:
    """깊이로 나무를 세운다 — 깊이가 하나 큰 레코드는 바로 앞의 얕은 레코드의 자식이다."""
    roots: list[Record] = []
    stack: list[Record] = []
    for rec in flat:
        while stack and stack[-1].level >= rec.level:
            stack.pop()
        (stack[-1].children if stack else roots).append(rec)
        stack.append(rec)
    return roots


def ctrl_id(payload: bytes) -> str:
    return payload[:4][::-1].decode("latin-1") if len(payload) >= 4 else ""


@dataclasses.dataclass
class ObjectInfo:
    """개체 공통 속성 — 표 · 그리기 개체 · 수식의 CTRL_HEADER."""

    treat_as_char: bool
    vert_rel_to: int
    text_wrap: int
    vert_offset: int
    width: int
    height: int


def object_info(payload: bytes) -> ObjectInfo | None:
    if len(payload) < 24:
        return None
    prop, vert, _horz, width, height = struct.unpack_from("<IiiII", payload, 4)
    return ObjectInfo(bool(prop & 1), (prop >> 3) & 3, (prop >> 21) & 7, vert, width, height)


def floats_below(info: ObjectInfo | None) -> bool:
    return bool(info) and not info.treat_as_char and info.vert_rel_to == VERT_PARA and info.vert_offset >= FLOAT_BELOW_MIN


def equation_script(ctrl: Record) -> str:
    for rec in walk_records(ctrl):
        if rec.tag == TAG_EQEDIT and len(rec.payload) >= 6:
            n = struct.unpack_from("<H", rec.payload, 4)[0]
            return rec.payload[6 : 6 + 2 * n].decode("utf-16le", errors="replace").strip()
    return ""


def walk_records(rec: Record):
    for child in rec.children:
        yield child
        yield from walk_records(child)


def shape_kind(component: Record) -> str:
    """SHAPE_COMPONENT 의 개체 종류 — `$pic` · `$rec` · `$con` …"""
    return ctrl_id(component.payload)


def shape_size(component: Record) -> tuple[int, int]:
    """SHAPE_COMPONENT 의 지금 크기. 최상위 개체는 개체 아이디가 두 번 적혀 있다."""
    payload = component.payload
    start = 8 if len(payload) >= 8 and payload[:4] == payload[4:8] else 4
    # x(4) y(4) 묶음 깊이(2) 판(2) 처음 폭(4) 처음 높이(4) 지금 폭(4) 지금 높이(4)
    if len(payload) < start + 28:
        return 0, 0
    width, height = struct.unpack_from("<II", payload, start + 20)
    return width, height


def text_paragraphs(rec: Record) -> list[Record]:
    """이 레코드 아래의 글 목록(글상자 · 칸) 문단들 — LIST_HEADER 뒤에 같은 깊이로 이어지는 PARA_HEADER."""
    return [child for child in rec.children if child.tag == TAG_PARA_HEADER]


class _Walker:
    """`hwpx_flow._Walker` 와 같은 일을 HWP 레코드 나무에서 한다."""

    def __init__(self, counter=None, ids=None, parent: int = 0) -> None:
        self.paras: list[Para] = []
        self.counter = counter if counter is not None else [0]
        self.ids = ids if ids is not None else [0, 0]
        self.parent = parent

    # ── 표 ─────────────────────────────────────────────────────────────────────
    def table(self, ctrl: Record, depth: int, host: int) -> None:
        cells: list[list[list[Para]]] = []
        row: list[list[Para]] = []
        row_addr: int | None = None
        current: list[Record] | None = None
        pending: list[tuple[int, list[Record]]] = []
        for child in ctrl.children:
            if child.tag == TAG_LIST_HEADER:
                address = struct.unpack_from("<H", child.payload, 10)[0] if len(child.payload) >= 12 else 0
                current = []
                pending.append((address, current))
            elif child.tag == TAG_PARA_HEADER and current is not None:
                current.append(child)
        for address, paras in pending:
            inner = _Walker(self.counter, self.ids, host)
            for para in paras:
                inner.paragraph(para, depth + 1)
            if row_addr is not None and address != row_addr and row:
                cells.append(row)
                row = []
            row_addr = address
            row.append(inner.paras)
        if row:
            cells.append(row)
        flat = [para for r in cells for cell in r for para in cell]
        if _table_kind(cells) == "data":
            self.counter[0] += 1
            for para in flat:
                para.table_id = self.counter[0]
        self.paras.extend(flat)

    # ── 문단 ───────────────────────────────────────────────────────────────────
    def paragraph(self, para_rec: Record, depth: int) -> None:
        buf: list[str] = []
        pictures: list[Picture] = []
        group_pics: list[Picture] = []
        shape_list: list[tuple] = []
        marked: list[Picture] = []
        notes: list[str] = []
        state = {"lead": None, "shapes": 0}
        self.ids[0] += 1
        host = self.ids[0]

        def flush() -> None:
            text = re.sub(r"[ \t 　]+", " ", "".join(buf)).strip()
            text = text.translate(_CIRCLED_FOLD)
            text, offsets = _mark_offsets(text)
            for picture, offset in zip(marked, offsets):
                picture.offset = offset
            if text or pictures or notes or state["shapes"] or group_pics:
                self.paras.append(
                    Para(
                        text, list(pictures), state["lead"], depth, list(notes), state["shapes"],
                        group_pictures=list(group_pics), shape_list=list(shape_list),
                        host=host, parent=self.parent,
                    )
                )
            buf.clear()
            pictures.clear()
            group_pics.clear()
            marked.clear()
            shape_list.clear()
            notes.clear()
            state["lead"] = None
            state["shapes"] = 0

        def walk_inner(rec: Record) -> None:
            """글상자 · 묶음 안의 문단을 이 자리에서 읽는다."""
            outer, self.parent = self.parent, host
            for child in rec.children:
                self._descend(child, depth)
            self.parent = outer

        def picture_of(component: Record, info: ObjectInfo | None, *, grouped: bool, group: int) -> Picture:
            width, height = (info.width, info.height) if info and not grouped else shape_size(component)
            pic_rec = next((r for r in walk_records(component) if r.tag == TAG_PICTURE), None)
            bin_id = ""
            if pic_rec is not None and len(pic_rec.payload) >= 73:
                bin_id = f"BIN{struct.unpack_from('<H', pic_rec.payload, 71)[0]:04X}"
            behind = bool(info) and not grouped and (
                info.text_wrap == WRAP_BEHIND_TEXT or (info.vert_rel_to == VERT_PAPER and not info.treat_as_char)
            )
            return Picture(bin_id, width, height, behind=behind, grouped=grouped, group=group)

        def gso(ctrl: Record, info: ObjectInfo | None) -> None:
            component = next((c for c in ctrl.children if c.tag == TAG_SHAPE_COMPONENT), None)
            if component is None:
                return
            kind = shape_kind(component)
            if kind == "$pic":
                picture = picture_of(component, info, grouped=False, group=0)
                pictures.append(picture)
                marked.append(picture)
                if state["lead"] is None and not "".join(buf).replace(_PIC_MARK, "").strip():
                    state["lead"] = picture
                buf.append(_PIC_MARK)
                return
            if kind in ("$lin", "$arc", "$cur") or kind not in ("$rec", "$ell", "$pol", "$con"):
                if kind in ("$lin", "$arc", "$cur"):
                    state["shapes"] += 1
                    shape_list.append(({"$lin": "line", "$arc": "arc", "$cur": "curve"}[kind], info.width if info else 0, info.height if info else 0))
                return
            box(component, kind, info)

        def box(component: Record, kind: str, info: ObjectInfo | None) -> None:
            has_text = any(c.tag == TAG_LIST_HEADER for c in component.children)
            size = (info.width, info.height) if info else shape_size(component)
            if kind == "$con":
                self.ids[1] += 1
                state["shapes"] += 1
                shape_list.append(("container", *size, self.ids[1]))
                for inner in walk_records(component):
                    if inner.tag == TAG_SHAPE_COMPONENT and shape_kind(inner) == "$pic":
                        picture = picture_of(inner, None, grouped=True, group=self.ids[1])
                        group_pics.append(picture)
                        marked.append(picture)
                        buf.append(_PIC_MARK)
            elif kind in ("$ell", "$pol") or (kind == "$rec" and not has_text):
                state["shapes"] += 1
                shape_list.append(({"$ell": "ellipse", "$pol": "polygon", "$rec": "rect"}[kind], *size))
            flush()
            walk_inner(component)

        def control(ctrl: Record) -> None:
            cid = ctrl_id(ctrl.payload)
            if cid in ("head", "foot"):
                return
            if cid in ("fn  ", "en  "):
                notes.append(note_text(ctrl))
                return
            if cid == "eqed":
                script = equation_script(ctrl)
                if script:
                    buf.append(f"${script}$")
                return
            if cid == "tbl ":
                info = object_info(ctrl.payload)
                if floats_below(info):
                    below.append(ctrl)
                    return
                flush()
                self.table(ctrl, depth, host)
                return
            if cid == "gso ":
                info = object_info(ctrl.payload)
                component = next((c for c in ctrl.children if c.tag == TAG_SHAPE_COMPONENT), None)
                if component is not None and shape_kind(component) in ("$rec", "$ell", "$pol", "$con") and floats_below(info):
                    below.append(ctrl)
                    return
                gso(ctrl, info)

        text_rec = next((c for c in para_rec.children if c.tag == TAG_PARA_TEXT), None)
        controls = [c for c in para_rec.children if c.tag == TAG_CTRL_HEADER]
        below: list[Record] = []
        if text_rec is not None:
            words = struct.unpack("<" + "H" * (len(text_rec.payload) // 2), text_rec.payload[: len(text_rec.payload) // 2 * 2])
            next_ctrl = 0
            i = 0
            while i < len(words):
                code = words[i]
                if code in EXTENDED:
                    if next_ctrl < len(controls):
                        control(controls[next_ctrl])
                    next_ctrl += 1
                    i += 8
                elif code in INLINE:
                    if code == 9:
                        buf.append(" ")
                    i += 8
                elif code == 10:
                    buf.append("\n")
                    i += 1
                elif code == 13:
                    i += 1
                elif code < 32:
                    i += 1  # 하이픈(24) · 묶음 빈칸(30) · 고정폭 빈칸(31) — hwpx_flow 도 글자를 안 낸다
                else:
                    char, i = _char_at(words, i)
                    buf.append(char)
        flush()
        for ctrl in below:
            cid = ctrl_id(ctrl.payload)
            if cid == "tbl ":
                flush()
                self.table(ctrl, depth, host)
            else:
                component = next((c for c in ctrl.children if c.tag == TAG_SHAPE_COMPONENT), None)
                if component is not None:
                    box(component, shape_kind(component), object_info(ctrl.payload))
            flush()

    def _descend(self, rec: Record, depth: int) -> None:
        if rec.tag == TAG_PARA_HEADER:
            self.paragraph(rec, depth)
            return
        for child in rec.children:
            self._descend(child, depth)


def _char_at(words: tuple[int, ...], i: int) -> tuple[str, int]:
    """글자 하나와 다음 자리 — 기본 다국어 판 밖의 글자(𝑥 · 사용자 영역 16판)는 대리 짝 두 칸이다."""
    code = words[i]
    if 0xD800 <= code <= 0xDBFF and i + 1 < len(words) and 0xDC00 <= words[i + 1] <= 0xDFFF:
        return chr(0x10000 + ((code - 0xD800) << 10) + (words[i + 1] - 0xDC00)), i + 2
    if 0xD800 <= code <= 0xDFFF:
        return "\ufffd", i + 1  # 짝 없는 대리 글자 — 깨진 글자로 적는다(지어내지 않는다)
    return chr(code), i + 1


def note_text(ctrl: Record) -> str:
    parts: list[str] = []
    for rec in walk_records(ctrl):
        if rec.tag == TAG_PARA_TEXT:
            words = struct.unpack("<" + "H" * (len(rec.payload) // 2), rec.payload[: len(rec.payload) // 2 * 2])
            i = 0
            while i < len(words):
                code = words[i]
                if code in EXTENDED or code in INLINE:
                    i += 8
                    continue
                if code >= 32:
                    char, i = _char_at(words, i)
                    parts.append(char)
                    continue
                i += 1
        elif rec.tag == TAG_EQEDIT and len(rec.payload) >= 6:
            n = struct.unpack_from("<H", rec.payload, 4)[0]
            parts.append("$" + rec.payload[6 : 6 + 2 * n].decode("utf-16le", errors="replace").strip() + "$")
    return "".join(parts).strip()


def section_streams(ole: olefile.OleFileIO) -> list[bytes]:
    header = ole.openstream("FileHeader").read()
    flags = struct.unpack_from("<I", header, 36)[0]
    if flags & 0b110:
        raise ValueError("암호가 걸렸거나 배포용 문서다 — 본문을 바로 읽을 수 없다")
    names = sorted(
        ("/".join(entry) for entry in ole.listdir() if len(entry) == 2 and entry[0] == "BodyText"),
        key=lambda name: int(re.search(r"(\d+)$", name).group(1)),
    )
    out = []
    for name in names:
        data = ole.openstream(name).read()
        out.append(zlib.decompress(data, -15) if flags & 1 else data)
    return out


def read_paras(path: Path) -> list[Para]:
    """문서 차례의 문단들 — `hwpx_flow.read_paras` 와 같은 꼴. 이름만 .hwp 인 HWPX(zip)도 받는다."""
    path = Path(path)
    with open(path, "rb") as handle:
        magic = handle.read(4)
    if magic.startswith(b"PK"):
        return read_hwpx_paras(path)
    walker = _Walker()
    with olefile.OleFileIO(str(path)) as ole:
        for data in section_streams(ole):
            for root in tree(records(data)):
                walker._descend(root, 0)
    return walker.paras


def preview_text(path: Path) -> str:
    """HWP 의 미리보기 글(PrvText) — 리더를 검산할 때 견준다(앞부분 1천여 글자뿐이다)."""
    with olefile.OleFileIO(str(path)) as ole:
        if not ole.exists("PrvText"):
            return ""
        return ole.openstream("PrvText").read().decode("utf-16le", errors="replace")
