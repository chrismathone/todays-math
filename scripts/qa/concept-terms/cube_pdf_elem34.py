# -*- coding: utf-8 -*-
"""큐브수학 개념 진도북 PDF 글자층 읽기 — 교재 개념 용어 전수(elem34 트랙)의 바탕.

N 드라이브는 읽기만 한다. `.hwp` 는 열지 않는다(한컴 COM 금지).

글꼴 `EHsang` 은 글자 코드가 0x1F 만큼 밀려 있다(2026-09-28 지면 실측 — 아래 EHSANG_EXCEPT 밖은 전부
`chr(ord+0x1F)`): 0x11→0, 0x1E→=, 0x0C→+, 0x0E→−, 0x0F→., 0x1D→<, 0x1F→>, 0x09/0x0A→( ),
0x1B→:, N→m, D→c, L→k, H→g, U→t, `-`→L, `"`→A, `#`→B.
🔴 `scripts/qa/learn-cube-units.py` 의 GLYPH 표는 0x1D/0x1F 를 거꾸로 적었다(3-1 024쪽 부등호 세 개의 x 좌표 순서로 확인).
`EHboNA`(분수 조판) · `EHSunm` · `EHChod` · `EHyak` 은 풀지 않는다 — «⟦수식⟧» 로 두고 깨짐 표시(지어내지 말 것).
"""
from __future__ import annotations

import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

JINDO = Path(r"N:\개인\강아\교재자료\큐브수학 개념\큐브수학 개념\진도북")
BOOKS = ("3-1", "3-2", "4-1", "4-2")


def book_path(grade: str) -> Path:
    return JINDO / f"큐브수학 개념 {grade}_진도북.pdf"


def open_book(grade: str, cache: Path | None) -> pymupdf.Document:
    """N 드라이브 원본을 읽기 전용으로 연다. cache 가 있으면 거기로 복사해 연다(쪽마다 네트워크로
    자원을 끌어오면 한 쪽에 4~15초 — 2026-09-28 실측). N 드라이브에는 아무것도 쓰지 않는다."""
    src = book_path(grade)
    if cache is None:
        return pymupdf.open(src)
    cache.mkdir(parents=True, exist_ok=True)
    dst = cache / src.name
    if not dst.exists() or dst.stat().st_size != src.stat().st_size:
        shutil.copyfile(src, dst)
    return pymupdf.open(dst)


_DICT: dict[tuple[int, int], dict] = {}


def page_dict(page: pymupdf.Page) -> dict:
    key = (id(page.parent), page.number)
    if key not in _DICT:
        _DICT[key] = page.get_text("dict", flags=pymupdf.TEXTFLAGS_TEXT)
    return _DICT[key]


EHSANG_EXCEPT = {
    0x03: " ",
    0x20: " ",
    0x41: " ",  # 좁은 칸(숫자와 단위 사이) — 3-2 066쪽 지면
    0x40: "×",
    0x96: "÷",
    0xB1: "°",  # 4-1 032쪽 지면
    0x81: "℃",  # 4-2 110쪽
}
GARBLE = "⟦수식⟧"
TERM_COLOR = 0x95533C  # 개념 쪽 본문의 갈색 굵은 글씨 = 교재가 새로 가르치는 낱말
TITLE_COLOR = 0xB95630  # 개념 쪽 소단원 제목


def family(span: dict) -> str:
    return span["font"].split("-KSCms")[0].split("+")[-1]


def decode_span(span: dict) -> tuple[str, bool]:
    """(글자, 깨짐 여부). 깨짐은 풀지 못한 수식 글꼴이 섞였다는 뜻이다."""
    fam = family(span)
    text = span["text"]
    if fam.startswith("EHsang"):
        out, bad = [], False
        for ch in text:
            o = ord(ch)
            if o in EHSANG_EXCEPT:
                out.append(EHSANG_EXCEPT[o])
            elif 0x09 <= o <= 0x5F:
                out.append(chr(o + 0x1F))
            else:
                out.append(GARBLE)
                bad = True
        return "".join(out), bad
    if fam.startswith("EH"):
        return GARBLE, True
    text = text.replace("⇁", "□").replace("↻", "□").replace("\u20dd", "").replace("॒", "")
    return text, False


@dataclass
class Span:
    text: str
    color: int
    size: float
    font: str
    garbled: bool


@dataclass
class Line:
    page: int
    x0: float
    y0: float
    x1: float
    y1: float
    spans: list[Span] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "".join(s.text for s in self.spans)

    @property
    def garbled(self) -> bool:
        return any(s.garbled for s in self.spans)


def page_lines(page: pymupdf.Page) -> list[Line]:
    """dict 의 줄 조각을 «한 눈에 보이는 줄» 로 붙인다(같은 높이 · 가까운 x)."""
    raw: list[Line] = []
    for b in page_dict(page)["blocks"]:
        if b["type"] != 0:
            continue
        for ln in b["lines"]:
            spans = []
            for s in ln["spans"]:
                t, bad = decode_span(s)
                spans.append(Span(t, s["color"], s["size"], family(s), bad))
            x0, y0, x1, y1 = ln["bbox"]
            raw.append(Line(page.number + 1, x0, y0, x1, y1, spans))
    raw = [r for r in raw if r.text.strip()]
    # 같은 높이(3pt 안)의 조각을 한 행으로 묶고 x 순으로 잇는다. 글 속 작은 그림 «( )» 자리는 틈이 넓어
    # 괄호로 끝나거나 시작하면 45pt 까지 잇는다(3-1 096쪽 — 단위 정의 문장 속 작은 그림 셋).
    raw.sort(key=lambda r: r.y0)
    rows: list[list[Line]] = []
    for r in raw:
        if rows and abs(rows[-1][0].y0 - r.y0) < 3:
            rows[-1].append(r)
        else:
            rows.append([r])
    merged: list[Line] = []
    for row in rows:
        row.sort(key=lambda r: r.x0)
        cur = row[0]
        for r in row[1:]:
            gap = r.x0 - cur.x1
            paren = cur.text.rstrip().endswith("(") or r.text.lstrip().startswith(")")
            # 글자 크기가 다르면 그림 이름표다(3-1 036쪽 — 본문 줄 끝 바로 옆의 7.7pt 그림 이름표).
            ls = [x.size for x in cur.spans if x.text.strip()]
            rs = [x.size for x in r.spans if x.text.strip()]
            same = bool(ls and rs) and abs(ls[-1] - rs[0]) < 1.6
            if same and (-2 < gap < 22 or (paren and -2 < gap < 45)):
                cur.spans.extend(r.spans)
                cur.x1 = max(cur.x1, r.x1)
                cur.y1 = max(cur.y1, r.y1)
            else:
                merged.append(cur)
                cur = r
        merged.append(cur)
    merged.sort(key=lambda r: (r.y0, r.x0))
    return merged


def header_text(page: pymupdf.Page) -> str:
    """쪽 머리의 큰 글씨(장르 표지) — «교과서 개념 잡기» · «개념 한번더 잡기» · «수학 익힘» …"""
    parts = []
    for b in page_dict(page)["blocks"]:
        if b["type"] != 0:
            continue
        for ln in b["lines"]:
            for s in ln["spans"]:
                if s["size"] > 20 and ln["bbox"][1] < 140:
                    parts.append(s["text"])
    return re.sub(r"\s+", "", "".join(parts))


GENRES = (
    ("교과서개념잡기", "개념설명"),
    ("개념한번더잡기", "개념한번더"),
    ("수학익힘", "수학익힘"),
    ("단원마무리", "단원마무리"),
    ("성취도평가", "평가"),
)


def page_genres(doc: pymupdf.Document) -> list[str]:
    """쪽마다 장르. 머리 표지가 없는 쪽은 앞 쪽 장르의 «문제 쪽»(`…:이어짐`)."""
    out: list[str] = []
    last = "앞쪽"
    for i, page in enumerate(doc):
        h = header_text(page)
        g = next((name for key, name in GENRES if key in h), None)
        if i < 5 and g is None:
            out.append("앞쪽")
            continue
        if g is None:
            out.append(f"{last}:이어짐")
        else:
            last = g
            out.append(g)
    return out


def footer_page(page: pymupdf.Page) -> str | None:
    for b in page_dict(page)["blocks"]:
        if b["type"] != 0:
            continue
        for ln in b["lines"]:
            for s in ln["spans"]:
                # 쪽 번호는 DINPro 12pt. 같은 높이의 «NNN쪽 …» 안내 배지(작은 글씨)를 집지 않는다.
                if (
                    ln["bbox"][1] > 780
                    and s["size"] > 11
                    and "DIN" in s["font"]
                    and re.fullmatch(r"\d{3}", s["text"].strip())
                ):
                    return s["text"].strip()
    return None


# ── 목차 ────────────────────────────────────────────────────────────────


def parse_toc(doc: pymupdf.Document) -> list[dict]:
    """인쇄된 «차례» 쪽(4~5쪽): 소단원 줄들 → 단원 이름 → «006~031쪽»."""
    # 줄은 PDF 에 적힌 차례(dict 순서)로 읽는다 — y 로 정렬하면 «006~031쪽» 이 단원 이름 앞으로 간다.
    seq: list[str] = []
    for pn in range(3, 6):
        for b in page_dict(doc[pn])["blocks"]:
            for ln in b["lines"]:
                t = "".join(decode_span(s)[0] for s in ln["spans"])
                seq.append(re.sub(r"\s+", " ", t).strip())
    chapters: list[dict] = []
    pending: list[str] = []
    name = None
    for t in seq:
        if t == "차례" or not t:
            continue
        m = re.fullmatch(r"(\d{3})~(\d{3})쪽", t)
        if m:
            if name and pending:
                chapters.append(
                    {
                        "chapter": f"{len(chapters) + 1}. {name}",
                        "sections": pending,
                        "pdfPages": [int(m.group(1)), int(m.group(2))],
                    }
                )
            pending, name = [], None
            continue
        if re.match(r"^\d+ ", t):
            for part in re.split(r"\s*/\s*(?=\d+ )", t):
                mm = re.match(r"^(\d+) (.+)$", part)
                if mm:
                    pending.append(norm_title(mm.group(2)))
            continue
        name = t
    return chapters


def norm_title(t: str) -> str:
    t = re.sub(r"\s*([+\-×÷])\s*", r"\1", t)
    return re.sub(r"\s+", " ", t).strip()


def squash(t: str) -> str:
    return re.sub(r"[\s()⑴⑵]", "", t)


# ── 소단원 제목과 문장 ─────────────────────────────────────────────────


def section_titles(lines: list[Line]) -> list[tuple[float, str]]:
    out = []
    for ln in lines:
        if any(s.color == TITLE_COLOR and s.size > 12 for s in ln.spans):
            t = "".join(s.text for s in ln.spans if s.color == TITLE_COLOR)
            out.append((ln.y0, norm_title(t)))
    return out


END = re.compile(r"(다|요)\.\s*|:\s")
MARKER = re.compile(r"^[\s①-⑳⑴-⒇•·]*(예\s)?\s*")
ITEM = re.compile(r"^\s*([①-⑳⑴-⒇•]|예\s)")
SUBHEAD = re.compile(r"^\s*[⑴-⒇]")


HEAD_FONTS = ("YDVYGOStd13", "YDVYGOStd14", "YDVYGOStd15")


def _is_title(ln: Line) -> bool:
    """소단원 제목 · «⑴ …» 소제목 · 여백 제목(굵은 고딕만으로 된 줄 — 여백 본문은 GOStd11)."""
    if any(s.color == TITLE_COLOR and s.size > 12 for s in ln.spans) or SUBHEAD.match(ln.text):
        return True
    body = [s for s in ln.spans if s.text.strip()]
    return bool(body) and ln.x0 < 175 and all(s.font in HEAD_FONTS and s.color != TERM_COLOR for s in body)


def _continues(a: Line, b: Line) -> bool:
    """b 가 a 의 바로 아랫줄로 이어지는가(같은 문단)."""
    gap = b.y0 - a.y1
    return -2 < gap < 12 and a.x0 - 22 < b.x0 < a.x0 + 30 and b.x0 < a.x1


def assemble(lines: list[Line], idx: int) -> tuple[str, list[Line]]:
    """idx 줄이 든 문장을 위아래 줄에서 이어 붙인다. 제목 · 새 항목(①, ⑴, •) 은 넘지 않는다."""
    chain = [lines[idx]]
    while not ITEM.match(chain[0].text) and not _is_title(chain[0]):
        top = chain[0]
        ups = [l for l in lines if l is not top and _continues(l, top)]
        if not ups:
            break
        up = max(ups, key=lambda l: l.y0)
        if re.search(r"(다|요)\.\s*$", up.text) or _is_title(up):
            break
        chain.insert(0, up)
    while not re.search(r"(다|요)\.\s*$", chain[-1].text):
        low = chain[-1]
        downs = [l for l in lines if l is not low and _continues(low, l)]
        if not downs:
            break
        nxt = min(downs, key=lambda l: l.y0)
        if ITEM.match(nxt.text) or _is_title(nxt):
            break
        chain.append(nxt)
    text = ""
    for ln in chain:
        t = ln.text
        if not text or re.search(r"\s$", text):
            text += t.lstrip() if text else t
        elif GLUE.match(t.lstrip()):
            text += t.lstrip()
        elif ln.x0 < 175 and re.search(r"(^|\s)[가-힣]$", text) and re.match(r"[가-힣]", t.lstrip()):
            text += t.lstrip()  # 좁은 여백 칸은 글자 단위로 줄을 바꾼다(3-2 042쪽 여백 — 두 글자 낱말이 줄 끝에서 갈림)
        else:
            text += " " + t.lstrip()  # 어절 경계에서 줄이 바뀌었는데 끝 칸이 없는 경우(4-1 008쪽)
    return text, chain


# 줄 첫머리가 조사 · 어미면 앞 줄의 낱말이 이어진 것이다(«…이» / «라고 …», «…합» / «니다.» 처럼 문장 꼬리가 다음 줄로 넘어간 경우).
GLUE = re.compile(r"^(이?라고|이?라\s|이라|니다|고\s*합니다|하고|하다고|입니다|이고|이며|다\.|다고|[을를은는과와의에로가]($|[\s,.])|으로)")


def cut_sentence(text: str, anchor: str) -> str:
    """이어 붙인 글에서 anchor 가 든 한 문장만 오린다(앞 문장 끝 · 항목 번호에서 자른다)."""
    pos = text.find(anchor) if anchor else -1
    if pos < 0:
        pos = 0
    start = 0
    for m in END.finditer(text):
        if m.end() <= pos:
            start = m.end()
    for m in re.finditer(r"[①-⑳⑴-⒇](?![의에과와을를은는이가])", text):  # 문장 속에서 앞 항목을 가리키는 «②의» 는 항목 번호가 아니다(3-1 056쪽)
        if start <= m.start() < pos:
            start = m.end()
    end = len(text)
    m = re.compile(r"(다|요)\.").search(text, pos)
    if m:
        end = m.end()
    s = text[start:end]
    s = MARKER.sub("", s)
    return re.sub(r"\s+", " ", s).strip()
