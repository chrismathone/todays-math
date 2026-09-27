# -*- coding: utf-8 -*-
"""개념원리 중학 1-1 · 1-2 · 2-1 학생용 → 개념 용어 전수(트랙 mida, 2026-09-28).

    python scripts/qa/concept-terms/extract-gaenyeom-terms-mida.py candidates   # 자동 후보와 판정 상태
    python scripts/qa/concept-terms/extract-gaenyeom-terms-mida.py build        # docs/reference/concept-terms/ 에 쓴다
    python scripts/qa/concept-terms/extract-gaenyeom-terms-mida.py shots 1-1 10 30 ...  # 쪽 렌더(눈 검산)

환경변수: GAENYEOM_DIR(로컬 사본 폴더 — 없으면 N 드라이브) · GAENYEOM_CACHE(쪽 읽기 저장본 폴더)
· SHOTS_DIR(렌더 출력) · EXPLORER_CARDS(카드 JSON — 없으면 tsx 로 제품 모듈을 직접 읽는다).

① 무엇을 하나
   1. 개념 쪽에서 **자동 후보**를 모은다 — 붉은 글씨(af473a) · 굵은 고딕 머리 · «용어：뜻» 줄의 머리 ·
      «~(이)라 한다» 앞 낱말 · «~란 무엇인가?» 제목.
   2. `gaenyeom_curation_mida.py` 의 사람 판정과 맞댄다. 후보 하나라도 **판정이 없으면 멈춘다**
      (넣음 · 뺌(까닭) · 애매 셋 중 하나). 넣은 용어의 `find` 조각이 그 쪽 글에 없어도 멈춘다.
   3. 문장은 그 쪽 글자층에서 잘라 온다(지어내지 않는다). 수식 조각을 못 읽으면 `〔수식〕` + mathGarbled.
   4. 목차는 단원 도입 쪽(«이 단원의 내용»)에서, 소단원 쪽 범위는 개념 쪽 초록 큰 제목에서 잡는다.
   5. 탐험 카드(`definition-cards.ts`)와 짝을 짓는다 — 이름 같음(exact) · 교재 이표기(alias) · 수동(related 등).
② 왜 이렇게 하나 — 18 §2: 세는 쪽(후보)과 쓰는 쪽(판정)이 **다른 근거**를 본다. 후보는 글꼴·색·문형에서,
   판정은 사람이 쪽을 읽고. 둘이 어긋나면 멈추니 «못 센 것»이 «없는 것»으로 숨지 않는다.
③ 무엇을 안 바꾸나: N 드라이브·앱 코드·DB 는 건드리지 않는다. 쓰는 곳은 docs/reference/concept-terms/ 뿐.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gaenyeom_pages_mida as P  # noqa: E402
import gaenyeom_curation_mida as C  # noqa: E402

REPO = HERE.parents[2]
OUT = REPO / "docs" / "reference" / "concept-terms"
GRADES = ["1-1", "1-2", "2-1"]
EXPLORER_GRADE = {"1-1": 7, "1-2": 7, "2-1": 8}
NL = P.NL
EXTRACTED_AT = "2026-09-28"

MARKER = re.compile("^[\\s ]*(?:[⑴-⒇]|[①-⑳]|[❶-❿]|\\[)")
LABELS = ("예", "참고", "주의", "설명")
SENT_END = re.compile("(?<=다\\.)\\s+")
TOPIC_Q = re.compile("^(.+?)(?:이)?란 무엇인가\\??$")
RAHANDA = re.compile("([^\\s,.]+(?:\\s[^\\s,.]+)?)\\s?(?:이)?라(?:고)?\\s?(?:한다|하며|하고|부른다)")
COLON = re.compile("^(.{1,40}?)\\s?(?:：| : )")
HANGUL = re.compile("[가-힣]")


def norm(s: str) -> str:
    return "".join(s.replace("：", ":").split())


# ─────────────────────────── 쪽 · 목차 ───────────────────────────

def body_lines(book: P.Book, pno: int) -> list[P.Line]:
    """머리글·쪽수·옆 날개(단원 탭)를 뺀 줄."""
    return [l for l in book.lines[pno - 1] if 45 <= l.y0 <= 755 and l.x0 < 575]


def is_label_line(l: P.Line) -> bool:
    s0 = next((s for s in l.spans if s.text.strip()), None)
    return bool(s0 and s0.color == P.WHITE and s0.text.strip() in LABELS)


def starts_item(l: P.Line) -> bool:
    return bool(MARKER.match(l.text)) or is_label_line(l)


def green_title(book: P.Book, pno: int) -> str:
    return "".join(s.text for l in book.lines[pno - 1] for s in l.spans
                   if s.color == P.TITLE_GREEN and s.size > 20).strip()


def title_key(s: str) -> str:
    s = s.replace("⑴", "(1)").replace("⑵", "(2)").replace("⑶", "(3)")
    return norm(re.sub("^0\\d\\s*", "", s))


def build_toc(book: P.Book) -> list[dict]:
    romans = "ⅠⅡⅢⅣⅤⅥⅦⅧ"
    parts: list[dict] = []
    for i, k in enumerate(book.kinds):
        if "단원" not in k:
            continue
        ls = book.lines[i]
        title = " ".join(l.text.strip() for l in ls if max(s.size for s in l.spans) > 30)
        part = {"part": f"{romans[len(parts)]}. {title}", "introPage": i + 1, "chapters": []}
        for l in ls:
            f = l.spans[0].font
            t = l.text.strip()
            if f.startswith("DINPro-Bold") and re.match("^\\d\\. ", t):
                part["chapters"].append({"chapter": t, "sections": []})
            elif f.startswith("DINPro-Medium") and re.match("^0\\d ", t) and part["chapters"]:
                part["chapters"][-1]["sections"].append({"section": t})
        parts.append(part)
    # 소단원 시작 쪽: 개념 쪽의 초록 큰 제목. 글자층에서 한 글자가 빠진 제목이 있다
    # (1-2 p222 «히스|그램과 도수분포다각형» — «토»가 글자층에 없다) → 가장 닮은 제목으로 잇고 0.8 밑이면 멈춘다.
    from difflib import SequenceMatcher

    starts: dict[str, int] = {}
    for pno in book.concept:
        gt = green_title(book, pno).strip(" ,")
        if gt:
            starts.setdefault(title_key(gt), pno)
    flat = [s for p in parts for c in p["chapters"] for s in c["sections"]]
    missing = []
    for s in flat:
        k = title_key(s["section"])
        best = max(starts, key=lambda x: SequenceMatcher(None, x, k).ratio())
        if SequenceMatcher(None, best, k).ratio() < 0.8:
            missing.append(s["section"])
            continue
        s["start"] = starts[best]
    if missing:
        raise SystemExit(f"[{book.grade}] 소단원 시작 쪽을 못 찾음: {missing}")
    if len({s["start"] for s in flat}) != len(flat):
        raise SystemExit(f"[{book.grade}] 두 소단원이 같은 시작 쪽으로 이어졌다")
    # 중단원 «공부한 날» 계획 쪽과 대단원 도입 쪽은 앞 소단원 범위에 넣지 않는다
    intro_pages = [p["introPage"] for p in parts] + [
        i + 1 for i, ls in enumerate(book.lines) if any("공부한 날" in l.text for l in ls)]
    order = sorted(flat, key=lambda s: s["start"])
    for j, s in enumerate(order):
        nxt = order[j + 1]["start"] if j + 1 < len(order) else book.pages + 1
        # 다음 대단원 도입 쪽이 사이에 있으면 거기서 끊는다
        cut = min([ip for ip in intro_pages if s["start"] < ip < nxt] or [nxt])
        s["end"] = cut - 1
    for p in parts:
        for c in p["chapters"]:
            c["pdfPages"] = [c["sections"][0]["start"], c["sections"][-1]["end"]]
    return parts


def locate(parts: list[dict], pno: int) -> tuple[str, str, str]:
    for p in parts:
        for c in p["chapters"]:
            for s in c["sections"]:
                if s["start"] <= pno <= s["end"]:
                    return p["part"], c["chapter"], s["section"]
    return "", "", ""


# ─────────────────────────── 자동 후보 ───────────────────────────

INK = 0x231F20  # 본문 먹색


def is_bold(s: P.Span) -> bool:
    """굵은 고딕 **먹색** — 붉은 글씨(정의 강조)와 흰 딱지·회색 아이콘은 뺀다."""
    return s.font.startswith(P.BOLD_FONT) and s.color == INK and not s.math


def candidates(book: P.Book) -> list[dict]:
    out = []

    def add(pno, rule, text, line):
        text = text.strip(" \t\u2003,.:：")
        text = re.sub(r"^[⑴-⒇①-⑳❶-❿]\s*", "", text).strip()
        text = re.sub(r"^\d\.\s*", "", text)        # 보충 학습의 «1. 다면체의 분류»
        text = re.sub(r"\s*[⑴-⒇]$", "", text).strip()  # «지수법칙 ⑴»
        if text:
            out.append({"page": pno, "rule": rule, "text": text, "key": norm(text), "line": line.text.strip()})

    for pno in book.concept:
        for l in body_lines(book, pno):
            spans = l.spans
            side = all(s.color == P.PURPLE for s in spans if s.text.strip())  # 보라 말풍선
            # R1 붉은 글씨 — 이웃한 붉은 조각은 잇는다(«x»«축», «제 »«1»« 사분면»).
            #    쉼표·빈칸 한 조각을 사이에 둔 붉은 조각도 잇는다(«두 점 A», «,», «B 사이의 거리»).
            buf = []
            for k, s in enumerate(spans + [None]):
                if s is not None and s.red:
                    buf.append(s.text)
                    continue
                if (s is not None and buf and len(s.text) <= 3 and not s.text.strip(" ,")
                        and k + 1 < len(spans) and spans[k + 1].red):
                    buf.append(s.text)
                    continue
                if buf:
                    add(pno, "red", "".join(buf), l)
                    buf = []
            # R5 «~란 무엇인가?» 제목
            if spans[0].font.startswith(P.TOPIC_FONT):
                m = TOPIC_Q.match(l.text.strip())
                if m:
                    add(pno, "topic", m.group(1), l)
                continue
            if side:
                continue
            # R2 «용어：뜻» 줄의 머리 — 머리가 한글로 시작해야 한다(«A의 약수», «12의 약수», «㉠의 해»는 예시)
            txt = l.text
            if not is_label_line(l):
                m = COLON.match(re.sub(r"^[\s\u2003]*[⑴-⒇①-⑳]\s*", "", txt))
                if m and HANGUL.match(m.group(1).strip()) and not re.search("[=×÷()|]", m.group(1)):
                    add(pno, "colon", m.group(1), l)
            # R3 굵은 고딕 머리 — 첫 굵은 조각(바로 앞 수식 조각 포함)부터 마지막 굵은 조각까지
            idx = [i for i, s in enumerate(spans) if is_bold(s) and s.text.strip()
                   and "핵심문제" not in s.text and not re.fullmatch(r"[\s\d,~]+", s.text)]
            if idx:
                j0 = idx[0]
                while j0 > 0 and spans[j0 - 1].math:
                    j0 -= 1
                j1 = idx[-1]
                # 굵은 머리 바로 뒤의 수식·붉은 조각까지 잇는다(«덧셈의 »«교환법칙», «x»«에 대한 »«방정식»)
                while (j1 + 1 < len(spans) and (spans[j1 + 1].math or spans[j1 + 1].red)
                       and not re.match("^[：:]", spans[j1 + 1].text)):
                    j1 += 1
                head = "".join(s.text for s in spans[j0: j1 + 1])
                head = re.split("：| : ", head)[0]
                add(pno, "bold", head, l)
            # R4 «~(이)라 한다» 앞 낱말
            for m in RAHANDA.finditer(txt):
                add(pno, "rahanda", m.group(1), l)
    return out


def known_keys(grade: str) -> dict[str, str]:
    """후보 글(정규화) → 판정. 넣음(모든 권의 용어·이표기·covers) · 뺌 · 애매."""
    keys: dict[str, str] = {}
    for g in [grade] + [x for x in GRADES if x != grade]:  # 이 권의 판정이 먼저
        for t in C.TERMS[g]:
            for k in (t.term, *t.aliases, *t.covers):
                keys.setdefault(norm(k), "넣음" if g == grade else f"넣음({g})")
    for k, why in C.REJECT.items():
        keys.setdefault(norm(k), "뺌: " + why)
    for g in GRADES:
        for _, text, _ in C.AMBIGUOUS.get(g, []):
            for part in re.split(" · ", text):
                keys.setdefault(norm(part), "애매")
    for k in C.AMBIGUOUS_COVERS:
        keys.setdefault(norm(k), "애매")
    return keys


POINT_NAME = re.compile(r"^(?:[A-Za-z]{1,3}|⋯|〔수식〕)$")


def judge(grade: str, cands: list[dict]) -> list[dict]:
    keys = known_keys(grade)
    included = [k for k, v in keys.items() if v.startswith("넣음")]
    for c in cands:
        k = c["key"]
        verdict = keys.get(k)
        if verdict is None and c["rule"] in ("topic", "bold", "colon", "red"):
            # «소수와 합성수», «동류항의 덧셈, 뺄셈» — 조각마다 판정이 있으면 그 판정들로 본다
            pieces = [norm(x) for x in re.split(r"(?:와|과)\s|,\s", c["text"]) if x.strip()]
            if len(pieces) > 1 and all(p in keys for p in pieces):
                verdict = "조각: " + " / ".join(keys[p].split(":")[0] for p in pieces)
        if verdict is None and c["rule"] == "rahanda":
            # «~(이)라 한다» 앞 낱말 둘. 받침 뒤 «이라»의 «이»가 붙어 온다 — 떼고도 맞춰 본다.
            text = c["text"]
            variants = [text] + ([text[:-1]] if text.endswith("이") else [])
            for v in variants:
                words = v.split()
                if not words:
                    verdict = "뺌: «~라 한다» 앞이 비었다(줄바꿈 조각)"
                    break
                last = words[-1]
                if POINT_NAME.match(last):
                    verdict = "뺌: 점·도형 이름 붙이기 또는 나열(«교점을 C라 한다», «⋯라 한다»)"
                    break
                full, nl = norm(v), norm(last)
                if full in keys:  # 앞 낱말 둘 그대로
                    verdict = keys[full]
                    break
                # 넣은 용어의 꼬리와 맞는가(«도형의 기본 요소», «삼각|형의 6요소», «두 점 A, B 사이의 거리»)
                hit = [kk for kk in included for x in (full, nl) if len(x) >= 3 and kk.endswith(x)]
                if hit:
                    verdict = f"넣음(~{hit[0]})"
                    break
                # 끝 낱말이 넣은 용어 그 자체(«직선을 수직선»). 뺀 목록과는 끝 낱말로 맞추지 않는다 —
                # «사이의 거리»가 활용 제목 «거리»로 빠진 것처럼 까닭이 틀어진다.
                if nl in keys and keys[nl].startswith("넣음"):
                    verdict = keys[nl]
                    break
        c["verdict"] = verdict or "미판정"
    return cands


# ─────────────────────────── 문장 ───────────────────────────

def page_text(book: P.Book, pno: int) -> str:
    """본문 글(오른쪽 그림 글자 x0≥430 은 뺀다 — 그림 이름이 문장 사이에 끼어든다, 1-1 p177 «제1사분면» 그림)."""
    return " ".join(l.text for l in body_lines(book, pno) if l.x0 < 430)


def quote_found(lines: list[P.Line], quote: str) -> bool:
    """quote 가 쪽의 줄들을 **차례대로** 이어 붙여 나오는가. 사이에 낀 그림 글자 줄(«b», «제1사분면»)은 건너뛴다.

    첫 줄은 중간부터(«⑴ » 뒤) 시작해도 된다. 조각은 모두 그 쪽 글에서 와야 한다 — 지어낸 문장은 못 지난다.
    """
    q = norm(quote)
    # 그림 글자(오른쪽·한두 글자)는 본문 줄이 아니다 — «l» 한 글자가 «l∥m이면»의 앞머리를 먹었다(1-2 p46).
    L = [norm(l.text) for l in lines if l.x0 < 430 and len(norm(l.text)) >= 2]
    for i, t in enumerate(L):
        for off in range(len(t)):
            suf = t[off:]
            if suf.startswith(q):
                return True
            if not q.startswith(suf):
                continue
            rest, j = q[len(suf):], i + 1
            while rest and j < len(L):
                if L[j] and rest.startswith(L[j]):
                    rest = rest[len(L[j]):]
                elif L[j] and L[j].startswith(rest):
                    rest = ""
                j += 1
            if not rest:
                return True
    return False


def find_line(lines: list[P.Line], needle: str) -> int:
    n = norm(needle)
    for i, l in enumerate(lines):
        if n in norm(l.text):
            return i
    # 두 줄에 걸친 조각
    for i in range(len(lines) - 1):
        if n in norm(lines[i].text + lines[i + 1].text):
            return i
    return -1


GAP = 28  # 줄 사이 허용 — 보통 16pt, 분수가 낀 줄은 24~26pt(1-1 p208 반비례 정의)


def near_below(lines: list[P.Line], i: int, x0: float) -> int:
    """i 줄 바로 아래 본문 줄(옆 그림 글자는 건너뛴다)."""
    for j in range(i + 1, min(i + 8, len(lines))):
        l = lines[j]
        if l.y0 - lines[i].y0 > GAP:
            return -1
        if l.x0 > 430 or l.x0 > x0 + 60:
            continue
        return j
    return -1


def is_topic(l: P.Line) -> bool:
    """문장이 아닌 머리 줄: 소주제 제목(먹색 고딕14) · 흰 번호 딱지 · «개념원리 이해» 딱지(OTOmniGothic)
    · «보충 학습» 딱지(Tenada). «개념원리 이해»를 문장 머리로 삼킨 적이 있다(1-2 p60 «작도»)."""
    s0 = next((s for s in l.spans if s.text.strip()), l.spans[0])
    return ((s0.font.startswith(P.TOPIC_FONT) and s0.color == INK)
            or (s0.color == P.WHITE and s0.text.strip().isdigit())
            or s0.font.startswith(("OTOmniGothic", "Tenada")))


def is_heading(l: P.Line) -> bool:
    """«⑴ 양의 부호와 음의 부호»처럼 굵은 머리만 있는 줄(«：» 뜻이 없다)."""
    body = [s for s in l.spans if s.text.strip() and s.color != P.WHITE
            and not re.fullmatch(r"[⑴-⒇①-⑳\s]+", s.text.strip())]
    return bool(body) and "：" not in l.text and all(is_bold(s) or s.math or s.red for s in body) and any(is_bold(s) for s in body)


def join_lines(texts: list[str]) -> str:
    """줄을 잇는다. 이 책은 낱말 가운데서도 줄을 바꾼다(«부|호», «서|로소») — 줄 끝(또는 다음 줄 앞)에
    빈칸이 있을 때만 띄운다. 실측: 낱말 경계에서 바뀐 줄은 끝에 빈칸이 남아 있다(1-1 p50 «0으로 |두고»)."""
    out = ""
    for t in texts:
        if not out:
            out = t.lstrip()
        elif out[-1].isspace() or t[:1].isspace():
            out = out.rstrip() + " " + t.lstrip()
        else:
            out = out + t.lstrip()
    return out.strip()


def sentence_for(book: P.Book, t: C.T) -> tuple[str, bool]:
    lines = body_lines(book, t.page)
    if t.quote:
        if not quote_found(lines, t.quote):
            raise SystemExit(f"[{book.grade} p{t.page}] quote 가 그 쪽 글에 없다: {t.term} / {t.quote}")
        return t.quote, "〔수식〕" in t.quote
    i = find_line(lines, t.find or t.term)
    if i < 0:
        raise SystemExit(f"[{book.grade} p{t.page}] find 를 못 찾음: {t.term} / {t.find}")
    start = i
    # 뒤로: 이 줄이 항목 머리가 아니면 위 줄이 «다.»로 끝나지 않는 동안 올라간다(제목·굵은 머리 줄에서 멈춤).
    # 빈칸으로 시작하는 줄은 화살표 딸린 덧붙임(« 줄기는 세로선의 왼쪽…») — 위로 잇지 않는다.
    for _ in range(0 if lines[i].text[:1] == " " else 3):
        l = lines[start]
        if starts_item(l):
            break
        k = start - 1
        while k >= 0 and (lines[k].x0 > 430 or lines[k].x0 > l.x0 + 60):
            k -= 1
        if k < 0 or l.y0 - lines[k].y0 > GAP or lines[k].text.rstrip().endswith("다."):
            break
        if is_topic(lines[k]) or is_heading(lines[k]):
            break
        start = k
    parts = [lines[start].text]
    x0 = lines[start].x0
    cur = start
    while cur < i:  # 찾은 줄까지는 반드시 잇는다
        j = near_below(lines, cur, x0)
        if j < 0 or j > i:
            break
        parts.append(lines[j].text)
        cur = j
    for _ in range(4):
        acc = join_lines(parts).rstrip()
        if acc.endswith("다."):  # «평행하다|고 하고» — 마침표 없는 «다»는 끝이 아니다(1-2 p40)
            break
        j = near_below(lines, cur, x0)
        if j < 0:
            break
        nl = lines[j]
        if (starts_item(nl) or is_topic(nl) or is_heading(nl) or nl.text[:1].isspace()
                or nl.spans[0].color == P.PURPLE):
            break
        parts.append(nl.text)
        cur = j
    head_label = next((sp.text.strip() for sp in lines[start].spans if sp.text.strip()), "")
    labeled = is_label_line(lines[start])
    para = join_lines(parts)
    para = re.sub("[	 ]+", " ", para)
    for _ in range(2):  # 딱지(«참고») 뒤에 원 번호(«①»)가 또 온다
        para = re.sub(r"^\s*(?:[⑴-⒇①-⑳❶-❿])\s*", "", para)
        if labeled and para.startswith(head_label):  # 흰 딱지(«예»·«참고»)만 뗀다 — «예각：»의 «예»는 글자다
            para, labeled = para[len(head_label):], False
    para = re.sub(r"\s{2,}", " ", para).strip()
    sents = SENT_END.split(para)
    n = norm(t.find or t.term)
    pick = next((s for s in sents if n in norm(s)), para)
    return pick.strip(), "〔수식〕" in pick


# ─────────────────────────── 탐험 카드 ───────────────────────────

def load_cards() -> list[dict]:
    path = os.environ.get("EXPLORER_CARDS")
    if path:
        units = json.loads(Path(path).read_text(encoding="utf-8"))
    else:
        cli = REPO / "node_modules" / "tsx" / "dist" / "cli.mjs"
        r = subprocess.run(["node", str(cli), str(HERE / "dump-explorer-cards-mida.ts"), "3", "4", "5", "6", "7", "8", "9"],
                           cwd=REPO, capture_output=True, text=True, encoding="utf-8")
        if r.returncode:
            raise SystemExit("카드 덤프 실패: " + r.stderr[-400:])
        units = json.loads(r.stdout)
    cards = []
    for u in units:
        for c in u["cards"]:
            cards.append({**c, "grade": u["grade"], "unit": u["id"], "unitTitle": u["title"]})
    return cards


def match_explorer(grade: str, t: C.T, cards: list[dict]) -> dict:
    ov = C.EXPLORER.get((grade, t.term))
    by_id = {c["id"]: c for c in cards}
    if ov:
        m, cid, why = ov
        if m == "none":  # 동음이의 — 이름은 같지만 짝이 아니다
            return {"match": "none", "cardId": "", "cardName": "", "why": f"{why} (`{cid}`)"}
        return {"match": m, "cardId": cid, "cardName": by_id[cid]["name"], "cardGrade": by_id[cid]["grade"], "why": why}
    name = norm(t.term)
    for c in cards:
        if norm(c["name"]) == name:
            return {"match": "exact", "cardId": c["id"], "cardName": c["name"], "cardGrade": c["grade"], "why": ""}
    for a in t.aliases:
        for c in cards:
            if norm(c["name"]) == norm(a):
                return {"match": "alias", "cardId": c["id"], "cardName": c["name"], "cardGrade": c["grade"],
                        "why": f"교재 이표기 «{a}»"}
    return {"match": "none", "cardId": "", "cardName": "", "why": ""}


# ─────────────────────────── 조립 ───────────────────────────

def build_all(write: bool = True) -> dict:
    C.load_anchors()  # 교재 글(find·quote·covers·REJECT)은 저장소 밖에 있다
    books = {g: P.load_book(g) for g in GRADES}
    cards = load_cards()
    seen: set[str] = set()
    result = {}
    problems = []
    for g in GRADES:
        book = books[g]
        parts = build_toc(book)
        cands = judge(g, candidates(book))
        undecided = [c for c in cands if c["verdict"] == "미판정"]
        if undecided:
            problems += [f"[{g} p{c['page']}] 미판정 후보 ({c['rule']}): {c['text']!r} — {c['line'][:60]}" for c in undecided]
        terms = []
        kept = []
        for key, t in C.term_keys(g):
            if t.page not in book.concept:
                problems.append(f"[{g} p{t.page}] 개념 쪽이 아니다: {t.term}")
                continue
            sent, garbled = sentence_for(book, t)
            garbled = garbled or t.formula_unread
            part, chap, sec = locate(parts, t.page)
            keyset = {norm(t.term), *map(norm, t.aliases)}
            first = not (keyset & seen)
            seen |= keyset
            label = P.book_page_label(book.lines[t.page - 1])
            kept.append(t)
            terms.append({
                "term": t.term, "kind": t.kind, "grade": g, "part": part, "chapter": chap, "section": sec,
                "pdfPage": t.page, "bookPage": f"{int(label):03d}쪽" if label else "", "key": key,
                "sentence": sent, "first": first, "aliases": list(t.aliases), "mathGarbled": garbled,
                "ambiguous": t.ambiguous, "note": t.note, "explorer": match_explorer(g, t, cards),
            })
        toc = [{"part": p["part"], "chapter": c["chapter"], "sections": [s["section"] for s in c["sections"]],
                "pdfPages": c["pdfPages"], "sectionPages": {s["section"]: [s["start"], s["end"]] for s in c["sections"]}}
               for p in parts for c in p["chapters"]]
        # 자동 후보가 못 집은 넣은 용어 — 사람이 쪽을 읽고 넣은 것(후보 규칙의 사각지대)
        manual = []
        for t, d in zip(kept, terms):
            ks = {norm(x) for x in (t.term, *t.aliases, *t.covers)}
            hit = any(c["page"] == t.page and (c["key"] in ks or any(len(k) >= 2 and c["key"].endswith(k) for k in ks))
                      for c in cands)
            if not hit:
                manual.append(d)
        result[g] = {"book": book, "toc": toc, "terms": terms, "cands": cands, "parts": parts, "manual": manual}
    if problems:
        print(NL.join(problems))
        raise SystemExit(f"멈춤: 문제 {len(problems)}건")
    result["_cards"] = cards
    return result


def cmd_candidates() -> None:
    C.load_anchors()
    books = {g: P.load_book(g) for g in GRADES}
    for g in GRADES:
        cands = judge(g, candidates(books[g]))
        cnt = Counter(c["verdict"].split(":")[0].split("(")[0] for c in cands)
        print(f"##### {g} 후보 {len(cands)} — {dict(cnt)}")
        for c in cands:
            if c["verdict"] == "미판정":
                print(f"  미판정 p{c['page']:3} {c['rule']:7} {c['text']!r:40} | {c['line'][:70]}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "candidates":
        cmd_candidates()
    elif cmd == "build":
        import write_gaenyeom_outputs_mida as W  # noqa: E402

        W.write(build_all(), OUT)
    elif cmd == "shots":
        import pymupdf

        g = sys.argv[2]
        out = Path(os.environ.get("SHOTS_DIR") or ".") / g
        out.mkdir(parents=True, exist_ok=True)
        doc = pymupdf.open(P.BOOKS[g])
        for p in map(int, sys.argv[3:]):
            doc[p - 1].get_pixmap(dpi=110).save(out / f"{g}-p{p:03d}.png")
            print(out / f"{g}-p{p:03d}.png")
    else:
        raise SystemExit(__doc__)
