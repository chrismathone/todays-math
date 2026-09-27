# -*- coding: utf-8 -*-
"""개념원리 중학 2-2 · 3-1 · 3-2 개념 용어 JSON · 요약 · 탐험 카드 대조를 만든다 — 트랙 midb.

    python scripts/qa/concept-terms/build-gaenyeom-terms-midb.py            # 세 권 모두
    python scripts/qa/concept-terms/build-gaenyeom-terms-midb.py --check    # 쓰지 않고 검산만

① 무엇을 하나
   · `terms-midb.tsv`(사람이 개념 쪽을 읽고 고른 용어)의 **앵커를 그 쪽 글자층에서 다시 찾아**
     문장 · 책 쪽 · 대단원/중단원/소단원 · 수식 깨짐을 채운다. 앵커를 못 찾으면 **멈춘다** —
     목록에 적었다고 들어가지 않는다(지면에 없는 용어가 나갈 수 없다).
   · 목차 대조: 본문 목차(p9~10)의 중단원 · 대단원 소개 쪽의 소단원 목록을 읽어, 소단원마다
     용어가 몇 개인지 센다. 0개인 소단원은 따로 적는다(보고서에서 눈으로 가른다).
   · **발견기**(목록에 안 기대는 후보): 개념 쪽의 적갈색 글 · 굵은 표제 · «X：뜻» 줄 · «~(이)라 한다»
     · 질문 제목 · 이름 꼴 자주색 곁말 · 노란 형광(그림 사각형), 그리고 **전 쪽**의 «~(이)라 한다».
     후보마다 목록의 용어나 버린 목록(까닭)에 걸려야 한다 — 안 걸린 것이 «못 찾은 것» 후보다.
     버린 목록의 줄이 아무 후보에도 안 걸리면 «죽은 줄»로 멈춘다. 발견기의 눈은 `mutate-gaenyeom-terms-midb.py` 가 잰다.
   · 탐험 카드 짝: `explorer-midb.tsv` 의 짝을 붙이고, 카드 쪽에서 거꾸로 센다.
② 왜 이렇게 하나 — 세는 쪽(발견기)과 고르는 쪽(목록)이 같은 손 목록을 보면 같이 눈이 먼다(20 · 2026-08-18).
   발견기는 목록을 모르고 지면 서식만 본다.
③ 안 바꾸는 것 — N 드라이브 읽기만. `src/**` 읽기만(카드는 제품 모듈을 불러 꺼낸다).
   🔴 시중 교재 원문은 저장소 밖(원장님 2026-09-28): 목록(`terms-midb.tsv` — 앵커 · cite)과 버린 목록은
   `DATA/midb/` 에서 읽고, 문장이 든 전체 JSON · 사람용 전체 요약은 `DATA/` · `DATA/midb/` 에 쓴다.
   저장소에는 `docs/reference/concept-terms/gaenyeom-<학년>{.json,.md,-explorer.md}` — 이름 · 갈래 · 쪽 · 단원 이름 ·
   탐험 짝 · 우리 말 비고 · `sentenceRef` 만. 새지 않았는지는 `audit-gaenyeom-leak-midb.py` 가 잰다.
"""
from __future__ import annotations

import collections
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(HERE))
import gaenyeom_midb as G  # noqa: E402

#: 🔴 시중 교재 **원문은 저장소 밖**(원장님 2026-09-28). 앵커·교재 인용이 든 목록과 문장이 든 전체 JSON 은
#: 여기에만 둔다. 저장소에는 이름·갈래·쪽·단원 이름·탐험 짝·우리 말 비고와 `sentenceRef` 만 나간다.
DATA = Path(os.environ.get("CONCEPT_TERMS_DATA", r"C:\Creative\testautocreator-data\I-개념용어"))
TRACK = DATA / "midb"
TERMS = TRACK / "terms-midb.tsv"
REJECTS = TRACK / "rejects-midb.tsv"
EXPLORER = HERE / "explorer-midb.tsv"  # 우리 말만(카드 id · 짝 · 까닭) — 저장소에 둔다
OUT = REPO / "docs" / "reference" / "concept-terms"
EXTRACTED_AT = "2026-09-28"
KINDS = ["정의", "성질", "정리", "공식", "법칙", "기호", "기타"]
SOURCE = {g: f"개념원리 중학 수학 {g} (학생용)" for g in G.GRADES}
#: 학년 → 탐험 학년(중2=8 · 중3=9)
EXPLORER_GRADE = {"2-2": 8, "3-1": 9, "3-2": 9}
#: 탐험 단원 → 이 트랙의 권. 다른 권(2-1) 단원은 «다른 트랙 소관»으로 적는다.
UNIT_BOOK = {
    "g8-shapes": "2-2", "g8-similarity": "2-2", "g8-probability": "2-2",
    "g9-real": "3-1", "g9-polynomial": "3-1", "g9-equation": "3-1", "g9-function": "3-1",
    "g9-trigonometry": "3-2", "g9-circle": "3-2", "g9-statistics": "3-2",
}
MATCHES = ("exact", "alias", "related", "none")
#: 본문 글씨 크기 아래 — 그림 속 글자 · 곁말 · «핵심문제» 칩(실측 7.0~8.0pt, 본문 9.3~10.5pt).
SMALL = 8.6
#: 문장 줄 기준선과 쌓인 분수 조각 기준선의 차이 상한(pt).
STACK_BASE = 9.0

# 줄 앞 표지 — 여기서 새 문단이 선다.
MARK = re.compile(r"^(\[|[⑴-⒇]|[①-⑳]|[❶-❿]|[㉠-㉭]|∴|\d{2}\s)")
END = re.compile(r"(?<=다\.)\s+|(?<=[.?])\s+(?=[\[⑴-⒇①-⑳❶-❿])")
LEAD = re.compile(r"^\s*(\[[^\]]{1,4}\]\s*)?([⑴-⒇]|[①-⑳]|[❶-❿])?\s*")


def sq(s: str) -> str:
    return re.sub(r"\s+", "", s)


def read_tsv(path: Path, ncol: int) -> list[list[str]]:
    rows = []
    if not path.exists():
        return rows
    for n, raw in enumerate(path.read_text(encoding="utf-8").split("\n"), 1):
        if not raw.strip() or raw.startswith("#"):
            continue
        c = raw.split("\t")
        if len(c) > ncol:
            raise SystemExit(f"{path.name}:{n} 칸이 {len(c)}개 (최대 {ncol})")
        rows.append([x.strip() for x in c] + [""] * (ncol - len(c)) + [str(n)])
    return rows


# ── 쪽 글 흐름 ─────────────────────────────────────────────────────────────────
def keep(ln, full: bool = False) -> bool:
    b = (ln.text if full else ln.body).strip()
    if not b or ln.x >= 555:  # 오른쪽 끝 단원 띠(«I -1»)
        return False
    vis = [s for s in ln.spans if s.text.strip()]
    if not full and vis and max(s.size for s in vis) < SMALL:  # 그림 속 글자 · 곁말(본문은 9.3~10.5pt)
        return False
    # 오른쪽 그림 자리의 식 라벨(3-1 p87 «(x+3)(x+5)»)은 뺀다. 단 **분수선이 걸린 조각**은 라벨이 아니라
    # 본문 분수의 분자·분모다 — 빼면 원주각과 중심각 문장의 ½ 이 **말없이** 빠졌다(3-2 p87 실측).
    if ln.x >= G.FIGURE_X and is_display(b) and not any(sp.stacked for sp in ln.spans):
        return False
    if re.match(r"^핵심문제\s*\d", b):
        return False
    return True


#: 식만 있는 줄(«$\overline{AB}=\overline{AC}$» · «$\angle B$, $\angle C$»)을 가른다 — `$…$` 를 걷으면 이것들만 남는다.
DISPLAY_REST = re.compile(r"^[\s,.:：()∥⊥=]*$")
#: 식 줄 다음에 이런 말로 이어지면 문장이 식을 건너 이어진다(2-2 p175 피타고라스 정리 문장 — 식 줄 뒤 조사로 이어짐).
PARTICLE = re.compile(r"^(이|가|을|를|은|는|의|로|으로|와|과|에서|에|일|이면|이므로|라|이라|이고|이다)(\s|$|[^가-힣])")


def is_display(b: str) -> bool:
    return "$" in b and bool(DISPLAY_REST.match(re.sub(r"\$[^$]*\$", "", b)))


def is_header(ln) -> bool:
    """굵은 고딕·적갈색 표제만 있는 줄(«⑵ 직사각형의 성질» · «⑴ 제곱근»). 표지 글자는 빼고 본다."""
    words = [s for s in ln.spans if s.text.strip() and not s.math]
    words = [s for s in words if not re.fullmatch(r"\s*([⑴-⒇]|[①-⑳]|[❶-❿])\s*", G.JUNK.sub("", s.text))]
    return bool(words) and all(s.style in ("bold", "red") for s in words)


#: 본문 글씨와 덧말 글씨의 경계(pt). 본문 명조 10.2 · 정의 표제 고딕 9.7 · 덧말·증명·예 고딕 9.3(2-2 p13 실측).
BODY_PT = 9.9


def bucket(ln) -> str | None:
    """줄의 주된 글씨 — 한글 글자 수로 무게를 단다. 한글이 없으면(식만) None."""
    w = collections.Counter()
    for sp in ln.spans:
        if sp.math or sp.style in ("chip", "purple"):
            continue
        n = len(re.findall(r"[가-힣]", sp.text))
        if n:
            w["main" if sp.size >= BODY_PT or sp.style in ("bold", "red") else "small"] += n
    return w.most_common(1)[0][0] if w else None


def stream(page, full: bool = False) -> tuple[str, list[tuple[int, int, object]]]:
    """쪽을 한 줄기 글로. 이어지는 줄은 붙이고, 표지로 시작하는 줄은 새 문단(\n).

    full=False 는 자주색 곁말을 뺀 본문(문장용), True 는 곁말까지(곁말 속 용어를 찾을 때).
    새 문단: 표지(⑴ ① [예] …)로 시작 · 앞 줄이 질문 제목/굵은 표제만 · 식만 있는 줄의 앞뒤
    (단 식 줄 다음이 조사로 이어지면 한 문장이다).
    """
    pick = (lambda ln: ln.text) if full else (lambda ln: ln.body)
    kept = [ln for ln in page.lines if keep(ln, full)]
    text, segs = "", []
    for k, ln in enumerate(kept):
        b = pick(ln).strip()
        if k:
            prev = kept[k - 1]
            pb = pick(prev).strip()
            nxt = pick(kept[k + 1]).strip() if k + 1 < len(kept) else ""
            if (MARK.match(b) or pb.endswith("?") or "head" in prev.styles or "head" in ln.styles
                    or is_header(prev) or is_header(ln) or re.fullmatch(r"\[\d\]", pb)):
                sep = "\n"
            elif bucket(prev) and bucket(ln) and bucket(prev) != bucket(ln):
                sep = "\n"  # 본문(명조 10.2)과 덧말(고딕 9.3)이 바뀌었다 — 아이콘 달린 덧말 줄
            elif is_display(b) and not PARTICLE.match(nxt):
                sep = "\n"  # 식만 있는 줄이 문장을 닫는다(뒤가 조사로 안 이어짐)
            elif is_display(pb) and not PARTICLE.match(b):
                sep = "\n"
            elif prev.trail:
                sep = " "
            elif re.search(r"[가-힣]$", pb) and re.match(r"^[가-힣]", b):
                sep = ""  # 낱말 가운데서 줄이 바뀌었다(«읽/는다»)
            else:
                sep = " "
            text += sep
        start = len(text)
        text += b
        segs.append((start, len(text), ln))
    return text, segs


def near_stack(page, lines) -> bool:
    """문장 줄 곁에 쌓인 분수 조각이 있나. 분자·분모는 제 줄로 떨어져 나가 문장 줄에 안 든다 —
    원주각과 중심각 문장의 ½ 이 문장 밖 줄이라 깨짐 표시 없이 빠진 채 나갔다(3-2 p87 실측)."""
    spans = [sp for ln in lines for sp in ln.spans if sp.text.strip()]
    if not spans:
        return False
    # 분자·분모의 기준선은 본문 기준선에서 ±6pt 안팎이다(p87: 본문 233 · 분자 227 · 분모 239).
    # 상자로 겹침을 보면 윗줄 분모에 걸린다(3-2 p19 «sin²A» · p13 «삼각비» 거짓 경보) — 기준선으로 본다.
    bases = {round(sp.base, 1) for sp in spans}
    x0 = min(sp.x0 for sp in spans) - 5
    x1 = max(sp.x1 for sp in spans) + 60
    return any(
        sp.stacked and x0 <= sp.x0 <= x1 and any(abs(sp.base - b) <= STACK_BASE for b in bases)
        for ln in page.lines for sp in ln.spans
    )


def purple_note(page, anchor: str) -> tuple[str, list] | None:
    """자주색 곁말에서 앵커를 찾으면 그 곁말 덩이(세로로 이어진 곁말 줄들)를 돌려준다."""
    rows = [ln for ln in page.lines if "purple" in ln.styles]
    groups: list[list] = []
    for ln in rows:
        if groups and abs(ln.y - groups[-1][-1].y) <= 14 and abs(ln.x - groups[-1][-1].x) <= 40:
            groups[-1].append(ln)
        else:
            groups.append([ln])
    for grp in groups:
        t = " ".join("".join(G.JUNK.sub("", s.text) for s in ln.spans if s.style == "purple").strip() for ln in grp)
        if find(t, anchor) >= 0:
            return re.sub(r"\s+", " ", t).strip(" ."), grp
    return None


def find(text: str, anchor: str) -> int:
    """공백과 `$` 를 무시하고 앵커를 찾아 원문 위치를 돌려준다. 없으면 -1."""
    idx = [k for k, ch in enumerate(text) if not ch.isspace() and ch != "$"]
    squeezed = "".join(text[k] for k in idx)
    at = squeezed.find(sq(anchor))
    return -1 if at < 0 else idx[at]


#: LaTeX 명령 → 기호. 발견기 후보와 목록 용어를 **같은 모양**으로 견주려고 쓴다.
CANON = {
    r"\square": "□", r"\triangle": "△", r"\angle": "∠", r"\backsim": "∽", r"\equiv": "≡",
    r"\sqrt": "√", r"\pm": "±", r"\overline": "", r"\degree": "°", r"\times": "×", r"\div": "÷",
    r"\alpha": "α", r"\beta": "β", r"\pi": "π", r"\cdots": "⋯", r"\leq": "≤", r"\geq": "≥", r"\neq": "≠",
}


def canon(s: str) -> str:
    for a, b in CANON.items():
        s = s.replace(a, b)
    s = re.sub(r"\^\{?2\}?", "²", s)
    s = re.sub(r"\^\{?3\}?", "³", s)
    s = s.replace("−", "-")
    return re.sub(r"[\s${}]", "", s)


#: 질문 제목의 줄기 — «무엇 · 어떤 · 어떻게 · 어디 · 얼마» 꼴 질문에서 그 앞부분.
QTAIL = re.compile(r"(이란|란|사이에는|에는|은|는|을|를|이|가)\s*(무엇|어떤|어떻게|어디|얼마)")


def stem(q: str) -> str:
    q = re.sub(r"^\[\d\]\s*", "", q.strip()).rstrip("?")
    m = QTAIL.search(q)
    return q[: m.start()] if m else q


def sentence_at(text: str, at: int) -> tuple[int, int]:
    lo = text.rfind("\n", 0, at) + 1
    for m in END.finditer(text, lo, at):
        lo = m.end()
    hi = text.find("\n", at)
    hi = len(text) if hi < 0 else hi
    m = END.search(text, at, hi)
    if m:
        hi = m.start()
    return lo, hi


def clean_sentence(s: str) -> str:
    s = LEAD.sub("", s, count=1)
    return re.sub(r"\s+", " ", s).strip()


# ── 목차 ───────────────────────────────────────────────────────────────────
def read_toc(book) -> list[dict]:
    """본문 목차(p9~10) + 대단원 소개 쪽(«이 단원의 내용»)."""
    chapters = []
    part = None
    for pno in (9, 10):
        for ln in book.pages[pno - 1].lines:
            b = ln.body.strip()
            m = re.match(r"^(\d)\s+(.+?)[·\s]+(\d{2,3})$", b)
            if m:
                chapters.append({"num": int(m.group(1)), "name": G.pretty(m.group(2)), "bookStart": int(m.group(3)), "tocPart": part})
            elif b and not re.match(r"^(차례|수학의 시작은 개념원리|\d+)$", b):
                part = b
    # 대단원 소개 쪽의 소단원 목록
    listed: dict[tuple[str, str], list[str]] = collections.OrderedDict()
    for p in book.pages:
        if p.genre != "intro":
            continue
        cur = None
        for ln in p.lines:
            b = ln.body.strip()
            m1 = re.match(r"^(\d)\.\s*(.+)$", b)
            m2 = re.match(r"^(0\d)\s+(.+)$", b)
            if m1:
                cur = (p.part or "", f"{m1.group(1)}. {G.pretty(m1.group(2))}")
                listed[cur] = []
            elif m2 and cur:
                listed[cur].append(f"{m2.group(1)} {G.pretty(m2.group(2).replace('$', ''))}")
    return chapters, listed


def structure(book) -> list[dict]:
    """소단원: 제목 · 시작 쪽 · 개념 쪽 · 대단원 · 중단원 · 번호."""
    secs = G.sections(book)
    count: dict[str, int] = collections.Counter()
    for s in secs:
        p = book.pages[s["start"] - 1]
        s["part"], s["chapter"] = p.part, p.header
        count[p.header] += 1
        s["num"] = f"{count[p.header]:02d}"
        s["name"] = f"{s['num']} {s['title']}"
    return secs


def toc_key(name: str) -> str:
    """목차 이름 견주기 — ⑴/(1) · `$` · 공백을 맞춘다. 소개 쪽은 줄이 바뀌면 뒤가 잘리므로 앞머리로 견준다."""
    for a, b in (("⑴", "(1)"), ("⑵", "(2)"), ("⑶", "(3)")):
        name = name.replace(a, b)
    return re.sub(r"[\s$]", "", name)


def section_of(secs: list[dict], pno: int) -> dict:
    cur = secs[0]
    for s in secs:
        if s["start"] <= pno:
            cur = s
    return cur


# ── 발견기 ───────────────────────────────────────────────────────────────────
NAMEY = re.compile(r"(성질|정리|법칙|공식|조건|덧셈|곱셈|뜻)$")
CALLED = re.compile(r"([^\s,.'‘’“”()（）]+?)(?:이)?라(?:고도|고)?\s?(?:한다|하고|하며|부른다|읽는다|정한다)")


def candidates(book, secs) -> list[dict]:
    out = []
    concept_pages = {p for s in secs for p in s["concept"]}
    for p in book.pages:
        if p.genre in ("front", "intro", "plan"):
            continue
        inside = p.pno in concept_pages
        text, segs = stream(p)
        for m in CALLED.finditer(text):
            word = m.group(1)
            word = re.sub(r"^.*[을를]", "", word) or word
            if len(re.findall(r"[가-힣]", word)) < 2:  # «점 M이라 하고» 같은 이름 붙이기는 용어가 아니다
                continue
            # 앞 낱말 하나를 더 붙인 꼴도 둔다 — 2-2 p107 닮은 도형의 뜻 문장에서 낱말은 «도형» 이 아니라 «닮은 도형»
            before = re.search(r"([가-힣A-Za-z0-9]+)\s+$", text[max(0, m.start() - 20):m.start(1)])
            word2 = (before.group(1) + " " + word) if before else word
            out.append({"pno": p.pno, "how": "라 한다" if inside else "라 한다(개념 쪽 밖)", "text": word, "text2": word2,
                        "ctx": text[max(0, m.start() - 30): m.end()]})
        if not inside:
            continue
        for ln in p.lines:
            if not keep(ln):
                continue
            # 적갈색 · 굵은 고딕 — 한 줄 안에서 이어진 조각을 한 덩이로(«**평면도형에서의** «닮음비»» 는 하나)
            run, styles, mrun, red = "", set(), [], ""
            for s in ln.spans + [None]:
                st = s.style if s is not None else ""
                blank = s is not None and not s.text.strip()
                if s is not None and (st in ("red", "bold") or (blank and run) or (s.math and run)):
                    if s.math and st == "red":  # 적갈색 기호는 그 자체가 후보(√ · ∽ · □ABCD)
                        run += G._decode_math(mrun + [s])[0]
                        mrun = []
                        dec = G._decode_math([s])[0]
                        if "[수식]" not in dec:
                            red += dec
                        styles.add("red")
                        continue
                    if s.math:
                        mrun.append(s)  # 굵은 표제 사이의 식 — 뒤에 굵은 글이 이어질 때만 넣는다
                        continue
                    if mrun:
                        run += G._decode_math(mrun)[0]
                        mrun = []
                    run += G.JUNK.sub("", s.text)
                    if st == "red":
                        red += G.JUNK.sub("", s.text)
                    if st:
                        styles.add(st)
                else:
                    # 끝에 달랑 붙은 수식(굵지 않은)은 표제가 아니다 — 버린다(«…의 해 $x$»).
                    mrun = []
                    # 적갈색은 **적갈색 글만** 후보로(뒤따르는 식이 붙으면 «사인$)=$» 가 된다 — 3-2 p13)
                    if red.strip():
                        out.append({"pno": p.pno, "how": "적갈색", "text": red.strip(), "ctx": ln.body})
                    if "bold" in styles and run.strip() and re.search(r"[가-힣]", run):
                        out.append({"pno": p.pno, "how": "굵은 표제", "text": run.strip(), "ctx": ln.body})
                    run, styles, red = "", set(), ""
            if "hl" in ln.styles:  # 노란 형광 — 글자층 밖의 강조(그림 사각형)
                runs, cur = [], []
                for sp in ln.spans:
                    if sp.hl:
                        cur.append(sp)
                    elif cur and not sp.text.strip():
                        continue
                    elif cur:
                        runs.append(cur)
                        cur = []
                if cur:
                    runs.append(cur)
                for run in runs:
                    txt = G.build_line(run).plain
                    if re.search(r"[가-힣]", txt) or len(sq(txt)) >= 2:
                        out.append({"pno": p.pno, "how": "형광", "text": txt.strip(), "ctx": ln.body, "y": ln.y})
            if "purple" in ln.styles:
                ph = "".join(s.text for s in ln.spans if s.style == "purple" and not s.math).strip()
                if NAMEY.search(ph.rstrip(". ")):
                    out.append({"pno": p.pno, "how": "자주색 이름", "text": ph.rstrip(". "), "ctx": ln.body})
            b = ln.body.strip()
            m = re.match(r"^(?:[⑴-⒇①-⑳]\s*)?([가-힣A-Za-z0-9 ]{1,24}?)\s*[：:]\s*\S", b)
            if m and not re.search(r"(합동|닮음)$", m.group(1)):
                out.append({"pno": p.pno, "how": "X：뜻", "text": m.group(1).strip(), "ctx": b})
            if "head" in ln.styles and b.endswith("?"):
                out.append({"pno": p.pno, "how": "질문 제목", "text": b, "ctx": b})
    return out


def block_of(book, pno: int, y: float) -> tuple[int, int]:
    """(쪽, 덩이 번호) — 질문 제목 줄이 덩이를 가른다. 쪽 머리의 제목 앞 줄은 앞 쪽 마지막 덩이에 붙는다."""
    heads = sorted(ln.y for ln in book.pages[pno - 1].lines if "head" in ln.styles and ln.body.strip().endswith("?"))
    k = sum(1 for hy in heads if hy <= y + 1)
    if k == 0 and pno > 1:
        prev = [ln.y for ln in book.pages[pno - 2].lines if "head" in ln.styles and ln.body.strip().endswith("?")]
        return (pno - 1, len(prev))
    return (pno, k)


#: 이름이 **정확히** 같아야 걸리는 후보 — 교재가 새 낱말을 찍는 자리다(적갈색 · «~이라 한다»의 낱말).
#: 더 긴 용어 이름 안에 들어 있다고 걸리게 하면 «외심»을 목록에서 빼도 «삼각형의 외심의 성질»이 가린다 —
#: 변이 시험(`mutate-gaenyeom-terms-midb.py`)에서 248개 중 104개가 그렇게 숨었다(2026-09-28).
EXACT = {"적갈색", "라 한다", "라 한다(개념 쪽 밖)"}
#: 이 길이(글자) 이하이고 글자만(영문·한글)인 형광은 이름으로 본다 — 식(«a：b=c：d»)은 이름이 아니다.
SHORT_HL = 10


def names_of(e: dict) -> list[str]:
    return [n for n in (canon(x) for x in [e["term"]] + e["aliases"]) if n]


def covered(c: dict, entries: list[dict], rejects: list[dict], secs: list[dict], book=None) -> str | None:
    """후보가 목록 용어(같은 소단원) 또는 버린 목록(같은 쪽)에 걸리나. 양쪽을 `canon` 으로 맞춘다.

    후보 종류마다 기준이 다르다.
      · 적갈색 · «라 한다» 낱말 — 용어 이름(별칭)과 **정확히 같아야**.
      · «X：뜻» — X 를 «과/와»로 나눈 조각이 **각각** 용어 이름을 품어야(«입체도형에서의 닮음비»).
      · 굵은 표제 · 자주색 이름 — 용어 이름이 후보 안에 있거나, 후보가 그 용어의 비고에 인용돼 있으면.
      · 질문 제목 — 제목의 줄기(질문 꼬리 앞)가 용어 이름 안에 있거나 비고에 인용돼 있으면.
      · 형광 — 같은 소단원 용어의 문장 안이거나, 같은 질문 제목 덩이에 용어가 있으면.
    """
    ct = canon(c["text"])
    if not ct:
        return "빈 후보"
    for r in rejects:
        rt = canon(r["text"])
        if r["pno"] == c["pno"] and rt and (rt == ct or (len(rt) >= 4 and rt in ct)):
            return "버림: " + r["reason"]
    how = c["how"]
    if how == "라 한다(개념 쪽 밖)":
        pool = entries  # 책 어디서든 이미 적은 용어면 된다
    else:
        sec = section_of(secs, c["pno"])
        pool = [e for e in entries if section_of(secs, e["pdfPage"]) is sec]
    if how == "형광":
        for e in pool:
            sent = canon(e.get("sentence", ""))
            if ct in sent or (len(sent) >= 6 and sent in ct):
                return "용어(문장): " + e["term"]
            if ct in names_of(e):
                return "용어: " + e["term"]
        # 짧은 형광은 이름이다(«RHA») — 같은 덩이라고 걸어 주면 그 이름을 목록에서 빼도 못 본다(변이 시험)
        if book is not None and not (len(ct) <= SHORT_HL and re.fullmatch(r"[A-Za-z가-힣]+", ct)):
            here = block_of(book, c["pno"], c["y"])
            for e in pool:
                if block_of(book, e["pdfPage"], e["_y"]) == here:
                    return "용어(같은 제목 덩이): " + e["term"]
        return None
    if how in EXACT:
        c2 = canon(c.get("text2", ""))
        for e in pool:
            ns = names_of(e)
            if ct in ns or (c2 and c2 in ns):
                return "용어: " + e["term"]
        return None
    if how == "X：뜻":
        # 조각마다 용어 이름을 **품어야** 한다(«입체도형에서의 닮음비» ⊃ «닮음비»). 비고 인용으로는 안 걸린다.
        parts = [canon(x) for x in re.split(r"(?<=[가-힣])[과와]\s*", c["text"]) if x.strip()]
        names = {n for e in pool for n in names_of(e)}
        if parts and all(any(n in pt for n in names) for pt in parts):
            return "용어: " + " + ".join(parts)
        return None
    heading = how == "질문 제목"
    key = canon(stem(c["text"])) if heading else ct
    if heading:
        parts = [canon(x) for x in re.split(r"(?<=[가-힣])[과와]\s", stem(c["text"])) if x.strip()]
        if len(parts) > 1:
            names = [n for e in pool for n in names_of(e)]
            if all(any(pt in n for n in names) for pt in parts):
                return "용어(제목 둘): " + " + ".join(parts)
    parts = [canon(x) for x in re.split(r"(?<=[가-힣])[과와]\s*", c["text"]) if x.strip()] if not heading else []
    for e in pool:
        for n2 in names_of(e):
            if heading and key in n2:
                return "용어: " + e["term"]
            # 굵은 표제 · 자주색 이름: 이름이 같거나, 이름이 **끝에** 온다(«평면도형에서의 닮음비»).
            # 가운데·앞에 품는 것까지 받으면 «직사각형의 성질»이 «직사각형»에 가려진다(변이 시험).
            if not heading and (n2 == ct or ct.endswith(n2) or any(pt == n2 or pt.endswith(n2) for pt in parts)):
                return "용어: " + e["term"]
        if key and key in canon(e.get("_noteq", "")):
            return "용어(비고): " + e["term"]
    return None


# ── 탐험 카드 ─────────────────────────────────────────────────────────────────
def load_cards() -> dict:
    out = Path(tempfile.gettempdir()) / "concept-terms-midb-cards.json"
    cli = REPO / "node_modules" / "tsx" / "dist" / "cli.mjs"
    subprocess.run(["node", str(cli), str(HERE / "dump-explorer-cards-midb.ts"), str(out)], check=True, cwd=REPO,
                   stdout=subprocess.DEVNULL)
    return json.loads(out.read_text(encoding="utf-8"))


# ── 만들기 ───────────────────────────────────────────────────────────────────
def build_grade(grade: str, rows, rej_rows, exp_map, seen_first: set, problems: list) -> dict:
    """한 권: 목록의 앵커를 지면에서 찾아 용어를 채우고, 발견기 · 목차 대조까지. 변이 시험도 이것을 부른다."""
    book = G.load(grade)
    secs = structure(book)
    chapters, listed = read_toc(book)
    entries = []
    for g, pno, term, kind, anchor, aliases, flags, note, cite, n in rows:
        if g != grade:
            continue
        pno = int(pno)
        if kind not in KINDS:
            problems.append(f"terms-midb.tsv:{n} 갈래 '{kind}'")
        page = book.pages[pno - 1]
        text, segs = stream(page)
        at = find(text, anchor)
        flagset = {f for f in flags.split(",") if f}
        if at >= 0:
            anchor_y = next(ln.y for s0, s1, ln in segs if s0 <= at < s1)
            lo, hi = sentence_at(text, at)
            if "one" in flagset:  # 정의 한 줄만 — 뒤에 그림·흐름도 글이 붙는 자리
                s0, s1, _ln = next(sg for sg in segs if sg[0] <= at < sg[1])
                lo, hi = max(lo, s0), min(hi, s1)
            lines = [ln for s0, s1, ln in segs if s0 < hi and s1 > lo]
            sentence = clean_sentence(text[lo:hi])
        else:  # 자주색 곁말 속 용어 — 곁말 덩이를 문장으로
            got = purple_note(page, anchor)
            if got is None:
                problems.append(f"terms-midb.tsv:{n} {grade} p{pno} «{term}» 앵커를 못 찾음: {anchor}")
                continue
            sentence, lines = got
            anchor_y = lines[0].y
            flagset.add("margin")
        stacked_near = near_stack(page, lines)
        garbled = any(ln.garbled for ln in lines) or "stack" in flagset or stacked_near
        sec = section_of(secs, pno)
        genre = page.genre
        notes = []
        if "review" in flagset:
            notes.append("복습")
        if "named" in flagset:
            notes.append("이름은 추출자가 제목·내용에서 땀")
        if "stack" in flagset or stacked_near or any(sp.stacked for ln in lines for sp in ln.spans):
            notes.append("쌓인 분수 — 글자층에서 분자·분모가 흩어져 문장의 수식이 온전하지 않음")
        if "margin" in flagset:
            notes.append("자주색 곁말")
        if genre != "concept":
            notes.append(f"개념 쪽 밖({genre})")
        if note:
            notes.append(note)
        alias_list = [a for a in aliases.split(";") if a]
        key = sq(term)
        first = key not in seen_first
        seen_first.add(key)
        exp = exp_map.get((grade, term)) or []
        entries.append({
            "term": term, "kind": kind, "grade": grade,
            "part": sec["part"], "chapter": sec["chapter"], "section": sec["name"],
            "pdfPage": pno, "bookPage": f"{int(page.book):03d}쪽" if page.book else f"{pno - 3:03d}쪽",
            "sentence": sentence, "first": first, "aliases": alias_list,
            "mathGarbled": bool(garbled), "note": " · ".join(notes),
            "explorer": exp if len(exp) != 1 else exp[0],
            "_noteq": note + " " + cite,
                "_cite": cite,
            "_y": anchor_y,
        })
        if not exp:
            problems.append(f"{grade} «{term}» 탐험 짝 줄이 없음(explorer-midb.tsv — none 이라도 적는다)")
    # 발견기
    rejects = [{"pno": int(r[1]), "text": r[2], "reason": r[3]} for r in rej_rows if r[0] == grade]
    cands = candidates(book, secs)
    uncovered = []
    cover_count = collections.Counter()
    used_rej: set = set()
    for c in cands:
        why = covered(c, entries, rejects, secs, book)
        if why is None:
            uncovered.append(c)
        else:
            cover_count[why.split(":")[0]] += 1
            if why.startswith("버림: "):
                used_rej.add(why)
    # 죽은 버림 — 아무 후보에도 안 걸리는 줄은 발견기가 바뀌어 헛돌게 된 규칙이다(20 «가드가 0을 내면»)
    for r in rejects:
        rt = canon(r["text"])
        if not any(c["pno"] == r["pno"] and (rt == canon(c["text"]) or (len(rt) >= 4 and rt in canon(c["text"]))) for c in cands):
            problems.append(f"rejects-midb.tsv {grade} p{r['pno']} «{r['text']}» 이 아무 후보에도 안 걸린다(죽은 줄)")
    # 목차 대조
    per_sec = collections.Counter(section_of(secs, e["pdfPage"])["name"] for e in entries)
    toc = []
    used: set = set()
    for ci, ch in enumerate(chapters):
        ch_secs = [s for s in secs if sq(s["chapter"] or "") == sq(f"{ch['num']}. {ch['name']}") and sq(s["part"] or "").endswith(sq(ch["tocPart"] or ""))]
        pdf0 = ch["bookStart"] + 3
        nxt = chapters[ci + 1]["bookStart"] + 3 if ci + 1 < len(chapters) else book.count
        key = next((k for k in listed if sq(k[1]) == sq(f"{ch['num']}. {ch['name']}") and k not in used), None)
        if key:
            used.add(key)
        listed_secs = listed.get(key, []) if key else []
        found = [s["name"] for s in ch_secs]
        toc.append({
            "part": ch_secs[0]["part"] if ch_secs else ch["tocPart"],
            "chapter": f"{ch['num']}. {ch['name']}",
            "sections": found,
            "pdfPages": [pdf0, nxt - 1],
            "bookPages": [ch["bookStart"], nxt - 1 - 3],
            "tocSections": listed_secs,
            "termsPerSection": {s: per_sec.get(s, 0) for s in found},
        })
        if len(listed_secs) != len(found) or not all(toc_key(f).startswith(toc_key(x)) for x, f in zip(listed_secs, found)):
            problems.append(f"{grade} 목차 소단원 불일치 {ch['name']}: 소개 쪽 {listed_secs} ↔ 본문 {found}")
    zero = [s["name"] for s in secs if per_sec.get(s["name"], 0) == 0]
    return {"book": book, "secs": secs, "entries": entries, "toc": toc, "uncovered": uncovered, "rejects": rejects,
            "cands": cands, "cover": cover_count, "zero": zero}


def main() -> None:
    check_only = "--check" in sys.argv
    rows = read_tsv(TERMS, 9)
    rej_rows = read_tsv(REJECTS, 4)
    exp_rows = read_tsv(EXPLORER, 5)
    cards = load_cards()
    card_by_id = {c["id"]: c for c in cards["cards"]}
    problems: list[str] = []

    # 탐험 짝 표: (학년, 용어) → 짝. 한 용어에 카드가 여럿이면 여러 줄.
    exp_map: dict[tuple[str, str], list[dict]] = collections.defaultdict(list)
    for g, term, match, card_id, why, n in exp_rows:
        if match not in MATCHES:
            problems.append(f"explorer-midb.tsv:{n} match '{match}'")
        if match != "none" and card_id not in card_by_id:
            problems.append(f"explorer-midb.tsv:{n} 없는 카드 '{card_id}'")
        c = card_by_id.get(card_id, {})
        exp_map[(g, term)].append({"match": match, "cardId": card_id, "cardName": c.get("name", ""), "why": why})

    listed_terms = {(r[0], r[2]) for r in rows}
    for g, term, match, card_id, why, n in exp_rows:
        if (g, term) not in listed_terms:
            problems.append(f"explorer-midb.tsv:{n} 목록에 없는 용어 «{g} {term}»(오타?)")
    seen_first: set[str] = set()
    report: dict[str, dict] = {}
    for grade in G.GRADES:
        report[grade] = build_grade(grade, rows, rej_rows, exp_map, seen_first, problems)

    # 탐험 카드 거꾸로
    for grade in G.GRADES:
        eg = EXPLORER_GRADE[grade]
        rep = report[grade]
        rep["cards"] = []
        for c in cards["cards"]:
            if c["grade"] != eg:
                continue
            owner = UNIT_BOOK.get(c["unit"])
            hits = []
            for gg in G.GRADES:
                for e in report[gg]["entries"]:
                    ex = e["explorer"] if isinstance(e["explorer"], list) else [e["explorer"]]
                    for x in ex:
                        if x.get("cardId") == c["id"] and x.get("match") != "none":
                            hits.append((gg, e["term"], x["match"], e["pdfPage"]))
            rep["cards"].append({"card": c, "owner": owner, "hits": hits})

    for p in problems:
        print("⚠", p)
    for grade in G.GRADES:
        r = report[grade]
        kinds = collections.Counter(e["kind"] for e in r["entries"])
        print(f"{grade}: 용어 {len(r['entries'])} {dict(kinds)} · 깨짐 {sum(e['mathGarbled'] for e in r['entries'])}"
              f" · 발견기 후보 {len(r['cands'])} (걸림 {dict(r['cover'])}) · 안 걸림 {len(r['uncovered'])} · 용어 0 소단원 {len(r['zero'])}")
        for c in r["uncovered"]:
            print(f"   ? p{c['pno']} [{c['how']}] {c['text']}  ← {c['ctx'][:70]}")
        for z in r["zero"]:
            print(f"   0 용어 없는 소단원: {z}")
    if "--show" in sys.argv:
        g = sys.argv[sys.argv.index("--show") + 1]
        for e in report[g]["entries"]:
            print(("!" if e["mathGarbled"] else " ") + f" p{e['pdfPage']} {e['term']} [{e['kind']}] :: {e['sentence']}")
    if check_only:
        sys.exit(1 if problems else 0)
    if problems:
        raise SystemExit("문제가 있어 쓰지 않는다")
    OUT.mkdir(parents=True, exist_ok=True)
    for grade in G.GRADES:
        write_outputs(grade, report[grade])


# ── 쓰기 ───────────────────────────────────────────────────────────────────
def term_key(e: dict) -> str:
    return f"{e['grade']}/p{e['pdfPage']:03d}/{e['term']}"


def write_outputs(grade: str, r: dict) -> None:
    """바깥: 전체 JSON(문장 · cite 포함) + 사람용 전체 요약. 저장소: 문장 없는 JSON · 인용 없는 요약 · 탐험 대조."""
    book = r["book"]
    stem = f"gaenyeom-{grade}"
    full_path = DATA / f"{stem}.json"
    head = {
        "source": SOURCE[grade],
        "file": book.path,
        "pages": book.count,
        "extractedAt": EXTRACTED_AT,
        "extractor": "scripts/qa/concept-terms/build-gaenyeom-terms-midb.py (목록: 저장소 밖 midb/terms-midb.tsv)",
        "toc": r["toc"],
    }
    full_terms, lite_terms = [], []
    for e in r["entries"]:
        key = term_key(e)
        base = {k: v for k, v in e.items() if not k.startswith("_") and k != "sentence"}
        base["key"] = key
        full_terms.append({**base, "sentence": e["sentence"], "cite": e["_cite"]})
        lite_terms.append({**base, "sentenceRef": {"file": str(full_path), "key": key}})
    TRACK.mkdir(parents=True, exist_ok=True)
    full_path.write_text(json.dumps({**head, "terms": full_terms}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (TRACK / f"{stem}-full.md").write_text(summary_md(grade, r, full=True), encoding="utf-8")
    lite = {**head, "sentenceStore": f"문장(교재 원문)은 저장소 밖 {full_path} — 용어마다 sentenceRef.key 로 찾는다", "terms": lite_terms}
    (OUT / f"{stem}.json").write_text(json.dumps(lite, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / f"{stem}.md").write_text(summary_md(grade, r, full=False), encoding="utf-8")
    (OUT / f"{stem}-explorer.md").write_text(explorer_md(grade, r), encoding="utf-8")
    print("썼다", stem, "· 바깥", full_path)


def esc(s: str) -> str:
    return s.replace("|", "\\|").replace("\n", " ")


def summary_md(grade: str, r: dict, full: bool = False) -> str:
    """full=True 는 바깥용(교재 문장 · 버린 후보 글 · 후보 문맥), False 는 저장소용(우리 말과 숫자만)."""
    es = r["entries"]
    kinds = collections.Counter(e["kind"] for e in es)
    L = [f"# 개념원리 중학 {grade} — 개념 용어", ""]
    L.append(f"> 원천 `{r['book'].path}` ({r['book'].count}쪽) · 추출 {EXTRACTED_AT} · 트랙 midb")
    L.append("> 기계 판독용은 같은 이름의 `.json`. 목록은 저장소 밖 `midb/terms-midb.tsv`(사람이 개념 쪽을 읽고 고름),")
    L.append("> 쪽·단원은 빌더가 지면 글자층에서 앵커를 다시 찾아 채웠다. 쪽은 «PDF 쪽 / 책 쪽».")
    if not full:
        L.append(f"> 🔴 교재 문장은 싣지 않는다(원장님 2026-09-28) — 저장소 밖 `{DATA / ('gaenyeom-' + grade + '.json')}` 의 `sentence` (키 `key`).")
    L.append("")
    L.append(f"**용어 {len(es)}개** — " + " · ".join(f"{k} {kinds.get(k, 0)}" for k in KINDS))
    L.append(f"· 처음 나온 곳(first) {sum(e['first'] for e in es)} · 수식 깨짐 {sum(e['mathGarbled'] for e in es)}"
             f" · 복습(이전 학년) {sum('복습' in e['note'] for e in es)}")
    L.append("")
    cur_part = cur_ch = None
    for s in r["secs"]:
        if s["part"] != cur_part:
            cur_part = s["part"]
            L += ["", f"## {cur_part}"]
        if s["chapter"] != cur_ch:
            cur_ch = s["chapter"]
            L += ["", f"### {cur_ch}"]
        rows = [e for e in es if e["section"] == s["name"]]
        L += ["", f"**{s['name']}** (p{s['concept'][0]}{'–' + str(s['concept'][-1]) if len(s['concept']) > 1 else ''})", ""]
        if not rows:
            L.append("_용어 없음 — 보고서의 목차 대조 참고_")
            continue
        L.append("| 용어 | 갈래 | 쪽 | 문장(교재) | 비고 |" if full else "| 용어 | 갈래 | 쪽 | 비고 |")
        L.append("|---|---|---|---|---|" if full else "|---|---|---|---|")
        for e in rows:
            mark = [] if e["first"] else ["다시 나옴"]
            if e["mathGarbled"]:
                mark.append("수식 깨짐")
            note = " · ".join(mark + ([e["note"]] if e["note"] else []) + ([e["_cite"]] if full and e["_cite"] else []))
            mid = f" {esc(e['sentence'])} |" if full else ""
            L.append(f"| {esc(e['term'])} | {e['kind']} | {e['pdfPage']} / {e['bookPage']} |{mid} {esc(note)} |")
    amb = [e for e in es if "이름은 추출자" in e["note"] or e["kind"] == "기타"]
    amb_rej = [x for x in r["rejects"] if x["reason"].startswith("애매")]
    L += ["", "## 애매한 것 — 원장님이 가를 것", ""]
    L.append("교재가 이름을 붙이지 않아 추출자가 제목에서 이름을 딴 성질, 그리고 «기타»로 둔 것이다. 넣을지 뺄지 · 이름을 무엇으로 할지.")
    L.append("")
    for e in amb:
        L.append(f"- **{e['term']}** ({e['kind']}, p{e['pdfPage']}) — {e['note']}")
    if amb_rej:
        L += ["", "넣지 않았지만 넣을 수도 있는 것(버린 목록에서 «애매»):", ""]
        for x in amb_rej:
            L.append(f"- p{x['pno']} «{x['text']}» — {x['reason']}" if full else f"- p{x['pno']} — {x['reason']}")
    rej = [x for x in r["rejects"] if not x["reason"].startswith("애매")]
    if rej and full:
        L += ["", "<details><summary>넣지 않은 후보와 까닭 (" + str(len(rej)) + ")</summary>", ""]
        for x in rej:
            L.append(f"- p{x['pno']} «{esc(x['text'])}» — {esc(x['reason'])}")
        L += ["", "</details>"]
    elif rej:
        L += ["", f"넣지 않은 후보 {len(rej)}개 — 후보 글과 까닭은 저장소 밖 `midb/rejects-midb.tsv` · `midb/gaenyeom-{grade}-full.md`."]
    L += ["", "## 발견기 — 목록에 안 기댄 후보가 어디에 걸렸나", ""]
    L.append(f"후보 {len(r['cands'])}개 · " + " · ".join(f"{k} {v}" for k, v in r["cover"].items()) + f" · **안 걸림 {len(r['uncovered'])}**")
    for c in r["uncovered"]:
        L.append(f"- p{c['pno']} [{c['how']}] {esc(c['text'])} — {esc(c['ctx'][:80])}" if full else f"- p{c['pno']} [{c['how']}]")
    L.append("")
    return "\n".join(L)


def explorer_md(grade: str, r: dict) -> str:
    es = r["entries"]
    eg = EXPLORER_GRADE[grade]
    L = [f"# 개념원리 중학 {grade} ↔ 탐험 개념 카드 (학년 {eg})", ""]
    L.append("> 카드: `src/lib/math-explorers/definition-cards.ts` `definitionCards` (제품 모듈을 불러 꺼냄). 짝: `scripts/qa/concept-terms/explorer-midb.tsv`.")
    L.append("> match — exact(같은 용어) · alias(같은 개념 다른 이름) · related(더 넓게/좁게, 다른 말로) · none.")
    L.append("")

    def exp_list(e):
        return e["explorer"] if isinstance(e["explorer"], list) else [e["explorer"]]

    # 교재 → 탐험
    L += ["## 교재 용어 중 탐험에 있는 비율", ""]
    L.append("| 갈래 | 용어 | exact | alias | related | none | 탐험에 있음(exact+alias) | 넓게(+related) |")
    L.append("|---|---:|---:|---:|---:|---:|---:|---:|")
    tot = collections.Counter()
    for k in KINDS + ["합계"]:
        rows = es if k == "합계" else [e for e in es if e["kind"] == k]
        if not rows:
            continue
        best = collections.Counter()
        for e in rows:
            ms = [x["match"] for x in exp_list(e)]
            best[min(ms, key=MATCHES.index)] += 1
        n = len(rows)
        inn = best["exact"] + best["alias"]
        wide = inn + best["related"]
        L.append(f"| {k} | {n} | {best['exact']} | {best['alias']} | {best['related']} | {best['none']} | {inn} ({inn * 100 // n}%) | {wide} ({wide * 100 // n}%) |")
    L += ["", "## 탐험 카드마다 — 교재에 대응 용어가 있나", ""]
    mine = [c for c in r["cards"] if c["owner"] == grade]
    other = [c for c in r["cards"] if c["owner"] != grade]
    has = sum(1 for c in mine if c["hits"])
    L.append(f"이 권이 맡는 탐험 단원의 카드 **{len(mine)}장 중 {has}장**({(has * 100 // len(mine)) if mine else 0}%)이 이 권 또는 이 트랙의 다른 권에 대응 용어가 있다.")
    L.append("")
    L.append("| 카드 | 단원 | 카드 정의 | 대응 용어(권 · 짝 · PDF쪽) |")
    L.append("|---|---|---|---|")
    for c in mine:
        card = c["card"]
        hit = "; ".join(f"{g} «{t}» {m} p{p}" for g, t, m, p in c["hits"]) or "**교재에 없음**"
        L.append(f"| {card['name']} (`{card['id']}`) | {card['unit']} | {esc(card['definition'])} | {esc(hit)} |")
    if other:
        L += ["", f"### 같은 학년의 다른 권 소관 카드 ({len(other)}장)", ""]
        L.append("이 권이 맡지 않는 단원의 카드 — 이 트랙의 다른 권(3-1 · 3-2) 또는 다른 트랙(2-1)이 맡는다. 이 트랙 세 권에서 걸린 것만 적는다.")
        L.append("")
        for c in other:
            card = c["card"]
            hit = "; ".join(f"{g} «{t}» {m} p{p}" for g, t, m, p in c["hits"]) or "—"
            L.append(f"- {card['name']} (`{card['id']}`, {card['unit']}) — {hit}")
    L += ["", "## 교재 용어별 짝", ""]
    L.append("| 용어 | 갈래 | 쪽 | 짝 | 카드 | 까닭 |")
    L.append("|---|---|---|---|---|---|")
    for e in es:
        for x in exp_list(e):
            card = f"{x['cardName']} (`{x['cardId']}`)" if x.get("cardId") else ""
            L.append(f"| {esc(e['term'])} | {e['kind']} | {e['pdfPage']} | {x['match']} | {esc(card)} | {esc(x.get('why', ''))} |")
    mism = [(e, x) for e in es for x in exp_list(e) if x.get("why", "").startswith("어긋남")]
    L += ["", "## 뜻이 어긋나는 것 (카드 정의 ↔ 교재)", ""]
    L.append("교재 문장은 싣지 않는다(저장소 밖) — 어긋남은 우리 말로 적는다.")
    L.append("")
    if not mism:
        L.append("_없음_")
    for e, x in mism:
        card = next((c["card"] for c in r["cards"] if c["card"]["id"] == x["cardId"]), None)
        L.append(f"- **{e['term']}** (p{e['pdfPage']}) ↔ `{x['cardId']}` «{x['cardName']}»")
        if card:
            L.append(f"  - 카드: {card['definition']}")
        L.append(f"  - {x['why']}")
    L.append("")
    return "\n".join(L)


if __name__ == "__main__":
    main()
