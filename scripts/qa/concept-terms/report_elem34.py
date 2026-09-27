# -*- coding: utf-8 -*-
"""elem34 산출: 권마다 JSON · 사람용 요약 md · 탐험 카드 대조 md.

- 첫 등장: 3-1 → 3-2 → 4-1 → 4-2 차례로 처음 나온 곳만 first=true(용어 · 표기 변형을 띄어쓰기 없이 견준다).
- 표기 흔들림: 교재 본문 글자층에서 용어를 «글자 사이 빈칸 허용» 으로 찾아, 다른 띄어쓰기 꼴을 aliases 에 더한다.
- 목차 대조: 용어가 0 개인 소단원마다 눈 판정(curation.ZERO_OK)을 붙이고, 판정이 없으면 «미확인» 으로 드러낸다.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from curation_elem34 import (
    CARD_NOTES,
    CARD_TO_TERM_RELATED,
    EXPLORER_RELATED,
    MEANING_GAPS,
    NOT_INCLUDED,
    ZERO_OK,
)

KINDS = ["정의", "성질", "정리", "공식", "법칙", "기호", "기타"]
ORDER = ["3-1", "3-2", "4-1", "4-2"]
SIBLING = {"3-1": "3-2", "3-2": "3-1", "4-1": "4-2", "4-2": "4-1"}


def squash(t: str) -> str:
    return re.sub(r"\s+", "", t)


def book_text(book) -> list[tuple[int, str]]:
    return [(pn, ln.text) for pn in range(1, book.doc.page_count + 1) for ln in book.page(pn)]


def surface_forms(term: str, texts: list[tuple[int, str]]) -> set[str]:
    core = squash(term)
    if len(core) < 3 or not re.fullmatch(r"[가-힣]+", core):
        return set()
    # 왼쪽은 낱말 경계 — 앞 낱말의 끝 글자와 붙어 가짜 변형이 잡히지 않게(2026-09-28 3-2 105쪽에서 실제로 걸렸다).
    pat = re.compile(r"(?<![가-힣])" + r"\s?".join(map(re.escape, core)))
    return {m.group(0) for _, t in texts for m in pat.finditer(t)}


def mark_first(all_terms: dict[str, list[dict]]) -> None:
    seen: set[str] = set()
    for g in ORDER:
        for t in sorted(all_terms.get(g, []), key=lambda t: t["pdfPage"]):
            keys = {squash(t["term"])} | {squash(a) for a in t["aliases"]}
            t["first"] = not (keys & seen)
            seen |= keys


def attach_explorer(all_terms: dict[str, list[dict]], cards: dict) -> None:
    by_id = {c["id"]: c for c in cards["cards"]}
    for g, ts in all_terms.items():
        grade = int(g[0])
        for t in ts:
            ex = {"match": "none", "cardId": "", "cardName": "", "why": ""}
            rel = EXPLORER_RELATED.get(t["term"])
            names = {squash(t["term"])} | {squash(a) for a in t["aliases"]}
            exact = [c for c in cards["cards"] if squash(c["name"]) == squash(t["term"])]
            alias = [c for c in cards["cards"] if squash(c["name"]) in names and c not in exact]
            if exact and not rel:
                c = sorted(exact, key=lambda c: c["grade"] != grade)[0]
                ex = {"match": "exact", "cardId": c["id"], "cardName": c["name"], "why": ""}
            elif alias and not rel:
                c = sorted(alias, key=lambda c: c["grade"] != grade)[0]
                ex = {"match": "alias", "cardId": c["id"], "cardName": c["name"], "why": "교재 표기 변형과 카드 이름이 같음"}
            elif rel:
                c = by_id[rel[0]]
                ex = {"match": rel[1], "cardId": c["id"], "cardName": c["name"], "why": rel[2]}
            if ex["cardId"]:
                cg = by_id[ex["cardId"]]["grade"]
                if cg != grade:
                    ex["why"] = (ex["why"] + " " if ex["why"] else "") + f"(카드는 초{cg}, 교재는 {g})"
            t["explorer"] = ex


def pct(a: int, b: int) -> str:
    return f"{a}/{b} ({round(100 * a / b)}%)" if b else "0/0"


def write_outputs(books, all_terms, all_census, cards, out: Path, at: str, data: Path, text: dict) -> None:
    """저장소(out)에는 원문 없는 JSON · md, 저장소 밖(data)에는 문장까지 든 전체 JSON."""
    out.mkdir(parents=True, exist_ok=True)
    data.mkdir(parents=True, exist_ok=True)
    texts = {g: book_text(b) for g, b in books.items()}
    genres = {g: b.genres for g, b in books.items()}
    # 쪽 글을 이어 붙인다(줄 끝에서 잘린 «합» / «니다» 가 낱말로 잡히지 않게).
    # 여백 칸(x<175)과 본문 칸을 따로 이어 붙인다 — 같은 높이의 여백 줄이 본문 낱말 사이에 끼지 않게.
    page_texts = {
        g: {
            pn: "".join(ln.text for ln in b.page(pn) if ln.x0 < 175)
            + " | "
            + "".join(ln.text for ln in b.page(pn) if ln.x0 >= 175)
            for pn in range(1, b.doc.page_count + 1)
        }
        for g, b in books.items()
    }
    for g, ts in all_terms.items():
        for t in ts:
            for f in sorted(surface_forms(t["term"], texts[g])):
                if f != t["term"] and f not in t["aliases"]:
                    t["aliases"].append(f)
    mark_first(all_terms)
    attach_explorer(all_terms, cards)
    for g, book in books.items():
        ts = sorted(all_terms[g], key=lambda t: (t["pdfPage"], t["_y"]))
        ts = [{k: v for k, v in t.items() if k != "_y"} for t in ts]
        head = {
            "source": f"큐브수학 개념 {g} 진도북",
            "file": str(book.path),
            "pages": book.doc.page_count,
            "extractedAt": at,
            "extractor": "scripts/qa/concept-terms/extract-cube-terms-elem34.py",
            "toc": book.toc,
        }
        # 저장소 밖: 문장까지 든 전체(옆 트랙 elem56 과 같은 자리 · 같은 key).
        full = {**head, "terms": ts}
        (data / f"cube-{g}.json").write_text(json.dumps(full, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        # 저장소: 문장을 빼고 sentenceRef 로 잇는다.
        ref_file = f"I-개념용어/cube-{g}.json"
        slim = [
            {**{k: v for k, v in t.items() if k != "sentence"},
             "sentenceRef": {"store": "testautocreator-data", "file": ref_file, "key": t["key"]}}
            for t in ts
        ]
        repo_doc = {
            **head,
            "sentenceStore": f"문장(교재 원문)은 저장소 밖 C:\\Creative\\testautocreator-data\\I-개념용어\\cube-{g}.json — 용어마다 sentenceRef.key 로 찾는다",
            "terms": slim,
        }
        (out / f"cube-{g}.json").write_text(json.dumps(repo_doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        (out / f"cube-{g}.md").write_text(summary_md(g, book, ts, all_census[g]), encoding="utf-8")
        (out / f"cube-{g}-explorer.md").write_text(
            explorer_md(g, ts, all_terms, cards, texts, genres, page_texts, text), encoding="utf-8"
        )


def zero_sections(g: str, book, ts: list[dict]) -> list[tuple[str, str, str]]:
    have = Counter((t["chapter"], t["section"]) for t in ts)
    rows = []
    for c in book.toc:
        for s in c["sections"]:
            if not have[(c["chapter"], s)]:
                verdict = ZERO_OK.get(g, {}).get(s)
                rows.append((c["chapter"], s, verdict if verdict else "🔴 미확인"))
    return rows


def summary_md(g: str, book, ts: list[dict], census: list[dict]) -> str:
    kinds = Counter(t["kind"] for t in ts)
    lines = [
        f"# 큐브수학 개념 {g} 진도북 — 개념 용어",
        "",
        f"원본 `{book.path}` · {book.doc.page_count}쪽 · 추출 2026-09-28 · 스크립트 `scripts/qa/concept-terms/extract-cube-terms-elem34.py`",
        "",
        "검출: 개념 쪽(«교과서 개념 잡기») 본문의 갈색 굵은 글씨 + 정의 꼬리(«~(이)라고 합니다» …)는 자동,",
        "그림·표 이름표 · 여백 제목 · 소제목 성질 · 제목으로만 가르친 조작은 개념 쪽 전수 눈 검사로 보정(`curation_elem34.py`).",
        "",
        "## 갈래별 개수",
        "",
        "| 갈래 | 개수 |",
        "|---|---:|",
    ]
    for k in KINDS:
        if kinds[k]:
            lines.append(f"| {k} | {kinds[k]} |")
    lines += [f"| **합** | **{len(ts)}** |", ""]
    auto = sum(1 for t in ts if not t["evidence"].startswith("보정"))
    lines += [f"자동 {auto} · 보정 {len(ts) - auto} · 처음 나온 것(4권 중) {sum(t['first'] for t in ts)} · 수식 깨짐 {sum(t['mathGarbled'] for t in ts)}", ""]
    lines += ["## 단원별 용어", ""]
    for c in book.toc:
        cts = [t for t in ts if t["chapter"] == c["chapter"]]
        lines += [f"### {c['chapter']} ({c['pdfPages'][0]:03d}~{c['pdfPages'][1]:03d}쪽)", ""]
        if not cts:
            lines += ["(용어 없음)", ""]
            continue
        lines += ["| 용어 | 갈래 | 쪽 | 소단원 | 근거 | 탐험 |", "|---|---|---|---|---|---|"]
        for t in cts:
            mark = "" if t["first"] else " (다시)"
            ex = t["explorer"]
            exs = f"{ex['match']} {ex['cardName']}" if ex["match"] != "none" else "—"
            lines.append(
                f"| {t['term']}{mark} | {t['kind']} | {t['bookPage']} | {t['section']} | {t['evidence']} | {exs} |"
            )
        lines.append("")
    lines += ["## 애매한 것 — 원장님이 가를 것", "", "### 넣었지만 갈래·포함이 애매한 것", ""]
    amb = [t for t in ts if t["evidence"].startswith("보정") and t["kind"] in ("기타", "성질", "기호")]
    for t in amb:
        lines.append(f"- **{t['term']}** ({t['kind']}, {t['bookPage']}) — {t['note']}")
    lines += ["", "### 넣지 않은 것", ""]
    for pn, word, why in NOT_INCLUDED.get(g, []):
        lines.append(f"- {pn:03d}쪽 «{word}» — {why}")
    garbled = [t for t in ts if t["mathGarbled"]]
    lines += ["", "## 수식 깨짐", ""]
    if garbled:
        lines.append("분수 조판 글꼴(`EHboNA`)은 풀지 않고 문장 안에 «⟦수식⟧» 로 둔다(지어내지 않음). 문장은 저장소 밖 JSON 에.")
        lines.append("")
        for t in garbled:
            lines.append(f"- {t['term']} ({t['bookPage']})")
    else:
        lines.append("없음")
    lines += ["", "## 목차 대조 — 용어 0 개인 소단원", "", "| 단원 | 소단원 | 판정(렌더 눈 검사) |", "|---|---|---|"]
    for ch, s, v in zero_sections(g, book, ts):
        lines.append(f"| {ch} | {s} | {v} |")
    cc = Counter(c["kind"] for c in census)
    lines += ["", "## 자동 후보 중 용어가 안 된 것(census)", ""]
    for k, n in cc.most_common():
        lines.append(f"- {k}: {n}")
    lines.append("")
    lines.append("전부는 저장소 밖 `I-개념용어/elem34/census-elem34.json`(후보 문장이 교재 원문이라). «개념 쪽 밖 정의 문장» 은 한번더·익힘·마무리 쪽의 빈칸 되묻기로, 새 용어는 0 이었다.")
    lines.append("")
    return "\n".join(lines)


def word_pattern(name: str) -> re.Pattern[str]:
    """카드 이름을 «낱말» 로 찾는다 — 뒤에 조사만 허용(«합» 이 «합니다» · «합계» 에 걸리지 않게)."""
    core = r"\s?".join(map(re.escape, squash(name)))
    return re.compile(rf"(?<![가-힣]){core}(?:[은는이가을를의과와도로]|으로|에서|이라|라)?(?![가-힣])")


def explorer_md(g: str, ts: list[dict], all_terms, cards, texts, genres, page_texts, text: dict) -> str:
    grade = int(g[0])
    gcards = [c for c in cards["cards"] if c["grade"] == grade]
    sib = SIBLING[g]
    lines = [
        f"# 큐브수학 개념 {g} — 탐험 개념 카드 대조",
        "",
        f"탐험 카드 = `src/lib/math-explorers/definition-cards.ts` `definitionCards` 중 초{grade}({len(gcards)}장). 짝 권은 {sib}.",
        "짝: exact = 이름 같음 · alias = 교재 표기 변형과 같음 · related = 같은 개념을 다른 말로/넓게·좁게(까닭은 JSON `explorer.why`).",
        "«본문 언급» = 대응 용어가 없을 때, 카드 이름이 이 권 **개념 쪽** 글자층에 낱말로 나온 쪽(용어로 정하지는 않음).",
        "",
    ]
    # 숫자 1: 교재 용어 중 탐험에 있는 비율(갈래별)
    lines += ["## 교재 용어 중 탐험 카드에 있는 비율", "", "| 갈래 | 카드 있음(exact·alias·related) | exact·alias 만 |", "|---|---|---|"]
    for k in KINDS + ["합"]:
        sub = ts if k == "합" else [t for t in ts if t["kind"] == k]
        if not sub:
            continue
        hit = sum(t["explorer"]["match"] != "none" for t in sub)
        strict = sum(t["explorer"]["match"] in ("exact", "alias") for t in sub)
        lines.append(f"| {k} | {pct(hit, len(sub))} | {pct(strict, len(sub))} |")
    # 카드 → 교재
    here: dict[str, list[tuple[dict, str]]] = defaultdict(list)
    for gg, tts in all_terms.items():
        for t in tts:
            cid = t["explorer"]["cardId"]
            if cid:
                here[cid].append((t, t["explorer"]["match"]))
    for cid, (term, why) in CARD_TO_TERM_RELATED.items():
        for gg, tts in all_terms.items():
            for t in tts:
                if t["term"] == term:
                    here[cid].append((t, "related"))
    lines += ["", "## 탐험 카드마다 — 교재 대응 용어", "", "| 카드 | 카드 정의 | 이 권 대응 | 다른 권 | 본문 언급(용어 아님) |", "|---|---|---|---|---|"]
    in_book = 0
    in_grade = 0
    for c in gcards:
        pairs = here.get(c["id"], [])
        mine = [f"{t['term']}({m}, {t['bookPage']})" for t, m in pairs if t["grade"] == g]
        other = [f"{t['grade']} {t['term']}({m})" for t, m in pairs if t["grade"] != g]
        if mine:
            in_book += 1
        if mine or any(t["grade"] == sib for t, _ in pairs):
            in_grade += 1
        extra = CARD_TO_TERM_RELATED.get(c["id"])
        note = f" — {extra[1]}" if extra else ""
        word = word_pattern(c["name"])
        occ = [pn for pn, tx in page_texts[g].items() if genres[g][pn - 1] == "개념설명" and word.search(tx)]
        occs = f"{len(occ)}쪽: " + ", ".join(f"{p:03d}" for p in sorted(occ)[:6]) if occ and not mine else ""
        cn = CARD_NOTES.get(c["id"])
        if cn and not mine:
            bg, bp, why = cn
            quote = text["cardNoteQuotes"][c["id"]]  # 저장소 밖 글귀 — 그 쪽 글자층에 있어야 설명을 싣는다
            if bg in page_texts and quote not in page_texts[bg].get(bp, ""):
                raise SystemExit(f"CARD_NOTES 확인 글귀가 글자층에 없음: {c['id']} {bg} p{bp}")
            note = f" — {why} ({bg} {bp:03d}쪽)"
        lines.append(
            f"| {c['name']} (`{c['id']}`) | {c['definition']} | {', '.join(mine) if mine else ('이 권에 없음' if other else '네 권 모두 없음')}{note} | {', '.join(other) or '—'} | {occs} |"
        )
    lines += [
        "",
        f"- 탐험 카드 중 **이 권**에 대응 용어가 있는 비율: {pct(in_book, len(gcards))}",
        f"- 탐험 카드 중 **초{grade} 두 권({g} · {sib})** 에 대응 용어가 있는 비율: {pct(in_grade, len(gcards))}",
        "",
        "## 카드 정의와 교재의 뜻이 어긋나는 것 (우리 말 요약 — 교재 인용 없음)",
        "",
        "| 카드 | 교재 용어 | 어긋남 | 내용 |",
        "|---|---|---|---|",
    ]
    by_id = {c["id"]: c for c in cards["cards"]}
    for cid, term, kind, why in MEANING_GAPS:
        if by_id[cid]["grade"] != grade:
            continue
        lines.append(f"| {by_id[cid]['name']} (`{cid}`) | {term} | {kind} | {why} |")
    lines.append("")
    return "\n".join(lines)
