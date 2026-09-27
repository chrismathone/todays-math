# -*- coding: utf-8 -*-
"""개념원리 중학 학생용 PDF 를 **글꼴·색째로** 읽는 공용 층 — 트랙 mida(1-1 · 1-2 · 2-1).

① 무엇을 하나
   - 권마다 쪽을 장르로 가른다: 차례 · 단원 도입(«이 단원의 내용») · **개념 쪽**(«개념원리 이해»
     부터 다음 «개념원리 확인하기» 앞까지) · 그 밖(문제 쪽).
   - 한 줄을 span 단위로 읽어 «붉은 글씨(af473a) · 굵은 고딕(YDVYGOStd13) · 수식 글꼴(EH*)»을
     표시한 채 돌려준다. 용어 뽑기(`extract-gaenyeom-terms-mida.py`)와 눈 검산 덤프가 **같은 층**을 쓴다.
② 왜 이렇게 하나
   - 이 책의 정의 표시는 둘이다: «⑴ 용어：뜻» 줄(용어가 굵은 고딕 13)과, 문장 속 **붉은 글씨**.
     실측(1-1 p10): 소수·합성수·거듭제곱·밑·지수가 붉은색, 1-1 p35 공배수·최소공배수는 굵은 고딕만.
   - 수식은 한컴 글꼴(EHsang·EHyak·EHboNA/B)이다. `rpm_book_latex` 의 **참에서 푼 표**
     (SUPER · NUMERATOR · CHARS 의 PUA)만 빌려 온다 — 손으로 새 표를 적지 않는다(18 §2-4).
     글꼴이 가르는 기호는 **세 권 개념 쪽 전수 조사**(census, 2026-09-28)에서 문맥으로 확인한 것만 둔다:
     NPYP `C`=∠(1-2 p18 «기호로 CAOB»), NPSUSP `s`+대문자=△(1-2 p66), EHyak `p`=π(1-2 p122 «원주율은
     기호로 p»), EHyak `ª`=≡(1-2 p72 합동), EHyak `ê`=직선 표시(1-2 p11), EHsang `³`=반직선 표시(1-2 p11),
     EHyak `µ`=호 표시(1-2 p116), EHyak `H`=순환마디 점(2-1 p13 «0.777y=0.H7»), PUA U+E47E=∥(1-2 p34).
     그 밖으로 못 푸는 수식 조각은 **지어내지 않고** `〔수식〕` 으로 두고 garbled 로 센다.
③ 무엇을 안 바꾸나: N 드라이브는 읽기만 한다. PDF 만 연다(.hwp 금지).
"""
from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # scripts/qa
from rpm_book_latex import CHARS, NUMERATOR, SUPER  # noqa: E402  (참에서 푼 표 — 다시 적지 않는다)

#: 원본은 N 드라이브(읽기만). 같은 파일의 로컬 사본을 쓰려면 GAENYEOM_DIR 로 폴더를 준다(md5 는 보고서에).
ROOT = Path(os.environ.get("GAENYEOM_DIR") or r"N:\개인\강아\교재자료\RPM\22\개념원리")
BOOKS = {
    "1-1": ROOT / "개념원리 중학 1-1 학생용.pdf",
    "1-2": ROOT / "개념원리 중학 1-2 학생용.pdf",
    "2-1": ROOT / "개념원리 중학 2-1 학생용.pdf",
}

RED = 0xAF473A        # 정의 낱말 강조색(실측)
PURPLE = 0x923F87     # 옆 설명(말풍선) 색
WHITE = 0xFFFFFF      # 「예」「참고」「주의」 딱지 글자
TITLE_GREEN = 0x225E4C  # 소단원 큰 제목
BOLD_FONT = "YDVYGOStd13"
TOPIC_FONT = "YDVYGOStd14"
NL = chr(10)  # 역슬래시 이스케이프를 줄인다 — 도구 층이 한 겹 벗긴 전례(메모리 «역슬래시 코드는 Edit 로»)

#: 뜻 있는 사용자 영역 글자 — `rpm_book_latex.CHARS` 에서 가져온다(∥ · □).
PUA_MEAN = {k: {"\\parallel": "∥", "\\square": "□"}[v] for k, v in CHARS.items()
            if len(k) == 1 and 0xE000 <= ord(k) <= 0xF8FF}
#: 한 줄에서 버릴 조판 글자(뜻 없음). 뜻 있는 PUA 는 이보다 **먼저** 바꾼다.
JUNK = re.compile(r"[\u200c\u200b\x07\x08\x03\ue000-\uf8ff]")

#: 내가 끼우는 자리 표시 — 뒤에서 이웃 글자와 묶는다. 남으면 «깨짐».
M_LINE, M_RAY, M_ARC, M_DOT = "\x0f", "\x10", "\x0e", "\x0b"

#: 기호 글꼴(EHyak) — 같은 글자가 다른 뜻이다(실측 1-1 p10 `a+0` = a≠0, `2, 3, y` = 2, 3, ⋯).
#: `¾`=≥ 는 rpm_page_text.BY_FONT 의 실측과 같다. 글자 단위로 먼저 바꾸고 나서 조각을 잇는다.
YAK = {"+": "≠", "y": "⋯", "¾": "≥", "É": "≤", "p": "π", "ª": "≡",
       "ê": M_LINE, "µ": M_ARC, "H": M_DOT}
#: 수식 글꼴이 아닌 기호 글꼴(1-2). `s` 는 **대문자 이름이 뒤따를 때만** △ 다 — 1-2 p212 «잎 s» 는 글자.
SYMBOL_FONTS = {"NPYP": {"C": "∠"}}

#: 수식 글꼴 안에서 그대로 읽어도 되는 글자. 이 밖의 글자가 남으면 «깨짐»으로 센다.
SAFE_MATH = re.compile("^[0-9A-Za-z .,()=+\\-<>|×÷°⋯≠≤≥∠△∥⊥≡π↔→⌒¹²³⁴⁵⁶⁷⁸⁹⁰ᵐⁿ/:%\u0305\u0307]*$")
SUP_UNI = {"1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷",
           "8": "⁸", "9": "⁹", "0": "⁰", "m": "ᵐ", "n": "ⁿ"}
SUP_CHARS = "".join(SUPER)  # ÚÛÜÝÞßàáâ¡µμÇÑ
SUP_RUN = re.compile("([0-9A-Za-z\\)\\]])[\u2009 ]?([" + re.escape(SUP_CHARS) + "][" + re.escape(SUP_CHARS) + "`]*)")
FRAC = re.compile(";;?([^;\\s]{1,12});;?")
OVERLINE = re.compile("([A-Z]{1,3})Ó")
LINE_MARK = re.compile("([A-Z]{2,3})[ \u2006]?" + M_LINE)
RAY_MARK = re.compile("([A-Z]{2,3})" + M_RAY)
ARC_MARK = re.compile(M_ARC + " ?([A-Z]{2,3})")
DOT_MARK = re.compile(M_DOT + "([0-9])")
TRI = re.compile("s(?=[A-Z]{3}(?![A-Za-z]))")
MATH_FONT = re.compile("^EH")


def _frac(m: re.Match[str]) -> str:
    den, num = [], []
    for ch in m.group(1):
        if ch in NUMERATOR:
            num.append(NUMERATOR[ch])
        elif ch.isdigit():
            den.append(ch)
        else:
            return m.group(0)
    if not den or not num:
        return m.group(0)
    return "".join(num) + "/" + "".join(den)


def _sup(m: re.Match[str]) -> str:
    body = "".join(SUP_UNI.get(SUPER.get(c, ""), "") for c in m.group(2) if c != "`")
    if not body or len(body) != len([c for c in m.group(2) if c != "`"]):
        return m.group(0)
    return m.group(1) + body


def premap(text: str, font: str) -> str:
    """글꼴이 가르는 글자만 먼저 바꾼다(조각을 잇기 전에 — 이은 뒤에는 글꼴을 모른다)."""
    s = JUNK.sub("", "".join(PUA_MEAN.get(c, c) for c in text))
    low = font.lower()
    if "yak" in low:
        return "".join(YAK.get(c, c) for c in s)
    if "sang" in low:
        # ⚠️ EHsang 의 `³`(U+00B3)은 **반직선 표시**다(1-2 p11 «기호로 AB³»). 위첨자 3 과 같은 코드라
        #    그대로 두면 «AB 세제곱»으로 읽힌다 — 자리 표시로 바꿔 두고 대문자 둘 뒤에서만 푼다.
        # ⚠️ `{` `}` 는 바꾸지 않는다(→ 못 읽음). RPM 정답책에서는 «괄호를 그린 글자»(rpm_page_text.BOOK_BRACE)
        #    였지만 이 책 1-1 p89 «( ) → { } → [ ]» 의 `{ }` 는 **진짜 중괄호**다(렌더로 확인). 같은 글자가
        #    큰 소괄호(1-1 p70 «0+(+1/2)»)이기도 해서 글자만으로는 못 가른다. 분수 글꼴(EHboN*)에서는
        #    `{`·`[` 가 **문자**이기까지 하다 — `;5{;` 는 x/5 인데 `(` 로 바꾸면 NUMERATOR 가 9 로 읽어
        #    «9/5» 를 지어냈다(1-1 p104 실측, 처음 판에서).
        return s.replace("¾", "℃").replace("³", M_RAY)
    return s


def decode_math(s: str) -> tuple[str, bool]:
    """이어 붙인 수식 조각을 읽는다. (글, 깨짐 여부). 못 푸는 글자는 지어내지 않는다."""
    s = s.replace("_", "×").replace("Ö", "÷").replace("ù", "°").replace("É", "≤")
    s = FRAC.sub(_frac, s)
    s = SUP_RUN.sub(_sup, s)
    s = OVERLINE.sub(lambda m: "".join(c + "\u0305" for c in m.group(1)), s)
    s = LINE_MARK.sub(lambda m: "↔" + m.group(1), s)
    s = RAY_MARK.sub(lambda m: "→" + m.group(1), s)
    s = ARC_MARK.sub(lambda m: "⌒" + m.group(1), s)
    s = DOT_MARK.sub(lambda m: m.group(1) + "\u0307", s)
    s = TRI.sub("△", s)
    s = s.replace("`", "")
    for sp in ("\u2005", "\u2006", "\u2003", "\u2009"):
        s = s.replace(sp, " ")
    ok = bool(SAFE_MATH.match(s))
    return s, not ok


@dataclass
class Span:
    text: str
    font: str
    color: int
    size: float
    x0: float
    y0: float
    garbled: bool = False

    @property
    def red(self) -> bool:
        return self.color == RED

    @property
    def bold(self) -> bool:
        return self.font.startswith(BOLD_FONT) and self.color not in (WHITE,)

    @property
    def math(self) -> bool:
        return bool(MATH_FONT.match(self.font))


@dataclass
class Line:
    page: int  # 1부터
    x0: float
    y0: float
    spans: list[Span] = field(default_factory=list)
    x1: float = 0.0  # 오른쪽 끝 — 줄이 오른쪽 여백까지 차면 문장이 다음 줄로 이어진다

    @property
    def text(self) -> str:
        return "".join(s.text for s in self.spans)

    @property
    def garbled(self) -> bool:
        return any(s.garbled for s in self.spans)

    def tagged(self) -> str:
        """사람이 읽는 덤프: 붉은 «», 굵은 【】, 깨진 수식 〔〕, 흰 딱지 [], 보라 말풍선 {}."""
        out = []
        for s in self.spans:
            t = s.text
            if not t.strip():
                out.append(t)
                continue
            if s.garbled:
                out.append("〔" + t + "〕")
            elif s.red:
                out.append("«" + t + "»")
            elif s.color == WHITE:
                out.append("[" + t.strip() + "]")
            elif s.color == PURPLE:
                out.append("{" + t + "}")
            elif s.bold and not s.math:
                out.append("【" + t + "】")
            else:
                out.append(t)
        return "".join(out)


def read_lines(page: pymupdf.Page, pno: int) -> list[Line]:
    lines: list[Line] = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for ln in b["lines"]:
            spans: list[Span] = []
            run: list[dict] = []  # 이어지는 수식 조각 — 지수·분수가 조각 경계에서 갈린다(`(+3)` | `Û`=`)

            def flush_run() -> None:
                if not run:
                    return
                raw = "".join(premap(r["text"], r["font"]) for r in run)
                txt, bad = decode_math(raw)
                if bad:
                    txt = "〔수식〕"
                r0 = run[0]
                if txt:
                    spans.append(Span(txt, r0["font"], r0["color"], r0["size"], r0["bbox"][0], r0["bbox"][1], bad))
                run.clear()

            for s in ln["spans"]:
                raw = s["text"]
                if not raw:
                    continue
                fam = s["font"].split("-")[0]
                if MATH_FONT.match(s["font"]) or fam in SYMBOL_FONTS or fam == "NPSUSP":
                    # 기호 글꼴도 수식 조각에 넣는다 — ∠ 가 뒤따르는 `AOB` 와 한 덩어리여야 읽힌다.
                    if fam in SYMBOL_FONTS:
                        s = dict(s, text="".join(SYMBOL_FONTS[fam].get(c, c) for c in raw), font="EH-" + fam)
                    elif fam == "NPSUSP":
                        s = dict(s, font="EH-" + fam)
                    if run and run[-1]["color"] != s["color"]:
                        flush_run()
                    run.append(s)
                    continue
                flush_run()
                txt = JUNK.sub("", "".join(PUA_MEAN.get(c, c) for c in raw))
                txt = txt.replace("\u2006", " ").replace("\u2005", " ")
                if not txt:
                    continue
                spans.append(Span(txt, s["font"], s["color"], s["size"], s["bbox"][0], s["bbox"][1], False))
            flush_run()
            if spans and "".join(x.text for x in spans).strip():
                lines.append(Line(pno, ln["bbox"][0], ln["bbox"][1], spans, ln["bbox"][2]))
    lines.sort(key=lambda l: (round(l.y0 / 3), l.x0))
    return lines


def page_kind_from_text(t: str) -> set[str]:
    k = set()
    if ("개념원리 " + NL + "이해") in t or ("개념원리" + NL + "이해") in t:
        k.add("이해")
    if ("개념원리" + NL + "확인하기") in t:
        k.add("확인")
    if "이 단원의 내용" in t:
        k.add("단원")
    if ("보충" + NL + "학습") in t:
        k.add("보충")
    if "차례" in t and "·····" in t:
        k.add("차례")
    return k


@dataclass
class Book:
    grade: str
    path: str
    pages: int
    kinds: list[set[str]]          # 0부터
    lines: list[list[Line]]        # 0부터 — 모든 쪽
    first_body: int = 0            # 1부터
    concept: list[int] = field(default_factory=list)  # 1부터


CACHE_VERSION = "v5"


def load_book(grade: str) -> Book:
    """한 권을 한 번만 읽는다(쪽마다 0.3~0.5초 — 부하 걸린 기계에서 권당 2분).

    GAENYEOM_CACHE 폴더를 주면 pickle 로 저장해 다시 쓴다(파일 크기·수정 시각·해독 판이 열쇠).
    """
    import pickle

    path = BOOKS[grade]
    st = path.stat()
    cache_dir = os.environ.get("GAENYEOM_CACHE")
    name = f"mida-{grade}-{st.st_size}-{int(st.st_mtime)}-{CACHE_VERSION}.pkl"
    cache = Path(cache_dir) / name if cache_dir else None
    if cache and cache.exists():
        class _Here(pickle.Unpickler):  # 덤프(__main__)로 만든 저장본도 모듈로 읽는다
            def find_class(self, module, name):
                if name in ("Book", "Line", "Span"):
                    return globals()[name]
                return super().find_class(module, name)

        with cache.open("rb") as fh:
            return _Here(fh).load()
    doc = pymupdf.open(path)
    kinds, lines = [], []
    for i in range(doc.page_count):
        page = doc[i]
        kinds.append(page_kind_from_text(page.get_text()))
        lines.append(read_lines(page, i + 1))
    book = Book(grade, str(path), doc.page_count, kinds, lines)
    book.first_body = next(i + 1 for i, k in enumerate(kinds) if "단원" in k)
    inside = False
    for i in range(book.first_body - 1, doc.page_count):
        k = kinds[i]
        if "이해" in k:
            inside = True
        if "확인" in k and "이해" not in k:
            inside = False
        if inside:
            book.concept.append(i + 1)
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_bytes(pickle.dumps(book))
    return book


def book_page_label(lines: list[Line]) -> str:
    """쪽 아래 구석의 인쇄 쪽수(DINMittelschrift 13pt)."""
    for l in lines:
        for s in l.spans:
            if s.font.startswith("DINMittelschrift") and s.text.strip().isdigit() and s.y0 > 740:
                return s.text.strip()
    return ""


if __name__ == "__main__":
    # 덤프: python gaenyeom_pages_mida.py 1-1 [out.txt]
    import io
    g = sys.argv[1]
    book = load_book(g)
    buf = io.StringIO()
    for pno in book.concept:
        ls = book.lines[pno - 1]
        buf.write(NL + f"===== p{pno} (책 {book_page_label(ls)}쪽) {sorted(book.kinds[pno-1])}" + NL)
        for l in ls:
            if l.y0 < 45 or l.y0 > 755 or l.x0 > 575:
                continue
            buf.write(f"{l.y0:4.0f} {l.tagged()}" + NL)
    out = buf.getvalue()
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(out, encoding="utf-8")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(out)
