# -*- coding: utf-8 -*-
"""개념원리 중학 학생용(2-2 · 3-1 · 3-2) PDF 를 **쪽 구조 + 서식 있는 줄**로 읽는다 — 트랙 midb 공용.

    python scripts/qa/concept-terms/gaenyeom_midb.py 2-2 13      # 한 쪽을 서식째로 찍어 본다

① 무엇을 하나
   · 쪽마다 책 쪽번호 · 대단원(아래 띠) · 중단원(위 머리) · 소단원 제목 · 장르를 읽는다.
     장르는 큰 글씨 표지로 가른다(«개념원리 이해» 왼쪽 띠 · «개념원리 확인하기» · «핵심문제 익히기» …).
     표지가 없는 쪽은 앞 쪽의 장르를 잇는다.
   · 줄을 만들 때 **글꼴·색을 그대로** 들고 간다 — 교재는 새 용어를 적갈색(`af473a`) 고딕으로,
     핵심 구절을 자주색(`923f87`)으로, 정의 표제를 `YDVYGOStd13`(굵은 고딕)으로 찍는다(2-2 p13 · 3-1 p13 실측).
   · 수식 글꼴은 **글꼴별로** 푼다. 한컴 수식(`EHsang`·`EHboN*`·`EHhabu`)은 검증된
     `rpm_book_latex.to_latex`(참에서 푼 표, 08 §5.4) 에 맡기고, 그 앞에 기호 글꼴만 바꾼다:
     `NPYP`/`NPYB` 의 `C`=∠ · `NPSUSP` 의 `s`=△ `f`=□ · `EHyak` 의 기호(아래 `YAK`).
     **못 푸는 조각은 지어내지 않는다** — `[수식]` 으로 남기고 그 줄에 `garbled` 표시를 붙인다.
② 왜 이렇게 하나
   · 글자만 보면 `C`(∠)와 `C`(점 C), `a`(α)와 `a`(문자 a)가 안 갈린다 — 글꼴이 가른다(08 §5.4 «글꼴이 갈라 주는 것»).
   · `EHyak` 표는 이 세 권의 지면 문맥에서 뜻이 드러난 글자만 적었다(근거는 표 옆). 표에 없는 글자는
     전부 `garbled` 로 떨어진다 — 표가 모자라면 «깨짐»이 늘 뿐 틀린 글자가 나가지 않는다.
③ 안 바꾸는 것 — N 드라이브는 **열어 읽기만** 한다. `.hwp` 는 열지 않는다. 쓰는 곳은 없다.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # scripts/qa — rpm_book_latex
from rpm_book_latex import to_latex  # noqa: E402

BASE = r"N:\개인\강아\교재자료\RPM\22\개념원리"
GRADES = ("2-2", "3-1", "3-2")


def book_path(grade: str) -> str:
    return BASE + "\\개념원리 중학 %s 학생용.pdf" % grade


# ── 색 ───────────────────────────────────────────────────────────────────────
INK = 0x231F20
RED = 0xAF473A  # 새 용어 · 새 기호 (구성과 특징 p7 — 교재가 용어·기호를 강조 처리한다고 밝힘)
PURPLE = 0x923F87  # 핵심 구절 · 성질 이름
WHITE = 0xFFFFFF  # 칩 글자(예 · 참고 · 증명 · 설명 · 주의)
TITLE = 0x225E4C  # 소단원 제목(SDGyeokdong 27pt)

# ── 수식 기호 글꼴 ─────────────────────────────────────────────────────────────
#: `EHyak` — 알파벳 자리에 기호가 들어 있는 글꼴. 지면 문맥으로 뜻이 확인된 글자만 적는다.
YAK = {
    "a": r"\alpha",  # 3-1 p116 (근 α) · 3-2 p17 (각 α)
    "b": r"\beta",  # 3-1 p118 «(x-α)(x-β)=0»
    "p": r"\pi",  # 2-2 p55 «10π cm» · 3-1 p25 «π=3.141592…»
    "y": r"\cdots",  # 2-2 p13 «yy ㉠» (줄임표) · 3-1 p27 «0.313131…»
    "+": r"\neq",  # 3-1 p41 «단, n≠0»
    "É": r"\leq",  # 3-1 p24 «-4≤-√3x-2<-1»
    "¾": r"\geq",  # 3-1 p125 «(q≥0)» — 08 §5.4 BY_FONT 와 같다
    "Ñ": r"\pm",  # 3-1 p13 «±√a»
    "ª": r"\equiv",  # 2-2 p13 «△ABD≡△ACD» — rpm_book_latex EVIDENCE 2-2 #724
    "»": r"\backsim",  # 2-2 p107 «△ABC∽△DEF» — EVIDENCE 2-2 #552
}
#: `EHyak` 에서 **변환기가 이미 아는** 글자 — 그대로 넘긴다(`rpm_book_latex` 의 ARC · STEP_RUN 이 푼다).
#: 호 `µ`·`¨`(3-2 p87 호 AB — 이름 앞에 선다) · 홀로 선 단계 표시 `Ú Û Ü`(3-2 p87 증명의 경우 번호).
YAK_PASS = set("µ¨ÚÛÜ")
#: 기호 글꼴 NPYP/NPYB · NPSUSP.
NP = {"NPYP": {"C": r"\angle"}, "NPYB": {"C": r"\angle"}, "NPSUSP": {"s": r"\triangle", "f": r"\square"}}
#: ⚠️ 기호를 **자리표시자**로 넘긴다. 유니코드로 바로 바꿔 `to_latex` 에 넣으면 그 표의 글리프와
#:    부딪힌다 — `±`(U+00B1)는 정답책 글꼴에서 `∼` 라서 `±√a` 가 `\sim\sqrt{a}` 로 나갔다(3-1 p13 실측).
SLOT0 = 0xF700
#: 본문 글꼴(윤고딕·윤명조)의 **사용자 정의 글자**. 전수 실측(세 권, 2026-09-28):
#: `U+E47E` 347자리 = ∥ (2-2 p59 평행과 엇각) · `U+E22D` 78자리 = □ (문제의 빈칸 상자)
#: · `U+E2B0` 47자리 = 핵심문제 번호 앞 아이콘(뜻 없음). 나머지(E284·E287·E28B 각 1자리)는
#: 뜻을 확인하지 못했다 — 지어내지 않고 `[기호]` + 깨짐으로 둔다.
TEXT_PUA = {chr(0xE47E): "∥", chr(0xE22D): "□", chr(0xE2B0): ""}
PUA = re.compile("[" + chr(0xE000) + "-" + chr(0xF8FF) + "]")
#: 뜻이 없는 조판 글자 — 지운다.
JUNK = re.compile(r"[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]")
#: 수식에 남으면 «못 풀었다»는 뜻인 글자 — 라틴-1 보충 · 사용자 정의 영역 · 백틱 · 약물.
RESIDUE = re.compile(r"[\u0080-\u00d6\u00d8-\u00f6\u00f8-\u00ff\ue000-\uf8ff`;]")

MATH_PREFIX = ("EH", "NP")
#: 같은 줄로 보는 기준선 차이(pt)와, 한 줄 안에서 덩이를 끊는 가로 틈(pt).
BASE_TOL = 2.5
CLUSTER_GAP = 30.0


def pretty(latex: str) -> str:
    r"""제목·목차용 — 간단한 LaTeX 를 읽는 글자로(`y=ax^{2}` → `y=ax²`, `30\degree` → `30°`)."""
    t = latex
    t = re.sub(r"\^\{2\}", "²", t)
    t = re.sub(r"\^\{3\}", "³", t)
    t = t.replace(r"\degree", "°").replace(r"\alpha", "α").replace(r"\beta", "β")
    t = re.sub(r"\s*,\s*", ", ", t)
    t = re.sub(r"(?<=[가-힣])(?=[a-z]=)", " ", t)  # «이차함수y=ax²» → «이차함수 y=ax²»
    t = re.sub(r"\(\s*(\d)\s*\)", r"(\1)", t)
    return re.sub(r"\s+", " ", t).strip()


def is_math_font(font: str) -> bool:
    return font.startswith(MATH_PREFIX)


def premap(font: str, text: str, slots: list[str]) -> tuple[str, bool]:
    """기호 글꼴을 자리표시자로. 돌려주는 bool 은 «이 조각을 못 푼다»."""
    text = JUNK.sub("", text)
    table = None
    for k, v in NP.items():
        if font.startswith(k):
            table = v
    if font.startswith("EHyak"):
        table = YAK
    if table is not None:
        out, bad = "", False
        for ch in text:
            if ch.isspace():
                out += " "
            elif ch in table:
                if table[ch] not in slots:
                    slots.append(table[ch])
                out += chr(SLOT0 + slots.index(table[ch]))
            elif ch in "=+-()" or ch in YAK_PASS:
                out += ch
            else:
                out += ch
                bad = True
        return out, bad
    if font.startswith(("EHRoot", "EHSusic", "EHSunm")):
        # 근호 갈고리 · 큰 괄호 조각 — 글자열로는 어디까지 덮는지 모른다(08 §5.4 «아직 못 읽는 것»).
        return text, bool(text.strip())
    if not font.startswith("EHboN"):
        # ⚠️ 근호 갈고리 `'` 는 `EHboN*` 에만 있다. 다른 수식 글꼴의 `'` 는 **프라임**이다 —
        #    그대로 넘기면 변환기가 근호로 읽어 `2b'x` 가 `2b\sqrt{x}` 로 나갔다(3-1 p139 실측).
        #    `′`(U+2032)로 넘기면 변환기의 근호 규칙은 비켜 가고 위선 규칙(`HH′Ó`)은 그대로 먹는다.
        return text.replace("'", "′"), False
    return text, False


@dataclass
class Span:
    text: str
    font: str
    size: float
    color: int
    x0: float
    y0: float
    x1: float
    y1: float
    base: float = 0.0  # 기준선(origin y) — 글꼴마다 상자 높이가 달라 상자로는 줄이 안 묶인다
    stacked: bool = False  # 쌓인 분수의 분자·분모(그 사이에 벡터 분수선이 있다)
    hl: bool = False  # 노란 형광 사각형 안(교재가 핵심 구절을 칠한 자리 — 글자 색이 아니라 그림이다)

    @property
    def math(self) -> bool:
        return is_math_font(self.font)

    @property
    def style(self) -> str:
        """읽기용 서식 이름."""
        if self.color == RED:
            return "red"
        if self.color == PURPLE:
            return "purple"
        if self.color == WHITE:
            return "chip"
        if self.font.startswith(("YDVYGOStd13", "YDVYGO13")) and self.size >= 9.0:
            return "bold"
        if self.font.startswith(("YDVYGOStd14", "YDVYGO14")) and self.size >= 10.0:
            return "head"
        return ""


@dataclass
class Line:
    spans: list[Span]
    y: float
    x: float
    text: str = ""  # 풀어 쓴 글(수식은 $…$)
    plain: str = ""  # 수식을 풀되 $ 없이 — 찾기용
    marked: str = ""  # 읽기용 서식 표시
    body: str = ""  # 문장용 — 자주색 곁말을 빼고 칩은 [예]처럼 괄호로
    trail: bool = False  # 원문 줄이 공백으로 끝났다(줄바꿈이 낱말 사이였다)
    garbled: bool = False
    styles: set = field(default_factory=set)


#: 근호가 **어디까지 덮나**를 글자열로 알 수 없는 모양(08 §5.4 «아직 못 읽는 것»). 이것이 보이면 풀지 않는다.
#: ① 키 큰 근호 뒤 **폭 0 영숫자 글리프** — 학생용 책은 근호 안 글자를 폭 0 으로 찍고 공백으로 자리를 채운다.
#:    변환기는 그것을 근호 안 수로 읽고 닫아 `√(a²)` 가 `\sqrt{a ❷}` 가 됐다(3-1 p18 실측).
#: ② 수식 안에 남은 단계 표시 ❶~❺ — 지수의 밑을 잃었다는 뜻이다(2-2 p182 `\overline{DE} ❷`).
#: ③ 근호가 소수점 앞에서 닫힘 — `√1.72` 가 `\sqrt{1}.72` 가 됐다(3-1 p26 실측).
LOST_BASE = re.compile(r"[❶-❿]")
CUT_DECIMAL = re.compile(r"\\sqrt\{\d+\}\.\d")


def _root_unknown(run: list[Span]) -> bool:
    return any(
        s.font.startswith("EHboN") and (s.x1 - s.x0) < 0.3 and re.fullmatch(r"[0-9A-Za-z]+", s.text.strip() or "-")
        for s in run
    )


def _decode_math(run: list[Span]) -> tuple[str, bool]:
    """수식 덩이 → 문장에 넣을 글(`$…$`)과 «못 풀었다»."""
    raw, bad, slots = "", False, []
    for s in run:
        t, b = premap(s.font, s.text, slots)
        raw += t
        bad = bad or b
    bad = bad or _root_unknown(run)
    raw = JUNK.sub("", raw)
    if not raw.strip():
        return raw, False
    lead = raw[: len(raw) - len(raw.lstrip())]
    trail = raw[len(raw.rstrip()):]
    core = raw.strip()
    # 근호 기호 홀로(3-1 p13 근호를 소개하는 자리). 덮는 것이 없으니 글자로 둔다.
    if core == "'" and all(s.font.startswith("EHboN") for s in run if s.text.strip()):
        return lead + "√" + trail, False
    try:
        latex = to_latex(core)
    except Exception:  # noqa: BLE001 — 변환기가 못 받는 모양은 깨짐으로 센다
        return lead + "[수식]" + trail, True
    for k, cmd in enumerate(slots):
        latex = re.sub(chr(SLOT0 + k) + r"(?=[A-Za-z])", lambda _m, c=cmd: c + " ", latex)
        latex = latex.replace(chr(SLOT0 + k), cmd)
    latex = latex.replace("′", "'")
    if bad or RESIDUE.search(latex) or LOST_BASE.search(latex) or CUT_DECIMAL.search(latex):
        return lead + "[수식]" + trail, True
    return lead + "$" + latex.strip() + "$" + trail, False


def build_line(spans: list[Span]) -> Line:
    # ⚠️ 여기서 다시 정렬하지 않는다 — `read_page` 가 폭 0 위선을 동률에서 앞세운 차례를 그대로 쓴다.
    parts_text: list[str] = []
    parts_body: list[str] = []
    parts_plain: list[str] = []
    parts_mark: list[str] = []
    garbled = False
    styles: set = set()
    i = 0
    while i < len(spans):
        s = spans[i]
        if s.math:
            run = [s]
            j = i + 1
            while j < len(spans) and spans[j].math:
                run.append(spans[j])
                j += 1
            dec, bad = _decode_math(run)
            garbled = garbled or bad
            parts_text.append(dec)
            parts_plain.append(dec.replace("$", ""))
            st = {x.style for x in run if x.style}
            if "purple" not in st:
                parts_body.append(dec)
            styles |= st
            mark = dec
            if "red" in st:
                mark = "«" + dec.strip() + "»"
            parts_mark.append(mark)
            i = j
            continue
        t = JUNK.sub("", s.text)
        for a, b2 in TEXT_PUA.items():
            t = t.replace(a, b2)
        if PUA.search(t):
            t = PUA.sub("[기호]", t)
            garbled = True
        parts_text.append(t)
        parts_plain.append(t)
        st = s.style
        if st == "chip" and t.strip():
            parts_body.append("[" + t.strip() + "] ")
        elif st != "purple":
            parts_body.append(t)
        if st:
            styles.add(st)
        if s.hl:
            styles.add("hl")
        if st == "red":
            parts_mark.append("«" + t.strip() + "» ")
        elif st == "purple":
            parts_mark.append("‹" + t.strip() + "› ")
        elif st == "chip":
            parts_mark.append("[" + t.strip() + "] ")
        elif st == "bold" and t.strip():
            parts_mark.append("**" + t.strip() + "** ")
        else:
            parts_mark.append(t)
        i += 1
    norm = lambda x: re.sub(r"[ \t\u2002-\u200a\u3000]+", " ", "".join(x)).strip()  # noqa: E731
    ln = Line(spans=spans, y=min(s.y0 for s in spans), x=min(s.x0 for s in spans))
    ln.text = norm(parts_text).replace("$ $", " ")
    ln.plain = norm(parts_plain)
    ln.marked = norm(parts_mark)
    ln.body = norm(parts_body).replace("$ $", " ")
    raw = JUNK.sub("", "".join(x.text for x in spans))
    ln.trail = raw != raw.rstrip()
    # 쌓인 분수는 글자층에서 분자·분모가 흩어진다(2-2 p153 중점 연결 성질의 ½ 이 `1 … 2` 로) — 깨짐으로 센다.
    ln.garbled = garbled or any(s.stacked for s in spans)
    ln.styles = styles
    return ln


# ── 쪽 ───────────────────────────────────────────────────────────────────────
GENRE_MARKS = [
    # (장르, 큰 글씨 표지 — 이어 붙인 글에 들어 있으면)
    ("check", "개념원리확인하기"),
    ("core", "핵심문제익히기"),
    ("exam", "이런문제가시험에나온다"),
    ("review", "중단원마무리하기"),
    ("essay", "서술형대비문제"),
]


@dataclass
class Page:
    pno: int  # PDF 쪽(1부터)
    book: str | None  # 책 쪽번호(아래 숫자)
    part: str | None  # 대단원(아래 띠) «Ⅰ. 삼각형의 성질»
    header: str | None  # 중단원(위 머리) «1. 삼각형의 성질»
    title: str | None  # 소단원 제목(이 쪽에서 시작하면)
    genre: str
    lines: list[Line]
    big: str = ""


def _spans(page: pymupdf.Page) -> list[Span]:
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if not s["text"].strip():
                    # 공백 조각도 사이 띄움에 필요하다 — 붙여 둔다.
                    pass
                x0, y0, x1, y1 = s["bbox"]
                out.append(Span(s["text"], s["font"], float(s["size"]), int(s["color"]), x0, y0, x1, y1, float(s["origin"][1])))
    return out


#: 분수선 — 굵기 0.5 이하 가로 선분. 위아래에 **가운데가 선 안에 드는** 글자가 붙어 있어야 한다
#: (2-2 p153 실측: 선 331.9–341.2 @182.2 · 분자 `1` 169.8–182.3 · 분모 `2` 181.3–193.8).
#: 글꼴 약물 `;2!;` 은 선을 그리지 않는다(같은 권 p13 실측 0개) — 여기에 안 걸린다.
BAR_STROKE = 0.5
BAR_LEN = (3.0, 120.0)
BAR_GAP = 3.5


def mark_stacked(page: pymupdf.Page, spans: list[Span]) -> int:
    """분수선 위아래 글자 조각에 `stacked` 를 단다. 단 개수를 돌려준다."""
    n = 0
    for dr in page.get_drawings():
        items = dr.get("items") or []
        if dr.get("type") != "s" or len(items) != 1 or items[0][0] != "l":
            continue
        if (dr.get("width") or 0) > BAR_STROKE:
            continue
        a, b = items[0][1], items[0][2]
        if abs(a.y - b.y) > 0.3:
            continue
        x0, x1, y = min(a.x, b.x), max(a.x, b.x), a.y
        if not (BAR_LEN[0] <= x1 - x0 <= BAR_LEN[1]):
            continue
        # 분자·분모는 본문 크기다. 밑줄 아래 작은 자주색 주석(«합» · «곱» 7.9pt)을 분모로 읽으면
        # 밑줄이 분수선이 된다(3-1 p66 «(a+b)x+ab» 거짓 경보) — 작은 글씨·곁말은 분자·분모에서 뺀다.
        inside = [
            s for s in spans
            if s.text.strip() and x0 - 1 <= (s.x0 + s.x1) / 2 <= x1 + 1
            and s.size >= LABEL_PT and s.color != PURPLE
        ]
        up = [s for s in inside if abs(s.y1 - y) <= BAR_GAP and s.y0 < y]
        down = [s for s in inside if abs(s.y0 - y) <= BAR_GAP and s.y1 > y]
        if not up or not down:
            continue
        wide = max(max(s.x1 for s in up) - min(s.x0 for s in up), max(s.x1 for s in down) - min(s.x0 for s in down))
        if wide < 0.3 * (x1 - x0):  # 선이 제 내용보다 훨씬 길면 분수선이 아니다(rpm_page_text 채움비)
            continue
        for s in up + down:
            s.stacked = True
        n += 1
    return n


#: 노란 형광 — 채움 사각형 색(2-2 p21 실측 — RHA 조건 구절 뒤). 글자층에는
#: 흔적이 없어 글꼴·색 발견기가 못 본다.
HIGHLIGHT = (1.0, 0.92, 0.55)


def mark_highlight(page: pymupdf.Page, spans: list[Span]) -> int:
    rects = []
    for dr in page.get_drawings():
        f = dr.get("fill")
        if f and len(f) == 3 and all(abs(a - b) <= 0.03 for a, b in zip(f, HIGHLIGHT)):
            rects.append(dr["rect"])
    for s in spans:
        cx, cy = (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2
        if s.text.strip() and any(r.x0 - 1 <= cx <= r.x1 + 1 and r.y0 - 1 <= cy <= r.y1 + 1 for r in rects):
            s.hl = True
    return len(rects)


def _is_chrome(s: Span, height: float) -> bool:
    """쪽 장식(위 머리 · 아래 띠 · 인쇄 번호 · 왼쪽 띠)."""
    if s.font.startswith("Helvetica") and s.text.strip().isdigit():
        return True
    if s.y0 > height - 60:  # 아래 띠(쪽번호 · 대단원)
        return True
    if s.y0 < 45 and s.size <= 10.5:  # 위 머리(중단원)
        return True
    if s.x1 < 118 and s.font.startswith(("OTOmni", "SDGothic", "DINPro")):  # 왼쪽 띠
        return True
    return False


#: 그림 라벨로 보는 작은 글씨(pt). 본문 9.3~10.5 · 라벨 7.5~8.0(3-1 p13 «제곱» · p26 «음의 실수(음수)» · p173 «a>0, q>0»).
LABEL_PT = 8.6
#: 그림이 서는 오른쪽 자리(x, pt). 개념 쪽 본문 단은 130 에서 시작한다.
FIGURE_X = 380.0


def is_label(s: Span) -> bool:
    """그림 라벨 조각 — 작은 글씨. 수식 조각은 오른쪽 그림 자리일 때만(근호 속 폭 0 글자가 8pt 대라 떼면 안 된다)."""
    if not s.text.strip() or s.size >= LABEL_PT or s.color in (PURPLE, WHITE):
        return False
    return not s.math or s.x0 >= FIGURE_X


def _is_figure_label(ln_spans: list[Span]) -> bool:
    """그림 속 라벨(작은 수식 글자)만 있는 줄."""
    vis = [s for s in ln_spans if s.text.strip()]
    if not vis:
        return True
    if all(s.size <= 8.6 for s in vis) and len("".join(s.text.strip() for s in vis)) <= 12:
        return True
    return False


def read_page(doc: pymupdf.Document, i: int) -> Page:
    page = doc[i]
    h = page.rect.height
    spans = _spans(page)
    mark_stacked(page, spans)
    mark_highlight(page, spans)
    book = part = header = title = None
    big = ""
    for s in spans:
        t = s.text.strip()
        if not t:
            continue
        if s.font.startswith("DINMittel") and s.y0 > h - 60 and t.isdigit():
            book = t
        if s.size >= 14 and not s.font.startswith(("DINPro", "Bebas", "Helvetica")):
            big += t
        if s.color == TITLE and s.size >= 20:
            title = (title or "") + t
    if title:
        tl = build_line(sorted([s for s in spans if s.color == TITLE and s.size >= 20], key=lambda s: s.x0))
        title = pretty(tl.plain)
    # 대단원(아래 띠): «Ⅰ.» + 이름
    foot = [s for s in spans if s.y0 > h - 60 and s.text.strip() and not s.font.startswith(("DINMittel", "Helvetica"))]
    if foot:
        part = re.sub(r"\s+", " ", "".join(s.text for s in sorted(foot, key=lambda s: s.x0))).strip()
    head = [s for s in spans if s.y0 < 45 and s.text.strip() and s.size <= 10.5 and not s.font.startswith("Helvetica")]
    if head:
        header = re.sub(r"\s+", " ", "".join(s.text for s in sorted(head, key=lambda s: s.x0))).strip()
    flat = re.sub(r"\s+", "", big)
    genre = ""
    left = "".join(s.text for s in spans if s.x1 < 118 and s.font.startswith("OTOmni"))
    if title and "개념원리" in left and "이해" in left:
        genre = "concept"
    else:
        for g, mark in GENRE_MARKS:
            if mark in flat:
                genre = g
                break
    # 줄 만들기 — 같은 높이의 조각을 한 줄로.
    body = [s for s in spans if not _is_chrome(s, h) and not (s.color == TITLE and s.size >= 20)]
    # 같은 줄 = 기준선이 BASE_TOL 안. 윗첨자·아래첨자 글리프는 같은 기준선에 찍혀 있다(한컴 글꼴).
    body.sort(key=lambda s: (s.base, s.x0))
    bands: list[list[Span]] = []
    for s in body:
        if bands and abs(bands[-1][0].base - s.base) <= BASE_TOL:
            bands[-1].append(s)
        else:
            bands.append([s])
    rows: list[list[Span]] = []
    for band in bands:
        # ⚠️ 위선 `Ó` 는 **폭 0** 글리프로 글자 끝 x 에 찍힌다. 같은 x 에서 시작하는 한글 조각과
        #    동률이면 한글 뒤로 밀려 `AD는 공통Ó` 가 된다(2-2 p14 실측 156자리). 폭 0 을 동률에서 앞세운다.
        band.sort(key=lambda s: (round(s.x0, 1), 0 if (s.x1 - s.x0) < 0.3 else 1))
        cur = [band[0]]
        for s in band[1:]:
            vis = [x for x in cur if x.text.strip()]
            gap = s.x0 - max(x.x1 for x in (vis or cur))
            # 가로로 멀면 다른 덩이(그림 라벨 · 탭으로 벌린 칸) — 본문 줄에 섞이지 않게 끊는다.
            # 그림 라벨은 작은 글씨이기도 하다 — 본문 줄 끝에 붙어 있어도 떼어 낸다(3-1 p173 «y축의 a>0, q>0»).
            if s.text.strip() and (gap > CLUSTER_GAP or is_label(s) != is_label(cur[-1])):
                rows.append(cur)
                cur = [s]
            else:
                cur.append(s)
        rows.append(cur)
    lines = [build_line(r) for r in rows if not _is_figure_label(r)]
    lines = [ln for ln in lines if ln.text]
    # 순서는 띠(기준선) 차례 → 띠 안 가로 차례 그대로다. 다시 정렬하지 않는다(경계에서 뒤집힌다).
    return Page(i + 1, book, part, header, title, genre, lines, big)


@dataclass
class Book:
    grade: str
    path: str
    pages: list[Page]
    count: int


def load(grade: str) -> Book:
    """한 권을 읽는다. 쪽당 0.4초라 한 권에 1~2분 — 임시 폴더에 절여 둔다.

    절임 열쇠는 PDF 크기·시각 + 이 파일의 시각이다(이 파일을 고치면 다시 읽는다).
    """
    import os
    import pickle
    import tempfile

    src = book_path(grade)
    st = os.stat(src)
    me = os.stat(__file__).st_mtime_ns
    cache = Path(tempfile.gettempdir()) / "concept-terms-midb-cache"
    cache.mkdir(exist_ok=True)
    key = cache / f"{grade}-{st.st_size}-{int(st.st_mtime)}-{me}.pickle"
    if key.exists():
        with open(key, "rb") as fh:
            return pickle.load(fh)
    book = _load(grade)
    for old in cache.glob(f"{grade}-*.pickle"):
        old.unlink()
    with open(key, "wb") as fh:
        pickle.dump(book, fh)
    return book


def _load(grade: str) -> Book:
    doc = pymupdf.open(book_path(grade))
    pages: list[Page] = []
    genre = "front"
    part = header = None
    for i in range(doc.page_count):
        p = read_page(doc, i)
        if i < 10:
            p.genre = "front"
        elif re.search(r"이단원의내용", re.sub(r"\s+", "", " ".join(l.plain for l in p.lines))):
            p.genre = "intro"
        elif "학습계획" in re.sub(r"\s+", "", " ".join(l.plain for l in p.lines)) and "공부한날" in re.sub(r"\s+", "", " ".join(l.plain for l in p.lines)):
            p.genre = "plan"
        elif not p.genre:
            p.genre = genre if genre not in ("intro", "plan", "front") else "other"
        genre = p.genre
        # 대단원 · 중단원은 없는 쪽(홀수 쪽 · 첫 쪽)에 앞 쪽 값을 잇는다.
        if p.part and re.match(r"^[ⅠⅡⅢⅣⅤⅥ]", p.part):
            part = p.part
        else:
            p.part = part
        if p.header and re.match(r"^\d+\s*\.", p.header):
            header = re.sub(r"^(\d+)\s*\.\s*", r"\1. ", p.header)
            p.header = header
        else:
            p.header = header
        pages.append(p)
    return Book(grade, book_path(grade), pages, doc.page_count)


def sections(book: Book) -> list[dict]:
    """소단원 목록 — 제목 쪽부터 «개념원리 확인하기» 앞까지가 개념 쪽이다."""
    out = []
    for p in book.pages:
        if p.genre == "concept" and p.title:
            out.append({"title": p.title, "start": p.pno, "concept": [p.pno]})
        elif p.genre == "concept" and out:
            out[-1]["concept"].append(p.pno)
    return out


if __name__ == "__main__":
    g, pno = sys.argv[1], int(sys.argv[2])
    b = load(g)
    p = b.pages[pno - 1]
    print(f"p{p.pno} 책{p.book} [{p.genre}] {p.part} / {p.header} / {p.title}")
    for ln in p.lines:
        print(("!" if ln.garbled else " ") + " %4.0f %4.0f  %s" % (ln.y, ln.x, ln.marked))
