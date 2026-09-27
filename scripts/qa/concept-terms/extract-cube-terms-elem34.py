# -*- coding: utf-8 -*-
"""큐브수학 개념 진도북 초3-1 · 3-2 · 4-1 · 4-2 — 교재 개념 용어 전수 (elem34 트랙, 2026-09-28).

사용:
  PYTHONIOENCODING=utf-8 python scripts/qa/concept-terms/extract-cube-terms-elem34.py [--cache DIR] [--data DIR]
산출:
  저장소  docs/reference/concept-terms/cube-{3-1,3-2,4-1,4-2}.json · .md · -explorer.md — 교재 원문 없음
  저장소 밖 --data(기본 C:\\Creative\\testautocreator-data\\I-개념용어):
          cube-*.json(문장 포함 전체) · elem34/census-elem34.json(용어가 안 된 후보 전부)
  읽는 것: --data/elem34/terms-elem34-text.json — 보정 행이 문장을 오릴 글귀(교재 원문 조각)

🔴 시중 교재 원문은 저장소에 두지 않는다(원장님 2026-09-28). 저장소 JSON 은 문장 대신 sentenceRef(key)를 싣는다.

검출은 두 갈래를 **따로** 세고 서로 대조한다(18 §2 — 목록에 기대지 않는 발견기):
  ⑴ 색 글씨: 개념 쪽 본문의 갈색 굵은 글씨(#95533c) 덩어리
  ⑵ 문형: «~(이)라고 합니다 · (이)라 하고 · 다고 합니다 · (이)라 쓰고 … 읽습니다 · 라고 부릅니다»
색 글씨 바로 뒤에 정의 꼬리가 붙으면 자동 용어. 그 밖(꼬리 없는 색 글씨 · 색 없는 정의 문장 ·
문제 쪽에서만 나온 정의 문장)은 버리지 않고 census 로 내보낸다. 사람이 가른 것은 아래 보정 표
(CURATED_ADD · DROP · KIND · ALIASES)에 까닭과 같이 둔다 — 보정 표는 자동이 못 보는 것만 담는다.
N 드라이브는 읽기만 한다. `.hwp` 는 열지 않는다.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cube_pdf_elem34 import (  # noqa: E402
    BOOKS,
    GARBLE,
    TERM_COLOR,
    Line,
    assemble,
    book_path,
    cut_sentence,
    footer_page,
    open_book,
    page_genres,
    page_lines,
    parse_toc,
    section_titles,
    squash,
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "docs" / "reference" / "concept-terms"
EXTRACTED_AT = "2026-09-28"
MARGIN_X = 175  # 개념 쪽 왼쪽 여백 메모(이 x 보다 왼쪽)

# 정의 꼬리 — 색 글씨 덩어리 바로 뒤에 붙어야 «이 낱말을 정한다» 로 읽는다.
DEF_TAIL = re.compile(r"^\s*(이)?\s*(라고\s*(합니다|부릅니다|합)|라\s*(하고|합니다))|^\s*(하)?다고\s*합니다|^\s*고\s*합니다|^\s*이?라고\s*$")
# 단위 이름과 기호를 나란히 적은 «… 라고 씁니다» 문장(3-2 110 · 118쪽) — «1 이름은 1기호» 꼴
WRITES_AS = re.compile(r"1\s*([가-힣]+)(?:은|는)\s*1\s*([a-zA-Z]+)")
DEF_SENTENCE = re.compile(r"(이)?라고\s*(합니다|부릅니다)|(이)?라\s*하고|다고\s*합니다|라\s*쓰고|라고\s*읽습니다|라고\s*씁니다|[을를]\s*말합니다")
WRITE_READ = re.compile(r"(?P<w>\S[^,]*?)(이)?라\s*쓰고,?\s*(?P<r>.+?)(이)?라고\s*읽습니다")
HANGUL = re.compile(r"[가-힣]")
NUM_WORD = re.compile(r"^[영일이삼사오육칠팔구십백천만억조\s점]+$")

# ── 보정 표 ─────────────────────────────────────────────────────────────
# 자동 용어 중 용어가 아닌 것(까닭). 키는 (권, 용어).
DROP: dict[tuple[str, str], str] = {}
# 갈래 바꾸기(까닭). 기본은 «정의», 쓰는 꼴에 로마자 · ° 가 있으면 «기호».
KIND: dict[tuple[str, str], tuple[str, str]] = {}
# 표기 흔들림 묶기.
ALIASES: dict[str, list[str]] = {}
# 자동이 못 보는 용어: 그림 이름표 · 색 없는 정의 · 소단원 제목으로만 가르친 것.
#   anchor = 그 쪽 글자층에서 문장을 찾을 글귀(문장은 글자층에서 오린다 — 손으로 쓰지 않는다).
#   sentence 를 직접 주는 것은 글자층에 문장이 없을 때(그림 이름표)뿐이고 note 에 그렇다고 적는다.
CURATED_ADD: dict[str, list[dict]] = {g: [] for g in BOOKS}
# 보정 행의 글귀(교재 원문 조각) — 저장소 밖 파일에서 읽는다. key = 권/p쪽/용어.
TEXT: dict = {}
DATA_DEFAULT = Path(r"C:\Creative\testautocreator-data\I-개념용어")


def term_key(grade: str, pn: int, term: str) -> str:
    return f"{grade}/p{pn:03d}/{term}"


def load_curation(data: Path) -> None:
    from curation_elem34 import ALIASES as A, CURATED_ADD as C, DROP as D, KIND as K  # noqa: E402,I001

    DROP.update(D)
    KIND.update(K)
    ALIASES.update(A)
    for g, rows in C.items():
        CURATED_ADD[g].extend(rows)
    src = data / "elem34" / "terms-elem34-text.json"
    if not src.exists():
        raise SystemExit(f"보정 글귀 파일이 없음: {src} — 저장소 밖 데이터(testautocreator-data)를 먼저 둘 것")
    TEXT.update(json.loads(src.read_text(encoding="utf-8")))
    missing = [term_key(g, r["page"], r["term"]) for g, rows in C.items() for r in rows
               if term_key(g, r["page"], r["term"]) not in TEXT["anchors"]]
    if missing:
        raise SystemExit(f"보정 행의 글귀가 글귀 파일에 없음: {missing}")


# ── 쪽 읽기 ─────────────────────────────────────────────────────────────


def color_runs(line: Line) -> list[tuple[int, int, str]]:
    """줄 안의 갈색 굵은 글씨 덩어리: (시작 글자 위치, 끝, 글자). 빈칸만 있는 검은 조각은 건너 이어 붙인다."""
    runs = []
    pos = 0
    cur = None
    for s in line.spans:
        n = len(s.text)
        if s.color == TERM_COLOR and s.text.strip():
            if cur is None:
                cur = [pos, pos + n]
            else:
                cur[1] = pos + n
        elif s.text.strip() and cur is not None:
            runs.append((cur[0], cur[1], line.text[cur[0] : cur[1]]))
            cur = None
        pos += n
    if cur is not None:
        runs.append((cur[0], cur[1], line.text[cur[0] : cur[1]]))
    return runs


def norm_term(t: str) -> str:
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"^\d+\s*", "", t)  # «1 밀리미터» → «밀리미터», «1초» → «초»
    return t.strip(" ,.")


def section_at(sections: list[tuple[float, str]], y: float, prev: str | None) -> str | None:
    above = [t for (ty, t) in sections if ty <= y + 2]
    if above:
        return above[-1]
    if sections and y < 280:  # 쪽 머리의 «한눈에» 그림말 — 그 쪽 첫 소단원
        return sections[0][1]
    return prev


class Book:
    def __init__(self, grade: str, cache: Path | None):
        self.grade = grade
        self.path = book_path(grade)  # JSON 의 file 은 N 드라이브 원본 경로(사본 아님)
        self.doc = open_book(grade, cache)
        self.toc = parse_toc(self.doc)
        self.genres = page_genres(self.doc)
        self.lines: dict[int, list[Line]] = {}

    def page(self, pn: int) -> list[Line]:
        if pn not in self.lines:
            self.lines[pn] = page_lines(self.doc[pn - 1])
        return self.lines[pn]

    def chapter_of(self, pn: int) -> dict | None:
        for c in self.toc:
            if c["pdfPages"][0] <= pn <= c["pdfPages"][1]:
                return c
        return None

    def canon_section(self, pn: int, title: str | None) -> str:
        c = self.chapter_of(pn)
        if not title or not c:
            return title or ""
        for s in c["sections"]:
            if squash(s) == squash(title):
                return s
        return title

    def book_page(self, pn: int) -> str:
        f = footer_page(self.doc[pn - 1])
        return f"{f or f'{pn:03d}'}쪽"


def scan_book(book: Book) -> tuple[list[dict], list[dict]]:
    """개념 쪽의 자동 용어와, 용어가 안 된 후보(census)."""
    terms: list[dict] = []
    census: list[dict] = []
    prev_section = None
    for pn in range(1, book.doc.page_count + 1):
        genre = book.genres[pn - 1]
        lines = book.page(pn)
        if genre != "개념설명":
            # 문제 쪽 · 한번더 · 마무리: 정의 문장만 모아 둔다(용어가 개념 쪽 밖에서만 정의되는지 대조용).
            for i, ln in enumerate(lines):
                if DEF_SENTENCE.search(ln.text):
                    text, _ = assemble(lines, i)
                    census.append(
                        {"kind": "개념 쪽 밖 정의 문장", "pdfPage": pn, "genre": genre, "text": cut_sentence(text, ln.text.strip()[:6])}
                    )
            continue
        sections = section_titles(lines)
        seen_sent: set[str] = set()
        consumed: set[tuple[int, int]] = set()
        for i, ln in enumerate(lines):
            runs = color_runs(ln)
            sec = book.canon_section(pn, section_at(sections, ln.y0, prev_section))
            for (a, b, run) in runs:
                chain_text, chain = assemble(lines, i)
                # 꼬리: 이 줄의 남은 글 + (문장이 안 끝났으면) 이어지는 줄들 — 꼬리가 다음 줄로 넘어간 경우(3-2 064쪽)
                tail = ln.text[b:]
                k = next((j for j, c in enumerate(chain) if c is ln), None)
                if k is not None and not re.search(r"(다|요)\.", tail):
                    tail += "".join(c.text for c in chain[k + 1 :])
                run_clean = norm_term(run)
                sentence = cut_sentence(chain_text, run.strip())
                garbled = GARBLE in sentence
                if not HANGUL.search(run) and not re.search(r"[a-zA-Z°]", run):
                    census.append({"kind": "색 글씨(글자 없음)", "pdfPage": pn, "run": run, "text": sentence})
                    continue
                if re.search(r"라고\s*씁니다", sentence) and WRITES_AS.search(sentence):
                    for m in WRITES_AS.finditer(sentence):
                        if (pn, m.group(1)) not in consumed:
                            consumed.add((pn, m.group(1)))
                            terms.append(mk(book, pn, sec, m.group(1), "기호", sentence, garbled, "색글씨+쓰는꼴", aliases=[m.group(2)], y=ln.y0))
                    continue
                wr = WRITE_READ.search(sentence)
                if wr and run.strip() in (wr.group("w") + " " + wr.group("r")):
                    # «A 라 쓰고 B 라고 읽습니다» — 1 단위를 정하는 문장만 용어(1mm · 1°· 1만 …), 나머지는 읽기 예.
                    written = wr.group("w")
                    reading_all = [norm_term(x) for x in re.split(r"\s*또는\s*", wr.group("r"))]
                    reading, also = reading_all[0], reading_all[1:]  # «만 또는 일만» → 만 (+ 일만)
                    unit = re.search(r"(?:^|\s|또는\s*)1\s*([a-zA-Z°]+|만|억|조)\s*$", written.strip())
                    if unit and run.strip() in wr.group("r"):
                        key = (pn, reading)
                        if key not in consumed:
                            consumed.add(key)
                            sym = unit.group(1)
                            terms.append(
                                mk(book, pn, sec, reading, "기호" if re.search(r"[a-zA-Z°]", sym) else "정의", sentence, garbled,
                                   "색글씨+쓰고읽기", aliases=([sym] if re.search(r"[a-zA-Z°]", sym) else []) + also, y=ln.y0)
                            )
                    elif (pn, reading) not in consumed:
                        census.append({"kind": "쓰고·읽기 문장(용어 아님 후보)", "pdfPage": pn, "run": run, "text": sentence})
                    continue
                if re.search(r"(^|\s)[ㄱ-ㅎ]{2,}", run):
                    census.append({"kind": "이름 붙이기(도형 이름 표기)", "pdfPage": pn, "run": run_clean, "text": sentence})
                    continue
                listed = bool(re.match(r"^\s*,", tail)) and bool(re.search(r"라고\s*(합니다|부릅니다)", tail))
                if DEF_TAIL.search(tail) or listed:
                    key = (pn, run_clean)
                    if key in consumed:
                        continue
                    consumed.add(key)
                    terms.append(mk(book, pn, sec, run_clean, "정의", sentence, garbled, "색글씨+문형(나열)" if listed and not DEF_TAIL.search(tail) else "색글씨+문형", y=ln.y0))
                else:
                    census.append({"kind": "색 글씨(정의 꼬리 없음)", "pdfPage": pn, "run": run_clean, "section": sec, "text": sentence})
            if DEF_SENTENCE.search(ln.text) and not runs:
                text, chain = assemble(lines, i)
                s = cut_sentence(text, ln.text.strip()[:6])
                if s not in seen_sent and not any(color_runs(c) for c in chain):
                    seen_sent.add(s)
                    census.append({"kind": "색 없는 정의 문장", "pdfPage": pn, "section": sec, "text": s})
        if sections:
            prev_section = sections[-1][1]
    return terms, census


def mk(book: Book, pn: int, sec: str, term: str, kind: str, sentence: str, garbled: bool, evidence: str,
       aliases: list[str] | None = None, note: str = "", y: float = 0.0) -> dict:
    c = book.chapter_of(pn)
    return {
        "_y": y,
        "term": term,
        "kind": kind,
        "grade": book.grade,
        "chapter": c["chapter"] if c else "",
        "section": sec or "",
        "pdfPage": pn,
        "bookPage": book.book_page(pn),
        "key": term_key(book.grade, pn, term),
        "sentence": sentence,  # 교재 원문 — 저장소 밖 JSON 에만 쓴다(report_elem34.write_outputs)
        "first": False,
        "aliases": aliases or [],
        "mathGarbled": garbled,
        "note": note,
        "evidence": evidence,
    }


def curated_terms(book: Book) -> list[dict]:
    out = []
    for meta in CURATED_ADD[book.grade]:
        pn = meta["page"]
        row = {**meta, **TEXT["anchors"][term_key(book.grade, pn, meta["term"])]}
        lines = book.page(pn)
        page_text = " ".join(l.text for l in lines)

        def cut(anchor: str) -> tuple[str, float]:
            idx = next((i for i, l in enumerate(lines) if anchor in l.text), None)
            if idx is None:
                raise SystemExit(f"보정 표 글귀를 글자층에서 못 찾음: {book.grade} p{pn} «{anchor}»")
            text, _ = assemble(lines, idx)
            return cut_sentence(text, anchor), lines[idx].y0

        if "sentence" in row:
            # 글자층에 문장이 없는 이름표 — verify 글귀가 그 쪽에 모두 있어야 한다(지어내지 않는다).
            missing = [v for v in row["verify"] if v not in page_text]
            if missing:
                raise SystemExit(f"보정 표 이름표 검증 실패: {book.grade} p{pn} {row['term']} {missing}")
            sentence = row["sentence"]
            y = next((l.y0 for l in lines if row["verify"][0] in l.text), 400)
        elif "anchors" in row:
            parts = [cut(a) for a in row["anchors"]]
            sentence = " / ".join(p[0] for p in parts)
            y = parts[0][1]
        else:
            sentence, y = cut(row["anchor"])
        garbled = GARBLE in sentence
        sec = row.get("section") or book.canon_section(pn, section_at(section_titles(lines), y, None))
        out.append(mk(book, pn, sec, row["term"], row["kind"], sentence, garbled, "보정: " + row.get("evidence", "눈 검사"),
                      aliases=list(row.get("aliases", [])), note=row.get("note", ""), y=y))
    return out


# ── 탐험 카드 ───────────────────────────────────────────────────────────


def load_cards() -> dict:
    tsx = REPO / "node_modules" / "tsx" / "dist" / "cli.mjs"
    script = Path(__file__).resolve().parent / "dump-explorer-cards-elem34.ts"
    raw = subprocess.run(["node", str(tsx), str(script), "3", "4"], cwd=REPO, capture_output=True, check=True).stdout
    return json.loads(raw.decode("utf-8"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", type=Path, default=None, help="PDF 사본을 둘 폴더(N 드라이브에 쓰지 않는다)")
    ap.add_argument("--data", type=Path, default=DATA_DEFAULT, help="저장소 밖 데이터 폴더(교재 원문을 두는 곳)")
    ap.add_argument("--only", default=None)
    args = ap.parse_args()
    load_curation(args.data)
    from report_elem34 import write_outputs  # noqa: E402

    cards = load_cards()
    all_terms: dict[str, list[dict]] = {}
    all_census: dict[str, list[dict]] = {}
    books: dict[str, Book] = {}
    for g in BOOKS:
        if args.only and g != args.only:
            continue
        book = Book(g, args.cache)
        books[g] = book
        auto, census = scan_book(book)
        kept = []
        for t in auto:
            why = DROP.get((g, t["term"]))
            if why:
                census.append({"kind": "보정 표에서 뺌", "pdfPage": t["pdfPage"], "run": t["term"], "text": t["sentence"], "why": why})
                continue
            k = KIND.get((g, t["term"]))
            if k:
                t["kind"], t["note"] = k[0], (t["note"] + " " + k[1]).strip()
            kept.append(t)
        kept.extend(curated_terms(book))
        for t in kept:
            for a in ALIASES.get(t["term"], []):
                if a not in t["aliases"]:
                    t["aliases"].append(a)
        # 같은 권 같은 용어가 두 번 잡히면 앞 쪽 하나만(개념 쪽에서 다시 풀어 쓴 것).
        uniq: dict[str, dict] = {}
        for t in sorted(kept, key=lambda t: (t["pdfPage"], t["_y"])):
            uniq.setdefault(t["term"], t)
        all_terms[g] = list(uniq.values())
        all_census[g] = census
    write_outputs(books, all_terms, all_census, cards, OUT, EXTRACTED_AT, args.data, TEXT)
    census_path = args.data / "elem34" / "census-elem34.json"  # 후보 문장은 교재 원문 — 저장소 밖
    census_path.write_text(json.dumps(all_census, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for g, ts in all_terms.items():
        print(g, len(ts), dict(Counter(t["kind"] for t in ts)), "census", dict(Counter(c["kind"] for c in all_census[g])))


if __name__ == "__main__":
    main()
