# -*- coding: utf-8 -*-
"""`extract-gaenyeom-terms-mida.py build` 의 결과를 파일로 쓴다 — 트랙 mida.

① 무엇을 하나: 권마다 두 벌을 쓴다(원장님 2026-09-28 «교재 원문은 저장소 밖»).
   - 저장소 `docs/reference/concept-terms/`: `gaenyeom-<학년>.json`(용어·갈래·쪽·단원·탐험 짝·우리 말 note ·
     `sentenceRef` — 문장 없음) · `.md`(사람용 요약, 문장 없음) · `-explorer.md`(탐험 카드 대조).
   - 저장소 밖 `testautocreator-data/I-개념용어/`: `gaenyeom-<학년>.json`(같은 틀 + `sentence` 원문 — 대체 분석이 읽는다)
     · `mida/gaenyeom-<학년>.full.md`(문장까지 든 요약).
② 왜 따로 두나: 뽑는 쪽(추출기)과 보여 주는 쪽(쓰기)을 갈라, 숫자를 한 곳(`build_all` 결과)에서만 센다.
③ 무엇을 안 바꾸나: 위 두 자리 밖은 쓰지 않는다. 저장소 쪽에 교재 글이 섞였는지는 `check-leak-gaenyeom-mida.py` 가 잰다.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import gaenyeom_curation_mida as C
import gaenyeom_pages_mida as P

NL = P.NL
KINDS = ["정의", "성질", "정리", "공식", "법칙", "기호", "기타"]
N_ROOT = r"N:\개인\강아\교재자료\RPM\22\개념원리"
TITLE = {"1-1": "개념원리 중학 수학 1-1", "1-2": "개념원리 중학 수학 1-2", "2-1": "개념원리 중학 수학 2-1"}
MATCHED = ("exact", "alias")
SEP = chr(92)  # 윈도 경로 구분자 — 역슬래시 이스케이프를 쓰지 않는다(도구 층이 한 겹 벗긴 전례)


def md5(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def esc(s: str) -> str:
    return s.replace("|", "\\|").replace(NL, " ")


def write(res: dict, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (C.DATA / "mida").mkdir(parents=True, exist_ok=True)
    cards = res["_cards"]
    grades = [g for g in res if not g.startswith("_")]
    for g in grades:
        r = res[g]
        book: P.Book = r["book"]
        terms, toc, cands = r["terms"], r["toc"], r["cands"]
        fname = f"개념원리 중학 {g} 학생용.pdf"
        data = {
            "source": f"{TITLE[g]} (학생용)",
            "file": N_ROOT + "\\" + fname,
            "md5": md5(book.path),
            "pages": book.pages,
            "extractedAt": "2026-09-28",
            "extractor": "scripts/qa/concept-terms/extract-gaenyeom-terms-mida.py",
            "conceptPages": book.concept,
            "toc": toc,
            "terms": terms,
            "ambiguousExcluded": [{"pdfPage": p, "text": t, "note": n} for p, t, n in C.AMBIGUOUS.get(g, [])],
            "candidateCheck": {
                "total": len(cands),
                "byVerdict": dict(Counter(c["verdict"].split(":")[0].split("(")[0] for c in cands)),
                "byRule": dict(Counter(c["rule"] for c in cands)),
                "undecided": sum(1 for c in cands if c["verdict"] == "미판정"),
            },
        }
        # 저장소 밖 — 원문 문장까지(대체 분석이 여기서 읽는다)
        (C.DATA / f"gaenyeom-{g}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + NL, encoding="utf-8")
        (C.DATA / "mida" / f"gaenyeom-{g}.full.md").write_text(summary_md(g, data, r, True), encoding="utf-8")
        # 저장소 — 문장 대신 sentenceRef
        ref_file = f"I-개념용어/gaenyeom-{g}.json"
        repo = dict(data)
        repo["sentenceStore"] = (f"문장(교재 원문)은 저장소 밖 {C.DATA}{SEP}gaenyeom-{g}.json"
                                 " — 용어마다 sentenceRef.key 로 찾는다(원장님 2026-09-28)")
        repo["terms"] = [{**{k: v for k, v in t.items() if k != "sentence"},
                          "sentenceRef": {"store": "testautocreator-data", "file": ref_file, "key": t["key"]}}
                         for t in terms]
        (out / f"gaenyeom-{g}.json").write_text(json.dumps(repo, ensure_ascii=False, indent=1) + NL, encoding="utf-8")
        (out / f"gaenyeom-{g}.md").write_text(summary_md(g, data, r, False), encoding="utf-8")
        (out / f"gaenyeom-{g}-explorer.md").write_text(explorer_md(g, res, cards), encoding="utf-8")
        print(f"[{g}] 용어 {len(terms)} · 후보 {len(cands)} · 쓴 곳 {out}")


def kind_counts(terms: list[dict]) -> Counter:
    return Counter(t["kind"] for t in terms)


def summary_md(g: str, data: dict, r: dict, sentences: bool) -> str:
    """sentences=False 면 저장소용 — 교재 문장 칸을 빼고 바깥 파일을 가리킨다."""
    terms = data["terms"]
    kc = kind_counts(terms)
    firsts = [t for t in terms if t["first"]]
    L = []
    L.append(f"# {TITLE[g]} — 개념 용어 전수")
    L.append("")
    L.append(f"- 원본: `{data['file']}` ({data['pages']}쪽, md5 `{data['md5']}`) — 읽기만 했다.")
    L.append(f"- 뽑은 날: {data['extractedAt']} · 추출기: `{data['extractor']}` (판정: `gaenyeom_curation_mida.py`)")
    L.append(f"- 개념 쪽(«개념원리 이해» ~ «개념원리 확인하기» 앞): pdf {len(data['conceptPages'])}쪽 — "
             + ", ".join(map(str, data["conceptPages"])))
    L.append(f"- 용어 **{len(terms)}**건(이 권에서 처음 나온 것 {len(firsts)} · 앞 권에서 다시 나온 것 {len(terms) - len(firsts)})")
    if not sentences:
        L.append(f"- 교재 문장(원문)은 저장소 밖 `{C.DATA}{SEP}gaenyeom-{g}.json` "
                 f"(용어마다 `key`) · 문장까지 든 요약은 같은 폴더 `mida{SEP}gaenyeom-{g}.full.md` — 원장님 2026-09-28 «저장소 밖에 두기».")
    L.append("")
    L.append("## 갈래별 개수")
    L.append("")
    L.append("| 갈래 | " + " | ".join(KINDS) + " | 합 |")
    L.append("|---|" + "---:|" * (len(KINDS) + 1))
    L.append("| 전부 | " + " | ".join(str(kc.get(k, 0)) for k in KINDS) + f" | {len(terms)} |")
    fk = kind_counts(firsts)
    L.append("| 처음 나온 것 | " + " | ".join(str(fk.get(k, 0)) for k in KINDS) + f" | {len(firsts)} |")
    L.append("")
    L.append("## 단원별 용어")
    L.append("")
    L.append("쪽은 `pdf쪽/책쪽`. «다시»는 앞 권(또는 같은 권 앞쪽)에서 이미 나온 용어. ⚠ = 수식 조각을 못 읽음(mathGarbled). "
             "? = 애매(원장님 판단).")
    L.append("")
    by_sec = defaultdict(list)
    for t in terms:
        by_sec[(t["part"], t["chapter"], t["section"])].append(t)
    for ch in data["toc"]:
        L.append(f"### {ch['part']} · {ch['chapter']} (pdf {ch['pdfPages'][0]}~{ch['pdfPages'][1]})")
        L.append("")
        for sec in ch["sections"]:
            ts = by_sec.get((ch["part"], ch["chapter"], sec), [])
            sp = ch["sectionPages"][sec]
            L.append(f"**{sec}** (pdf {sp[0]}~{sp[1]}) — {len(ts)}건")
            L.append("")
            if not ts:
                L.append("_용어 없음 — 아래 «목차 대조» 참고._")
                L.append("")
                continue
            if sentences:
                L.append("| 용어 | 갈래 | 쪽 | 교재 문장 | 비고 |")
                L.append("|---|---|---|---|---|")
            else:
                L.append("| 용어 | 갈래 | 쪽 | 비고 |")
                L.append("|---|---|---|---|")
            for t in ts:
                flag = ("" if t["first"] else "다시 · ") + ("⚠ " if t["mathGarbled"] else "") + ("? " if t["ambiguous"] else "")
                al = (" (" + " · ".join(f"«{x}»" for x in t["aliases"]) + ")") if t["aliases"] else ""
                sent = f"{esc(t['sentence'])} | " if sentences else ""
                L.append(f"| {esc(t['term'])}{esc(al)} | {t['kind']} | {t['pdfPage']}/{t['bookPage'].replace('쪽', '')} | "
                         f"{sent}{esc(flag + t['note'])} |")
            L.append("")
    L.append("## 애매한 것 — 원장님이 가를 것")
    L.append("")
    amb_in = [t for t in terms if t["ambiguous"]]
    L.append(f"넣은 것 중 애매 {len(amb_in)}건, 넣지 않은 애매 {len(data['ambiguousExcluded'])}건.")
    L.append("")
    L.append("| 넣음? | 쪽 | 무엇 | 까닭 |")
    L.append("|---|---|---|---|")
    for t in amb_in:
        L.append(f"| 넣음 | {t['pdfPage']} | {esc(t['term'])} ({t['kind']}) | {esc(t['note'])} |")
    for a in data["ambiguousExcluded"]:
        L.append(f"| 뺌 | {a['pdfPage']} | {esc(a['text'])} | {esc(a['note'])} |")
    L.append("")
    g_terms = [t for t in terms if t["mathGarbled"]]
    L.append(f"## 수식 깨짐 — {len(g_terms)}건")
    L.append("")
    L.append("교재 문장 안의 수식 조각을 한컴 글꼴 표로 못 읽은 것. 문장에는 `〔수식〕` 으로 남겼다(지어내지 않음).")
    L.append("")
    for t in g_terms:
        L.append(f"- {t['term']} (pdf {t['pdfPage']})" + (f": {esc(t['sentence'])}" if sentences else ""))
    L.append("")
    zero = [(ch["chapter"], s, ch["sectionPages"][s]) for ch in data["toc"] for s in ch["sections"]
            if not by_sec.get((ch["part"], ch["chapter"], s))]
    L.append(f"## 목차 대조 — 용어 0개 소단원 {len(zero)}곳")
    L.append("")
    if zero:
        L.append("| 중단원 | 소단원 | pdf 쪽 | 판정(렌더 캡처를 눈으로) |")
        L.append("|---|---|---|---|")
        for ch, s, sp in zero:
            L.append(f"| {ch} | {s} | {sp[0]}~{sp[1]} | {ZERO_VERDICT.get((g, s), '확인 전')} |")
    else:
        L.append("없음 — 모든 소단원에 용어가 1개 이상.")
    L.append("")
    cc = data["candidateCheck"]
    L.append("## 자동 후보 대조")
    L.append("")
    L.append(f"개념 쪽에서 글꼴·색·문형으로 모은 후보 **{cc['total']}**건 — 판정 없는 후보 **{cc['undecided']}**건"
             "(0 이 아니면 추출기가 멈춘다).")
    L.append("")
    L.append("- 규칙별: " + " · ".join(f"{k} {v}" for k, v in sorted(cc["byRule"].items())))
    L.append("- 판정별: " + " · ".join(f"{k} {v}" for k, v in sorted(cc["byVerdict"].items())))
    L.append("")
    L.append("규칙: `red` 붉은 글씨(af473a) · `bold` 굵은 고딕 머리 · `colon` «용어：뜻» 줄의 머리 · "
             "`rahanda` «~(이)라 한다» 앞 낱말 · `topic` «~란 무엇인가?» 제목.")
    manual = r["manual"]
    L.append("")
    L.append(f"자동 후보가 **못 집은** 넣은 용어 {len(manual)}건(사람이 쪽을 읽고 넣음): "
             + ", ".join(f"{t['term']}(p{t['pdfPage']})" for t in manual))
    L.append("")
    return NL.join(L)


#: 목차 대조에서 용어 0개인 소단원을 **렌더 캡처로 본 결과**(캡처: 저장소 밖 testautocreator-data/I-개념용어/mida/shots/zero).
ZERO_VERDICT: dict[tuple[str, str], str] = {
    ("1-1", "01 일차방정식의 활용 ( 1 )"): "정말 없음 — p156: 활용 문제 푸는 순서(❶~❹)와 문제 유형(연속하는 수·자릿수·증가와 감소·원가와 정가)뿐."
                                     " 형광펜 친 정가·원가·이익은 관계식",
    ("1-1", "02 일차방정식의 활용 (2)"): "정말 없음 — p163: 거리·속력·시간과 농도 관계식. 참고의 «농도» 뜻 문장은 애매 목록에 올림",
    ("2-1", "02 단항식의 곱셈과 나눗셈"): "정말 없음 — p49: 곱셈·나눗셈·혼합 계산의 순서(계수끼리·문자끼리, 지수법칙 이용)",
    ("2-1", "01 일차부등식의 활용 ⑴"): "정말 없음 — p109: 푸는 순서와 문제 유형. «삼각형이 되는 조건»은 1-2 p66 성질의 되풀이",
    ("2-1", "02 일차부등식의 활용 ⑵"): "정말 없음 — p116: 거리·속력·시간, 농도 관계식(1-1 과 같다)",
    ("2-1", "01 연립일차방정식의 활용 ⑴"): "정말 없음 — p153: 푸는 순서와 문제 유형(자연수·나이·득점과 감점·증가와 감소·일)",
    ("2-1", "02 연립일차방정식의 활용 ⑵"): "정말 없음 — p160: 거리·속력·시간, 농도 관계식",
    ("2-1", "04 일차함수의 식 구하기"): "정말 없음 — p193: 기울기·한 점·두 점·절편이 주어질 때 식을 세우는 절차(애매 목록에 올림)",
    ("2-1", "05 일차함수의 활용"): "정말 없음 — p198: 푸는 순서와 활용 유형(온도·길이·물의 양·거리)",
}


def explorer_md(g: str, res: dict, cards: list[dict]) -> str:
    grade = {"1-1": 7, "1-2": 7, "2-1": 8}[g]
    terms = res[g]["terms"]
    others = {x: res[x]["terms"] for x in res if not x.startswith("_") and x != g}
    L = [f"# {TITLE[g]} — 탐험 개념 카드 대조", ""]
    L.append(f"탐험 카드: `src/lib/math-explorers/definition-cards.ts` 의 `definitionUnits`·`definitionCards`"
             f"(원본 `definition-content.ts` 는 읽기만). 이 권 = 탐험 학년 {grade}"
             f"({'중' + str(grade - 6)}).")
    L.append("")
    # 교재 → 탐험
    L.append("## 교재 용어 중 탐험에 있는 비율")
    L.append("")
    L.append("`exact` 이름이 같다 · `alias` 교재 이표기/표기 차이 · `related` 같은 개념을 넓게·좁게 · `none` 없음. "
             "비율은 exact+alias 만 센다(학년 무관 — 카드 학년이 다르면 표에 적었다).")
    L.append("")
    L.append("| 갈래 | 용어 | exact | alias | related | none | 탐험에 있음(%) |")
    L.append("|---|---:|---:|---:|---:|---:|---:|")
    tot = Counter()
    for k in KINDS + ["합"]:
        ts = terms if k == "합" else [t for t in terms if t["kind"] == k]
        if not ts:
            continue
        m = Counter(t["explorer"]["match"] for t in ts)
        hit = m["exact"] + m["alias"]
        L.append(f"| {k} | {len(ts)} | {m['exact']} | {m['alias']} | {m['related']} | {m['none']} | "
                 f"{hit}/{len(ts)} ({100 * hit / len(ts):.0f}%) |")
    L.append("")
    firsts = [t for t in terms if t["first"]]
    fm = Counter(t["explorer"]["match"] for t in firsts)
    L.append(f"이 권에서 **처음** 나온 용어만: {fm['exact'] + fm['alias']}/{len(firsts)}"
             f" ({100 * (fm['exact'] + fm['alias']) / max(1, len(firsts)):.0f}%).")
    L.append("")
    L.append("| 용어 | 갈래 | 쪽 | 짝 | 카드 | 카드 학년 | 까닭 |")
    L.append("|---|---|---|---|---|---|---|")
    for t in terms:
        e = t["explorer"]
        if e["match"] == "none":
            continue
        cg = e.get("cardGrade", "")
        L.append(f"| {esc(t['term'])} | {t['kind']} | {t['pdfPage']} | {e['match']} | {e['cardName']} (`{e['cardId']}`) | "
                 f"{cg}{' ⚠학년 다름' if cg and cg != grade else ''} | {esc(e['why'])} |")
    L.append("")
    # 탐험 → 교재
    gcards = [c for c in cards if c["grade"] == grade]
    L.append(f"## 탐험 카드(학년 {grade}, {len(gcards)}장) 중 교재에 있는 비율")
    L.append("")
    rows, here, track = [], 0, 0
    for c in gcards:
        mine = [t for t in terms if t["explorer"]["cardId"] == c["id"]]
        mine_hit = [t for t in mine if t["explorer"]["match"] in MATCHED]
        elsewhere = [(x, t) for x, ts in others.items() for t in ts
                     if t["explorer"]["cardId"] == c["id"] and t["explorer"]["match"] in MATCHED]
        if mine_hit:
            here += 1
        if mine_hit or elsewhere:
            track += 1
        other = "; ".join(sorted({f"{x} {t['term']} p{t['pdfPage']}" for x, t in elsewhere})) or ""
        if mine:
            cell = "; ".join(f"{t['term']} (p{t['pdfPage']}, {t['explorer']['match']})" for t in mine)
        elif c["unit"] not in set(C.EXPLORER_SCOPE[g]):
            cell = "_이 권 범위 밖(다른 권 단원)_"
        elif elsewhere:
            cell = "이 권에 새 정의 없음(앞 권에서 배운 것을 씀)"
        else:
            cell = "**교재에 없음**"
        rows.append(f"| {c['unitTitle']} | {c['name']} (`{c['id']}`) | {esc(cell)} | {esc(other)} |")
    scope = set(C.EXPLORER_SCOPE[g])
    scards = [c for c in gcards if c["unit"] in scope]
    s_here = sum(1 for c in scards if any(t["explorer"]["cardId"] == c["id"] and t["explorer"]["match"] in MATCHED
                                          for t in terms))
    L.append(f"이 권이 다루는 탐험 단원({', '.join(sorted({c['unitTitle'] for c in scards}))}) 카드 중 이 권에 있음: "
             f"**{s_here}/{len(scards)}** ({100 * s_here / max(1, len(scards)):.0f}%)")
    L.append("")
    L.append(f"학년 {grade} 카드 전체로는 이 권에 있음(exact·alias): **{here}/{len(gcards)}** ({100 * here / max(1, len(gcards)):.0f}%) · "
             f"트랙 세 권(1-1·1-2·2-1) 어디엔가 있음: **{track}/{len(gcards)}** ({100 * track / max(1, len(gcards)):.0f}%)")
    L.append("")
    L.append("| 탐험 단원 | 카드 | 이 권의 대응 용어 | 트랙 다른 권 |")
    L.append("|---|---|---|---|")
    L += rows
    L.append("")
    mm = [m for m in C.MISMATCH if m[1] == g]
    L.append(f"## 카드 뜻 문장과 교재 문장이 어긋나는 것 — {len(mm)}건")
    L.append("")
    L.append("무게: `틀림` 뜻이 다르다 · `범위` 넓이·출발점이 다르다 · `표현` 뜻은 같고 말이 다르다 · `학년` 카드 학년과 교재 학년이 다르다"
             " · `동음이의` 이름만 같고 다른 개념.")
    L.append("")
    L.append("| 카드 | 교재 용어 | 무게 | 무엇이 어긋나나 |")
    L.append("|---|---|---|---|")
    by_id = {c["id"]: c for c in cards}
    for cid, _, term, w, note in mm:
        c = by_id[cid]
        L.append(f"| {c['name']} (`{cid}`, 학년 {c['grade']}) «{esc(c['definition'])}» | {esc(term)} | {w} | {esc(note)} |")
    L.append("")
    return NL.join(L)
