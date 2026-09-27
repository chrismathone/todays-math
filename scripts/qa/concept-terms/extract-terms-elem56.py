# -*- coding: utf-8 -*-
"""큐브수학 개념 진도북 초5-1·5-2·6-1·6-2 — 개념 용어 전수 (트랙 elem56, 2026-09-28).

N 드라이브는 읽기만. PDF 만 연다(.hwp 금지 · 한컴 COM 금지). 공유 DB · 앱 코드 안 건드림.

두 층으로 나눈다.
  ⑴ 발견기(이 파일) — 개념 쪽에서 후보를 **목록 없이** 모은다. 다섯 갈래:
      def     «~라고 합니다 / ~라 하고 / ~한다고 합니다 / ~을 말합니다» 꼴 문장
      box     핵심 문장 상자(채움 없음 · 선 1.5pt 사각형) 안의 글
      rbox    결과 상자(채움 없음 · 회색 0.8pt) 안의 글 — 표본 대조에서 5-1 p120 단위 관계 상자를 놓쳐 더했다
      colon   여백 쌍점 정의(«• 낱말: 뜻풀이» 꼴)
      accent  본문 글꼴의 강조색 글씨(용어 · 제목 옆 말풍선)
      formula «(○○의 넓이)=…» 꼴 공식 줄
      (소단원 머리는 후보가 아니라 **차례 대조**로 센다 — 용어 0개 소단원은 판정이 있어야 한다)
  ⑵ 판정 — 사람이 정한 용어 · 갈래 · 탐험 카드 짝 · 0개 판정(저장소 `terms-elem56.json`, 우리 말만) +
     교재 원문 문장 · 버림 규칙(저장소 **밖** `testautocreator-data/I-개념용어/elem56/terms-elem56-text.json`).
     둘은 용어마다 `key`(«5-1/p030/약수»)로 잇는다.

🔴 시중 교재 원문은 저장소에 넣지 않는다(10-handoff · D-116 과 같은 원칙). 저장소에 쓰는 JSON 에는 문장 대신
   `sentenceRef`(바깥 파일 · key)만 싣고, 문장까지 든 전체 JSON 은 바깥 폴더에 쓴다. 누출 검사는 `check-leak-elem56.py`.

검산은 «넣은 것»이 아니라 «남은 것»을 센다:
  - 모든 후보는 용어가 덮거나(같은 쪽 문장·이름) 버림 까닭이 있어야 한다. 미판정이 1개라도 있으면 실패.
  - 판정의 `sentence` 는 그 쪽 글자층에 실제로 있어야 한다(공백 무시). 지어낸 문장은 실패.
    `[수식]`·`[분수]` 는 해독 못 한 수식 자리(아무 글자 0~24개). 그런 문장은 `mathGarbled: true`.
    분수(세로로 쌓인 숫자)·해독 못 한 글자가 있는 줄과 겹치는데 자리표시가 없으면 실패 — 깨진 숫자를 싣지 않는다.
  - 차례의 소단원마다 용어 수를 세고, 0개인 곳은 `zeroSections` 판정(눈으로 본 결과)이 있어야 한다.

실행(저장소 뿌리에서):
  npx tsx scripts/qa/concept-terms/dump-explorer-cards-elem56.ts <카드.json> 3 4 5 6 7 8 9
  python scripts/qa/concept-terms/extract-terms-elem56.py build --cards <카드.json> --scratch <작업 폴더> [--data <I-개념용어 폴더>]
  python scripts/qa/concept-terms/extract-terms-elem56.py shots --scratch <작업 폴더>   # 표본·0개 소단원 캡처
  python scripts/qa/concept-terms/check-leak-elem56.py --scratch <작업 폴더> --git 4f13be674..HEAD   # 원문 누출 검사
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).parent))
from cube_text_elem56 import (  # noqa: E402
    GARBLE,
    GRADES,
    book_page_label,
    book_path,
    is_accent,
    page_lines,
)

HERE = Path(__file__).parent
CURATION = HERE / "terms-elem56.json"
OUT_DIR = Path("docs/reference/concept-terms")
# 저장소 밖 — 교재 원문이 드는 곳. 문장은 여기 `elem56/terms-elem56-text.json`, 전체 JSON 은 여기 `cube-<학년>.json`.
DATA_DIR = Path(r"C:\Creative\testautocreator-data\I-개념용어")
DATA_REF = "I-개념용어"  # sentenceRef.file 의 앞머리(데이터 폴더 기준 상대 경로)
TEXT_NAME = "elem56/terms-elem56-text.json"
EXTRACTED_AT = "2026-09-28"
KINDS = ("정의", "성질", "정리", "공식", "법칙", "기호", "기타")
PLACEHOLDER = re.compile(r"\[(?:수식|분수)\]")
SAMPLE_SEED = 20260928
SAMPLE_PER_BOOK = 5


def norm(s: str) -> str:
    """공백·줄바꿈 무시 비교용."""
    return re.sub(r"\s+", "", s)


# ───────────────────────── 책 읽기 ─────────────────────────


def is_concept_page(lines: list[dict]) -> bool:
    return any(
        "개념 잡기" in s["text"] or "개념잡기" in s["text"]
        for ln in lines
        for s in ln["spans"]
        if s["size"] > 20
    )


def parse_toc(doc: pymupdf.Document) -> list[dict]:
    """차례(PDF 4~5쪽): 장 제목(28pt) · 쪽 범위(18pt) · 소단원(흰 번호 10pt)."""
    chapters: list[dict] = []
    for pno in range(1, 8):
        lines = page_lines(doc[pno - 1])
        if not any(ln["text"].strip() == "차례" for ln in lines) and not chapters:
            continue
        titles = [
            ln
            for ln in lines
            if ln["spans"][0]["font"].startswith("NanumSquareRound")
            and ln["spans"][0]["size"] >= 20
            and ln["text"].strip() != "차례"
        ]
        ranges = [
            ln for ln in lines if re.fullmatch(r"\d{3}~\d{3}쪽", ln["text"].strip())
        ]
        if not titles or not ranges:
            # 차례가 끝나면 단원 표지(같은 큰 글꼴)가 온다 — 쪽 범위 줄이 없는 쪽은 차례가 아니다.
            if chapters:
                break
            continue
        secs = [
            ln
            for ln in lines
            if ln["spans"][0]["font"].startswith("DINNextRounded")
            and ln["spans"][0]["color"] == 0xFFFFFF
            and re.match(r"\d+\s", ln["text"].strip())
        ]
        for t in sorted(titles, key=lambda l: l["bbox"][1]):
            ty = t["bbox"][1]
            rng = min(
                (r for r in ranges if abs(r["bbox"][0] - t["bbox"][0]) < 30 and 0 < ty - r["bbox"][1] < 40),
                key=lambda r: ty - r["bbox"][1],
                default=None,
            )
            a, b = (int(x) for x in re.findall(r"\d{3}", rng["text"])) if rng else (0, 0)
            chapters.append({"title": t["text"].strip(), "page": pno, "y": ty, "pdfPages": [a, b], "sections": []})
        for s in secs:
            sy = s["bbox"][1]
            # 수식 글꼴(×·÷)이 따로 줄이 되어 소단원 이름이 «(분수)» 로 잘린다 — 같은 높이의 오른쪽 이웃을 잇는다.
            x1 = s["bbox"][2]
            while True:
                nxt = min(
                    (o for o in lines if o is not s and abs(o["bbox"][1] - sy) < 4 and -2 <= o["bbox"][0] - x1 < 20),
                    key=lambda o: o["bbox"][0],
                    default=None,
                )
                if nxt is None:
                    break
                s = {**s, "text": s["text"].rstrip() + nxt["text"]}
                x1 = nxt["bbox"][2]
                lines = [o for o in lines if o is not nxt]
            owner = max(
                (c for c in chapters if c["page"] == pno and c["y"] < sy),
                key=lambda c: c["y"],
                default=None,
            )
            if owner is None:
                raise SystemExit(f"차례 p{pno}: 소단원 «{s['text']}» 의 장을 못 찾음")
            num, title = s["text"].strip().split(None, 1)
            owner["sections"].append({"num": int(num), "title": title.strip(), "y": sy})
    for i, c in enumerate(chapters, 1):
        c["num"] = i
        c["sections"].sort(key=lambda s: s["y"])
        nums = [s["num"] for s in c["sections"]]
        if nums != list(range(1, len(nums) + 1)):
            raise SystemExit(f"차례: {c['title']} 소단원 번호가 1…N 이 아님 {nums}")
        if not c["pdfPages"][0]:
            raise SystemExit(f"차례: {c['title']} 쪽 범위를 못 찾음")
    return chapters


def chapter_of(chapters: list[dict], pno: int) -> dict | None:
    for c in chapters:
        a, b = c["pdfPages"]
        if a <= pno <= b:
            return c
    return None


def section_headers(lines: list[dict]) -> list[dict]:
    """개념 쪽 소단원 머리: 흰 번호(DINNext 굵게 12pt 이상) + 오른쪽 강조색 제목."""
    heads = []
    for ln in lines:
        sp = ln["spans"][0]
        t = ln["text"].strip()
        if not (sp["font"].startswith("DINNextRoundedLTPro-Bold") and sp["color"] == 0xFFFFFF and sp["size"] >= 12 and t.isdigit()):
            continue
        x0, y0 = ln["bbox"][0], ln["bbox"][1]
        title_lines = [
            o
            for o in lines
            if o is not ln and abs(o["bbox"][1] - y0) < 7 and 0 < o["bbox"][0] - x0 < 40 and o["spans"][0]["size"] >= 11
        ]
        title = "".join(o["text"] for o in sorted(title_lines, key=lambda o: o["bbox"][0])).strip()
        heads.append({"num": int(t), "y": y0, "heading": title})
    return sorted(heads, key=lambda h: h["y"])


CACHE_DIR: Path | None = None  # --scratch 아래 elem56-cache — 원본 크기·수정시각이 같을 때만 쓴다.


def read_pages(grade: str, doc: pymupdf.Document) -> dict[int, dict]:
    src = book_path(grade)
    st = src.stat()
    stamp = f"{st.st_size}-{int(st.st_mtime)}"
    cache = CACHE_DIR / f"{grade}-{stamp}.pkl" if CACHE_DIR else None
    if cache and cache.exists():
        import pickle

        return pickle.loads(cache.read_bytes())
    raw = {}
    for pno in range(1, doc.page_count + 1):
        page = doc[pno - 1]
        lines = page_lines(page)
        concept = is_concept_page(lines)
        raw[pno] = {
            "lines": lines,
            "concept": concept,
            "bookPage": book_page_label(page, pno),
            "boxes": key_boxes(page, lines) if concept else [],
        }
    if cache:
        import pickle

        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_bytes(pickle.dumps(raw))
    return raw


def load_book(grade: str) -> dict:
    doc = pymupdf.open(book_path(grade))
    chapters = parse_toc(doc)
    raw = read_pages(grade, doc)
    pages = {}
    carry: dict[int, int] = {}  # 장 번호 → 마지막 소단원 번호
    for pno in range(1, doc.page_count + 1):
        r = raw[pno]
        ch = chapter_of(chapters, pno)
        heads = section_headers(r["lines"]) if r["concept"] else []
        pages[pno] = {
            **r,
            "chapter": ch,
            "heads": heads,
            "carry": carry.get(ch["num"]) if ch else None,
        }
        if ch and heads:
            carry[ch["num"]] = heads[-1]["num"]
    # 차례의 «×» 는 글자가 아니라 그림이라 «(분수)(자연수)» 로 읽힌다(5-2).
    # 개념 쪽 머리글은 수식 글꼴로 «(분수)×(자연수)» 가 읽히니, 연산 기호만 빼고 같으면 머리글을 쓴다.
    strip_ops = lambda s: re.sub(r"[×÷+\-=\s⑴⑵⑶()]", "", s)
    for pg in pages.values():
        ch = pg["chapter"]
        for h in pg["heads"]:
            sec = next((s for s in ch["sections"] if s["num"] == h["num"]), None) if ch else None
            if sec and h["heading"] and sec["title"] != h["heading"] and strip_ops(sec["title"]) == strip_ops(h["heading"]):
                if len(re.findall(r"[×÷]", h["heading"])) > len(re.findall(r"[×÷]", sec["title"])):
                    sec["tocTitle"] = sec["title"]
                    sec["title"] = h["heading"]
    return {"grade": grade, "doc": doc, "pageCount": doc.page_count, "chapters": chapters, "pages": pages}


def key_boxes(page: pymupdf.Page, lines: list[dict]) -> list[dict]:
    """상자 두 꼴(채움 없음 · 안에 글 줄):
    box  — 핵심 문장 상자: 선 굵기 1.2~2.0(올리브) · 폭 80pt 이상.
    rbox — 결과 상자: 선 0.8pt 회색(0.76,0.73,0.72). 5-1 p120 의 단위 관계 둘이 여기 있었다 —
           처음엔 핵심 상자만 세어 표본 대조에서 놓침이 나왔다(2026-09-28).
    """
    out = []
    for dr in page.get_drawings():
        r = dr["rect"]
        w = dr.get("width") or 0
        col = tuple(round(c, 2) for c in (dr.get("color") or ()))
        if dr.get("fill") is not None or r.height < 10:
            continue
        if 1.2 < w < 2.0 and r.width >= 80:
            kind = "box"
        elif abs(w - 0.8) < 0.05 and col == (0.76, 0.73, 0.72) and r.width >= 40:
            kind = "rbox"
        else:
            continue
        inside = [
            ln
            for ln in lines
            if r.contains(pymupdf.Rect(ln["bbox"]).tl + (0.5, 0.5)) and r.contains(pymupdf.Rect(ln["bbox"]).br - (0.5, 0.5))
        ]
        if inside:
            out.append({"kind": kind, "rect": tuple(round(v) for v in r), "text": " / ".join(ln["text"].strip() for ln in inside), "lines": inside})
    return out


def section_at(book: dict, pno: int, y: float) -> tuple[dict | None, dict | None]:
    """(장, 소단원) — 그 쪽에서 y 보다 위(또는 같은 줄)의 마지막 머리, 없으면 앞 쪽에서 이어받음."""
    pg = book["pages"][pno]
    ch = pg["chapter"]
    if ch is None:
        return None, None
    num = None
    for h in pg["heads"]:
        if h["y"] <= y + 6:
            num = h["num"]
    if num is None:
        num = pg["carry"] if pg["carry"] is not None else (pg["heads"][0]["num"] if pg["heads"] else None)
    sec = next((s for s in ch["sections"] if s["num"] == num), None)
    return ch, sec


def chapter_label(ch: dict) -> str:
    return f"{ch['num']}. {ch['title']}"


# ───────────────────────── 후보 발견 ─────────────────────────

DEF_PAT = re.compile(
    r"(?:이)?라고(?:합니다|하고|해요|해\.|도합니다|부릅니다|읽습니다|읽고|하면)"
    r"|(?:이)?라(?:합니다|하고|쓰고)"
    r"|[한하]다고(?:합니다|하고)"
    r"|[을를]말합니다"
)


def accent_runs(ln: dict) -> list[str]:
    """한 줄 안의 이어진 강조색 span 을 한 덩이로."""
    runs, cur = [], []
    for s in ln["spans"]:
        # 7pt 이상: 제목 옆 말풍선(7.7pt — 6-1 p128 «부피» 뜻풀이)까지.
        if is_accent(s["color"]) and s["text"].strip() and 7.0 <= s["size"] <= 13.5:
            cur.append(s["text"])
        else:
            if cur:
                runs.append("".join(cur).strip())
            cur = []
    if cur:
        runs.append("".join(cur).strip())
    return [r for r in runs if len(re.findall(r"[가-힣]", r)) >= 2]


FORMULA_PAT = re.compile(r"^[•●]?\s*\(([^()=]{2,24})\)\s*=")
# 여백의 쌍점 정의(«• 낱말: 뜻풀이» — 6-2 p104 지름·반지름, 6-1 p82 타율·축척).
# 쌍점 뒤가 줄바꿈인 것도(5-2 p134 — 뜻풀이가 쌍점 앞, 낱말이 다음 줄).
COLON_PAT = re.compile(r"^[•·]?\s*([가-힣][가-힣 ]{0,14}?)\s*:\s*(?:[가-힣(]|$)")


def candidates(book: dict) -> list[dict]:
    out = []
    for pno, pg in book["pages"].items():
        if not pg["concept"]:
            continue
        lines = pg["lines"]
        head_ys = {h["y"] for h in pg["heads"]}
        for i, ln in enumerate(lines):
            t = ln["text"]
            nt = norm(t)
            pair = nt + (norm(lines[i + 1]["text"]) if i + 1 < len(lines) else "")
            m = DEF_PAT.search(nt)
            if m or (DEF_PAT.search(pair) and not DEF_PAT.search(norm(lines[i + 1]["text"]) if i + 1 < len(lines) else "")):
                out.append({"type": "def", "page": pno, "y": ln["bbox"][1], "text": t.strip(), "garbled": ln["garbled"]})
            is_head = any(abs(ln["bbox"][1] - hy) < 7 for hy in head_ys) and ln["spans"][0]["size"] >= 12
            if not is_head:
                for r in accent_runs(ln):
                    out.append({"type": "accent", "page": pno, "y": ln["bbox"][1], "text": r, "garbled": ln["garbled"]})
            cm = COLON_PAT.match(t.strip())
            if cm:
                out.append({"type": "colon", "page": pno, "y": ln["bbox"][1], "text": t.strip(), "garbled": ln["garbled"]})
            fm = FORMULA_PAT.match(t.strip())
            if fm:
                out.append({"type": "formula", "page": pno, "y": ln["bbox"][1], "text": fm.group(1).strip(), "line": t.strip(), "garbled": ln["garbled"]})
        for bx in pg["boxes"]:
            out.append({"type": bx["kind"], "page": pno, "y": bx["rect"][1], "text": bx["text"], "garbled": any(l["garbled"] for l in bx["lines"])})
    return out


# ───────────────────────── 판정 대조 ─────────────────────────


def page_stream(pg: dict) -> tuple[str, list[int]]:
    """쪽 글을 공백 없이 잇고, 글자마다 몇째 줄인지."""
    chars, owner = [], []
    for i, ln in enumerate(pg["lines"]):
        for ch in norm(ln["text"]):
            chars.append(ch)
            owner.append(i)
    return "".join(chars), owner


def sentence_regex(sentence: str) -> re.Pattern[str]:
    parts = PLACEHOLDER.split(norm(sentence))
    return re.compile(".{0,24}?".join(re.escape(p) for p in parts))


def verify_sentence(book: dict, term: dict) -> dict:
    pg = book["pages"][term["pdfPage"]]
    stream, owner = page_stream(pg)
    sent = term["sentence"]
    if GARBLE in sent:
        raise SystemExit(f"{book['grade']} p{term['pdfPage']} «{term['term']}»: 문장에 깨진 글자 {GARBLE} — [수식] 자리표시로")
    m = sentence_regex(sent).search(stream)
    if not m:
        raise SystemExit(f"{book['grade']} p{term['pdfPage']} «{term['term']}»: 문장이 글자층에 없음 — «{sent}»")
    touched = sorted({owner[k] for k in range(m.start(), m.end())})
    bad_lines = [pg["lines"][k] for k in touched if pg["lines"][k]["garbled"]]
    has_ph = bool(PLACEHOLDER.search(sent))
    if bad_lines and not has_ph:
        # 겹친 줄의 깨짐이 문장 밖 조각에만 있으면 괜찮다 — 겹친 글자 자체를 본다.
        seg = stream[m.start() : m.end()]
        stacked = any(l["stacked"] for l in bad_lines)
        if GARBLE in seg or stacked:
            raise SystemExit(
                f"{book['grade']} p{term['pdfPage']} «{term['term']}»: 분수/깨진 수식 줄과 겹치는데 자리표시가 없음 — «{sent}»\n"
                f"   겹친 줄: {[l['text'].strip() for l in bad_lines]}"
            )
    y = pg["lines"][touched[0]]["bbox"][1]
    return {"y": y, "mathGarbled": has_ph, "touched": touched}


def load_curation(path: Path | None = None, text_path: Path | None = None) -> dict:
    """저장소 판정 + 바깥 원문(문장·버림)을 key 로 합친다. 한쪽에만 있는 key 는 실패."""
    cur = json.loads((path or CURATION).read_text(encoding="utf-8"))
    text = json.loads((text_path or DATA_DIR / TEXT_NAME).read_text(encoding="utf-8"))
    sents = text["sentences"]
    keys = [t["key"] for t in cur["terms"]]
    dup = [k for k, n in Counter(keys).items() if n > 1]
    missing = [k for k in keys if k not in sents]
    orphan = [k for k in sents if k not in set(keys)]
    if dup or missing or orphan:
        raise SystemExit(f"판정 key 가 안 맞음 — 겹침 {dup} · 문장 없음 {missing} · 용어 없는 문장 {orphan}")
    for t in cur["terms"]:
        if "sentence" in t:
            raise SystemExit(f"저장소 판정 파일에 원문 문장이 있다 — {t['key']} (바깥 파일로)")
        if t["key"] != f"{t['grade']}/p{t['pdfPage']:03d}/{t['term']}":
            raise SystemExit(f"key 꼴이 다르다 — {t['key']}")
        t["sentence"] = sents[t["key"]]
    if cur.get("drops"):
        raise SystemExit("저장소 판정 파일에 버림 규칙(교재 조각)이 있다 — 바깥 파일로")
    cur["drops"] = text["drops"]
    return cur


def covered(c: dict, book: dict, kept: list[dict], drops: list[dict]) -> tuple[str, str]:
    """(상태, 근거) — 용어가 덮으면 ('kept', 용어), 버림 까닭이 있으면 ('dropped', 까닭), 아니면 ('open', '')."""
    g = book["grade"]
    cn = norm(c["text"])
    same_page = [t for t in kept if t["pdfPage"] == c["page"]]
    names_book = {norm(n): t for t in kept for n in [t["term"], *t.get("aliases", [])]}
    for t in same_page:
        sn = norm(PLACEHOLDER.sub("", t["sentence"]))
        if c["type"] in ("def", "box", "rbox", "colon", "formula"):
            # 문장 겹침: 짧은 쪽의 12자 이상 조각이 긴 쪽에 있으면 덮인 것. 공식은 줄 전체로 본다.
            cl = re.sub(r"^[•·●①-⑳]+", "", norm(c.get("line", c["text"])))
            short, long_ = (cl, sn) if len(cl) <= len(sn) else (sn, cl)
            probe = short[:12] if len(short) >= 12 else short
            if probe and probe in long_:
                return "kept", t["term"]
            tail = short[-12:]
            if len(short) >= 12 and tail in long_:
                return "kept", t["term"]
        if c["type"] == "accent" and (cn in sn or cn in {norm(n) for n in [t["term"], *t.get("aliases", [])]}):
            return "kept", t["term"]
    if c["type"] in ("accent", "formula") and cn in names_book:
        return "kept", names_book[cn]["term"]
    if c["type"] == "accent" and len(cn) <= 12:
        # «4의 약수» 처럼 용어에 몇 글자가 붙은 강조 — 이 권의 용어 이름이 들어 있으면 덮인 것.
        hit = max((n for n in names_book if len(n) >= 2 and n in cn), key=len, default=None)
        if hit:
            return "kept", names_book[hit]["term"]
    for d in drops:
        if d.get("grade") not in (None, g):
            continue
        if d.get("page") not in (None, c["page"]):
            continue
        if d.get("type") not in (None, c["type"]):
            continue
        if re.search(d["match"], c["text"]) or re.search(d["match"], cn):
            return "dropped", d["reason"]
    return "open", ""


# ───────────────────────── 탐험 카드 ─────────────────────────


def load_cards(path: Path) -> list[dict]:
    units = json.loads(path.read_text(encoding="utf-8"))
    cards = []
    for u in units:
        for c in u["cards"]:
            cards.append({**c, "grade": u["grade"], "unitId": u["id"], "unitTitle": u["title"]})
    return cards


def grade_num(grade: str) -> int:
    return int(grade.split("-")[0])


def explorer_for(term: dict, cards: list[dict], grade: str) -> dict:
    own = [c for c in cards if c["grade"] == grade_num(grade)]
    manual = term.get("explorer")
    if manual:
        card = next((c for c in cards if c["id"] == manual.get("cardId")), None) if manual.get("cardId") else None
        if manual.get("cardId") and card is None:
            raise SystemExit(f"{grade} «{term['term']}»: 없는 카드 {manual['cardId']}")
        if manual["match"] not in ("exact", "alias", "related", "none"):
            raise SystemExit(f"{grade} «{term['term']}»: 짝 {manual['match']}")
        if manual["match"] == "related" and not manual.get("why"):
            raise SystemExit(f"{grade} «{term['term']}»: related 는 까닭(why)이 있어야 한다")
        for extra in manual.get("also", []):
            if not any(c["id"] == extra for c in cards):
                raise SystemExit(f"{grade} «{term['term']}»: 없는 카드 {extra}")
        out = {
            "match": manual["match"],
            "cardId": manual.get("cardId", ""),
            "cardName": card["name"] if card else "",
            "why": manual.get("why", ""),
        }
        if manual.get("also"):
            out["also"] = manual["also"]
        return out
    tn = norm(term["term"])
    for c in own:
        if norm(c["name"]) == tn:
            return {"match": "exact", "cardId": c["id"], "cardName": c["name"], "why": ""}
    for c in own:
        if norm(c["name"]) in {norm(a) for a in term.get("aliases", [])}:
            return {"match": "alias", "cardId": c["id"], "cardName": c["name"], "why": ""}
    other = [c for c in cards if c["grade"] != grade_num(grade) and norm(c["name"]) == tn]
    why = ""
    if other:
        why = "다른 학년 카드에 같은 이름: " + ", ".join(f"{c['id']}(학년 {c['grade']})" for c in other)
    return {"match": "none", "cardId": "", "cardName": "", "why": why}


# ───────────────────────── 만들기 ─────────────────────────


def build(args: argparse.Namespace) -> None:
    try:
        cur = load_curation(Path(args.curation) if args.curation else None, Path(args.text) if args.text else None)
    except SystemExit as e:
        print("🔴 실패 — 1 건\n  ", e)
        raise SystemExit(1)
    cards = load_cards(Path(args.cards))
    scratch = Path(args.scratch)
    scratch.mkdir(parents=True, exist_ok=True)
    books = {g: load_book(g) for g in GRADES}
    seen_first: dict[str, tuple[str, int]] = {}
    problems: list[str] = []
    all_out: dict[str, dict] = {}
    ledgers: dict[str, list[dict]] = {}
    for g in GRADES:
        book = books[g]
        terms_in = sorted(
            [t for t in cur["terms"] if t["grade"] == g], key=lambda t: (t["pdfPage"], t.get("order", 0))
        )
        kept = []
        for t in terms_in:
            if t["kind"] not in KINDS:
                problems.append(f"{g} «{t['term']}»: 갈래 {t['kind']}")
            pg = book["pages"].get(t["pdfPage"])
            if pg is None:
                problems.append(f"{g} «{t['term']}»: 쪽 {t['pdfPage']} 없음")
                continue
            try:
                v = verify_sentence(book, t)
                explorer = explorer_for(t, cards, g)
            except SystemExit as e:
                problems.append(str(e))
                continue
            ch, sec = section_at(book, t["pdfPage"], v["y"])
            if t.get("section"):
                sec = next((s for s in ch["sections"] if s["title"] == t["section"]), None) if ch else None
                if sec is None:
                    problems.append(f"{g} «{t['term']}»: 소단원 «{t['section']}» 이 차례에 없음")
            if ch is None or sec is None:
                problems.append(f"{g} p{t['pdfPage']} «{t['term']}»: 장/소단원을 못 정함")
                continue
            group = norm(t["term"])  # «처음» 은 같은 낱말끼리(도형마다 다시 정의돼도 한 낱말)
            first = group not in seen_first
            if first:
                seen_first[group] = (g, t["pdfPage"])
            row = {
                "term": t["term"],
                "kind": t["kind"],
                "grade": g,
                "chapter": chapter_label(ch),
                "section": sec["title"],
                "pdfPage": t["pdfPage"],
                "bookPage": pg["bookPage"],
                "key": t["key"],
                "sentence": t["sentence"],
                "first": first,
                "aliases": t.get("aliases", []),
                "mathGarbled": v["mathGarbled"],
                "note": t.get("note", ""),
                "explorer": explorer,
            }
            if not first:
                fg, fp = seen_first[group]
                row["note"] = (row["note"] + " · " if row["note"] else "") + f"처음: {fg} p{fp}"
            kept.append(row)
        # 후보 장부 — 남은 것을 센다.
        cands = candidates(book)
        ledger = []
        for c in cands:
            state, why = covered(c, book, kept, cur.get("drops", []))
            ledger.append({**c, "state": state, "by": why})
            if state == "open":
                problems.append(f"{g} p{c['page']} 미판정 {c['type']}: «{c['text']}»")
        ledgers[g] = ledger
        # 차례 대조 — 소단원별 용어 수.
        zero_verdicts = cur.get("zeroSections", {}).get(g, {})
        toc_rows = []
        for ch in book["chapters"]:
            for s in ch["sections"]:
                n = sum(1 for t in kept if t["chapter"] == chapter_label(ch) and t["section"] == s["title"])
                verdict = zero_verdicts.get(f"{ch['num']}-{s['num']}", "")
                spages = [
                    p
                    for p, pg in book["pages"].items()
                    if pg["concept"] and pg["chapter"] is ch and any(h["num"] == s["num"] for h in pg["heads"])
                ]
                if not spages:
                    problems.append(f"{g} 차례 소단원 {ch['num']}-{s['num']} {s['title']} 의 개념 쪽을 못 찾음")
                if n == 0 and not verdict:
                    problems.append(f"{g} 용어 0개 소단원 판정 없음: {ch['num']}-{s['num']} {s['title']} (쪽 {spages})")
                if n > 0 and verdict:
                    problems.append(f"{g} {ch['num']}-{s['num']} 은 용어 {n}개인데 0개 판정이 남아 있음")
                toc_rows.append(
                    {"chapter": chapter_label(ch), "num": s["num"], "section": s["title"], "terms": n, "verdict": verdict, "pages": spages}
                )
        concept_pages = [p for p, pg in book["pages"].items() if pg["concept"]]
        all_out[g] = {
            "book": book,
            "kept": kept,
            "toc_rows": toc_rows,
            "concept_pages": concept_pages,
        }
    if problems:
        print("🔴 실패 —", len(problems), "건")
        for p in problems:
            print("  ", p)
        dump_ledgers(ledgers, scratch)
        raise SystemExit(1)
    dump_ledgers(ledgers, scratch)
    if args.dry:
        print("검산 통과(--dry: 파일 안 씀)")
        return
    for g in GRADES:
        write_outputs(g, all_out[g], cards, cur, all_out, Path(args.data))
    summary(all_out, ledgers)


def dump_ledgers(ledgers: dict[str, list[dict]], scratch: Path) -> None:
    for g, led in ledgers.items():
        path = scratch / f"elem56-candidates-{g}.json"
        path.write_text(json.dumps(led, ensure_ascii=False, indent=1), encoding="utf-8")


def summary(all_out: dict, ledgers: dict) -> None:
    for g in GRADES:
        kept = all_out[g]["kept"]
        kinds = Counter(t["kind"] for t in kept)
        led = ledgers[g]
        st = Counter((c["type"], c["state"]) for c in led)
        print(
            f"{g}: 용어 {len(kept)} (처음 {sum(t['first'] for t in kept)}) · 갈래 {dict(kinds)} · 수식 깨짐 {sum(t['mathGarbled'] for t in kept)}"
        )
        print(f"     후보 {len(led)} · {dict(sorted(st.items()))}")
        zeros = [r for r in all_out[g]["toc_rows"] if r["terms"] == 0]
        print(f"     소단원 {len(all_out[g]['toc_rows'])} · 용어 0개 {len(zeros)}")


# ───────────────────────── 파일 쓰기 ─────────────────────────


def write_outputs(g: str, data: dict, cards: list[dict], cur: dict, all_out: dict, data_dir: Path) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    book = data["book"]
    kept = data["kept"]
    toc = [
        {"chapter": chapter_label(ch), "sections": [s["title"] for s in ch["sections"]], "pdfPages": ch["pdfPages"]}
        for ch in book["chapters"]
    ]
    head = {
        "source": f"큐브수학 개념 {g} 진도북",
        "file": str(book_path(g)),
        "pages": book["pageCount"],
        "extractedAt": EXTRACTED_AT,
        "extractor": "scripts/qa/concept-terms/extract-terms-elem56.py",
        "toc": toc,
    }
    # 바깥(원문 포함) — 대체 분석이 읽는 전체 JSON.
    full_name = f"cube-{g}.json"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / full_name).write_text(
        json.dumps({**head, "note": "교재 원문(sentence)이 든 전체본 — 저장소에 넣지 않는다", "terms": kept}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    # 저장소 — 문장 대신 sentenceRef 만.
    repo_terms = []
    for t in kept:
        row = {k: v for k, v in t.items() if k != "sentence"}
        row["sentenceRef"] = {"store": "testautocreator-data", "file": f"{DATA_REF}/{full_name}", "key": t["key"]}
        repo_terms.append(row)
    doc = {
        **head,
        "sentenceStore": f"문장(교재 원문)은 저장소 밖 C:\\Creative\\testautocreator-data\\{DATA_REF}\\{full_name} — 용어마다 sentenceRef.key 로 찾는다",
        "terms": repo_terms,
    }
    (OUT_DIR / f"cube-{g}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT_DIR / f"cube-{g}.md").write_text(render_md(g, data, cur), encoding="utf-8")
    (OUT_DIR / f"cube-{g}-explorer.md").write_text(render_explorer(g, data, cards, cur, all_out), encoding="utf-8")


def md_cell(s: str) -> str:
    return s.replace("|", "\\|").replace("\n", " ")


def render_md(g: str, data: dict, cur: dict) -> str:
    kept = data["kept"]
    kinds = Counter(t["kind"] for t in kept)
    out = [
        f"# 큐브수학 개념 {g} 진도북 — 개념 용어",
        "",
        f"원본 `{book_path(g).name}` ({data['book']['pageCount']}쪽) · 추출 {EXTRACTED_AT} · "
        f"스크립트 `scripts/qa/concept-terms/extract-terms-elem56.py` · 판정 `scripts/qa/concept-terms/terms-elem56.json`",
        "",
        f"용어 **{len(kept)}개** (이 트랙 네 권 중 처음 나온 것 {sum(t['first'] for t in kept)}개) · "
        f"수식 깨짐 표시 {sum(t['mathGarbled'] for t in kept)}개 · 개념 쪽 {len(data['concept_pages'])}쪽",
        "",
        "## 갈래별 개수",
        "",
        "| 갈래 | 개수 | 처음 나온 것 |",
        "| --- | ---: | ---: |",
    ]
    for k in KINDS:
        if kinds.get(k):
            out.append(f"| {k} | {kinds[k]} | {sum(1 for t in kept if t['kind'] == k and t['first'])} |")
    out += [
        "",
        "**갈래 기준** — `정의`: «~을 ~라고 합니다 / ~라 하고 / ~한다고 합니다 / ~을 말합니다» 로 뜻을 정한 낱말"
        "(핵심 문장 상자 · 번호 목록 · 여백 도움말 · 제목 말풍선 · 여백 쌍점 «○○: …» 포함) · "
        "`성질`: 교재가 «성질 / 관계»로 이름 붙인 것 · `공식`: «(○○)=…» 꼴(상자·여백) · "
        "`기호`: 새 기호·단위와 쓰고 읽는 법 · `기타`: 위에 안 맞지만 **핵심 문장 상자**에 든 것 — 거의 다 계산 방법(note 에 까닭).",
        "",
        "**«처음» 은 이 트랙 네 권(5-1 → 5-2 → 6-1 → 6-2) 안에서다.** 초3·4 트랙과 합칠 때 리드가 다시 매긴다. "
        "같은 낱말(밑변 · 높이 · 밑면 · 모서리 …)이 도형마다 다시 정의되면 그 자리마다 한 줄이고, 뒤 줄은 «처음» 이 비어 있다.",
        "",
        "후보 발견·판정·검산 방법은 `scripts/qa/concept-terms/extract-terms-elem56.py` 머리말. "
        "**교재 원문 문장은 이 저장소에 없다** — 저장소 밖 `testautocreator-data/I-개념용어/` 의 전체 JSON 에 있고 "
        "여기 JSON 은 `sentenceRef` 로만 가리킨다(시중 교재 원문을 저장소에 넣지 않는다). "
        "그 문장은 글자층에 있는 그대로이며(공백만 무시), 해독 못 한 수식은 자리표시로 두고 «수식 깨짐» 으로 표시했다.",
        "",
    ]
    out += ["## 단원별 용어", ""]
    for ch_label in dict.fromkeys(t["chapter"] for t in kept):
        out += [f"### {ch_label}", "", "| 용어 | 갈래 | 소단원 | 쪽 | 처음 | 비고 |", "| --- | --- | --- | --- | :---: | --- |"]
        for t in kept:
            if t["chapter"] != ch_label:
                continue
            note = t["note"]
            if t["aliases"]:
                note = ("다른 표기 " + " · ".join(t["aliases"]) + (" / " + note if note else ""))
            if t["mathGarbled"]:
                note = ("수식 깨짐 · " + note) if note else "수식 깨짐"
            out.append(
                f"| {md_cell(t['term'])} | {t['kind']} | {md_cell(t['section'])} | {t['bookPage']} | {'○' if t['first'] else ''} | {md_cell(note)} |"
            )
        out.append("")
    out += ["## 차례 대조 — 소단원별 용어 수", "", "| 장 | 소단원 | 용어 | 0개 판정(눈으로 확인) |", "| --- | --- | ---: | --- |"]
    for r in data["toc_rows"]:
        out.append(f"| {md_cell(r['chapter'])} | {r['num']}. {md_cell(r['section'])} | {r['terms']} | {md_cell(r['verdict'])} |")
    amb = [a for a in cur.get("ambiguous", []) if a["grade"] == g]
    out += ["", "## 애매한 것 — 원장님이 가를 것", ""]
    if amb:
        out += ["| 무엇 | 쪽 | 지금 처리 | 물음 |", "| --- | --- | --- | --- |"]
        for a in amb:
            out.append(f"| {md_cell(a['what'])} | {a.get('page', '')} | {md_cell(a['now'])} | {md_cell(a['question'])} |")
    else:
        out.append("없음")
    out.append("")
    return "\n".join(out)


def render_explorer(g: str, data: dict, cards: list[dict], cur: dict, all_out: dict) -> str:
    gn = grade_num(g)
    own_cards = [c for c in cards if c["grade"] == gn]
    kept = data["kept"]
    sib = [x for x in GRADES if grade_num(x) == gn and x != g]
    sib_kept = [t for x in sib for t in all_out[x]["kept"]]
    card_notes = cur.get("cardNotes", {})
    out = [
        f"# 큐브수학 개념 {g} — 탐험 개념 카드 대조",
        "",
        f"탐험 카드 = `src/lib/math-explorers/definition-cards.ts` `definitionCards` 중 학년 {gn}(초{gn}) {len(own_cards)}장.",
        f"초{gn} 카드는 {gn}-1 · {gn}-2 두 권에 걸친다 — 이 권에 없으면 옆 권({', '.join(sib)})을 같이 적었다.",
        "",
        "## 교재 용어 → 탐험 카드",
        "",
    ]
    by_kind = defaultdict(lambda: Counter())
    for t in kept:
        by_kind[t["kind"]][t["explorer"]["match"]] += 1
    out += ["| 갈래 | 용어 | exact | alias | related | none | 탐험에 있는 비율(exact+alias+related) |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    tot = Counter()
    for k in KINDS:
        if k not in by_kind:
            continue
        c = by_kind[k]
        n = sum(c.values())
        hit = c["exact"] + c["alias"] + c["related"]
        tot.update(c)
        out.append(f"| {k} | {n} | {c['exact']} | {c['alias']} | {c['related']} | {c['none']} | {hit}/{n} ({hit / n:.0%}) |")
    n = sum(tot.values())
    hit = tot["exact"] + tot["alias"] + tot["related"]
    out.append(f"| **합** | {n} | {tot['exact']} | {tot['alias']} | {tot['related']} | {tot['none']} | {hit}/{n} ({(hit / n if n else 0):.0%}) |")
    # 같은 낱말이 문맥마다 다시 정의된다(밑면·높이·모서리 …) — 서로 다른 이름으로도 센다.
    names: dict[str, bool] = {}
    for t in kept:
        k = norm(t["term"])
        names[k] = names.get(k, False) or t["explorer"]["match"] != "none"
    dh = sum(names.values())
    out += [
        "",
        f"서로 다른 이름으로 세면 {len(names)}개 중 {dh}개({(dh / len(names) if names else 0):.0%})가 탐험 카드와 짝이 있다"
        " (위 표는 교재가 정의한 자리마다 한 줄 — 같은 낱말이 도형마다 다시 정의되면 여러 줄).",
    ]
    out += ["", "| 용어 | 갈래 | 쪽 | 짝 | 카드 | 까닭 |", "| --- | --- | --- | --- | --- | --- |"]
    for t in kept:
        e = t["explorer"]
        out.append(
            f"| {md_cell(t['term'])} | {t['kind']} | {t['bookPage']} | {e['match']} | {md_cell(e['cardId'] + ' ' + e['cardName']).strip()} | {md_cell(e['why'])} |"
        )
    out += ["", "## 탐험 카드 → 교재", ""]
    rows = []
    in_book = in_sib = in_text_only = 0
    def hits(t: dict, cid: str) -> bool:
        return t["explorer"]["cardId"] == cid or cid in t["explorer"].get("also", [])

    for c in own_cards:
        here = [t for t in kept if hits(t, c["id"])]
        there = [t for t in sib_kept if hits(t, c["id"])]
        cnote = card_notes.get(c["id"], {})
        cn = cnote.get("note", "")
        if here:
            where = "; ".join(f"{t['term']}({t['explorer']['match']}, {t['bookPage']})" for t in here)
            in_book += 1
        elif there:
            where = f"이 권에 없음 — 옆 권: " + "; ".join(f"{t['grade']} {t['term']}({t['explorer']['match']}, {t['bookPage']})" for t in there)
            in_sib += 1
        else:
            if not cnote:
                raise SystemExit(f"{g} 카드 {c['id']}: 두 권 모두 용어가 없는데 cardNotes 판정이 없다")
            where = "용어 없음 — 본문에 내용은 있음" if cnote["inText"] else "교재에 없음"
            if cnote["inText"]:
                in_text_only += 1
        rows.append(f"| {c['id']} | {md_cell(c['name'])} | {md_cell(c['unitTitle'])} | {md_cell(where)} | {md_cell(cn)} |")
    out += [
        f"이 권에 대응 용어가 있는 카드 **{in_book}/{len(own_cards)}** · 옆 권에만 있는 카드 {in_sib} · "
        f"두 권 모두 용어로는 없는 카드 {len(own_cards) - in_book - in_sib}"
        f" (그중 교재 본문에 내용은 있는 것 {in_text_only} — 비고).",
        "",
        "| 카드 | 이름 | 탐험 단원 | 교재 대응 용어 | 비고 |",
        "| --- | --- | --- | --- | --- |",
        *rows,
    ]
    mism = [m for m in cur.get("mismatches", []) if m["grade"] == g]
    out += ["", "## 뜻이 어긋나는 것 (카드 정의 ↔ 교재)", ""]
    if mism:
        out += ["| 카드 | 카드 정의 | 교재 쪽 내용(우리 말 요약 · 쪽) | 어긋남 |", "| --- | --- | --- | --- |"]
        for m in mism:
            card = next(c for c in cards if c["id"] == m["cardId"])
            out.append(f"| {m['cardId']} {md_cell(card['name'])} | {md_cell(card['definition'])} | {md_cell(m['book'])} | {md_cell(m['issue'])} |")
    else:
        out.append("없음")
    out.append("")
    return "\n".join(out)


# ───────────────────────── 캡처 ─────────────────────────


def shots(args: argparse.Namespace) -> None:
    """표본(권마다 개념 쪽 무작위 5장, 씨앗 고정) · 용어 0개 소단원 쪽을 렌더."""
    base = Path(args.scratch) / "concept-terms-shots" / "elem56"
    base.mkdir(parents=True, exist_ok=True)
    rng = random.Random(SAMPLE_SEED)
    plan = {}
    for g in GRADES:
        book = load_book(g)
        concept = [p for p, pg in book["pages"].items() if pg["concept"]]
        sample = sorted(rng.sample(concept, SAMPLE_PER_BOOK))
        plan[g] = {"sample": sample}
        for p in sample:
            book["doc"][p - 1].get_pixmap(dpi=args.dpi).save(base / f"sample-{g}-p{p:03d}.png")
        if args.pages:
            for p in (int(x) for x in args.pages.split(",") if x):
                book["doc"][p - 1].get_pixmap(dpi=args.dpi).save(base / f"page-{g}-p{p:03d}.png")
    (base / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(plan, ensure_ascii=False))


def dump(args: argparse.Namespace) -> None:
    """후보를 판정 없이 늘어놓는다(판정 파일을 쓰기 전 훑기용)."""
    for g in GRADES:
        book = load_book(g)
        print(f"== {g} 차례")
        for ch in book["chapters"]:
            print(f"  {ch['num']}. {ch['title']} {ch['pdfPages']} :: " + " | ".join(f"{s['num']} {s['title']}" for s in ch["sections"]))
        cs = candidates(book)
        print(f"== {g} 후보 {len(cs)} {dict(Counter(c['type'] for c in cs))}")
        for c in cs:
            ch, sec = section_at(book, c["page"], c["y"])
            print(f"  p{c['page']:>3} {c['type']:<7} [{sec['num'] if sec else '?'}] {'G ' if c['garbled'] else ''}{c['text']}")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--cards", required=True)
    b.add_argument("--scratch", required=True)
    b.add_argument("--curation", default="", help="판정 파일 대신 쓸 사본(변이 시험용)")
    b.add_argument("--text", default="", help="바깥 원문 파일 대신 쓸 사본(변이 시험용)")
    b.add_argument("--data", default=str(DATA_DIR), help="원문 포함 전체 JSON 을 쓸 저장소 밖 폴더")
    b.add_argument("--dry", action="store_true", help="검산만 하고 파일을 쓰지 않는다(변이 시험용)")
    s = sub.add_parser("shots")
    s.add_argument("--scratch", required=True)
    s.add_argument("--dpi", type=int, default=100)
    s.add_argument("--pages", default="")
    d = sub.add_parser("dump")
    d.add_argument("--scratch", required=True)
    a = ap.parse_args()
    global CACHE_DIR
    CACHE_DIR = Path(a.scratch) / "elem56-cache"
    {"build": build, "shots": shots, "dump": dump}[a.cmd](a)


if __name__ == "__main__":
    main()
