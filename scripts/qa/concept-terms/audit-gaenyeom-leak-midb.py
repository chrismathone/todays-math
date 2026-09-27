# -*- coding: utf-8 -*-
"""교재 원문이 저장소로 새는지 잰다 — 트랙 midb(개념원리 중학 2-2 · 3-1 · 3-2).

    python scripts/qa/concept-terms/audit-gaenyeom-leak-midb.py                 # 작업 트리의 트랙 파일
    git log -p main..HEAD | python scripts/qa/concept-terms/audit-gaenyeom-leak-midb.py --stdin   # 커밋 이력

① 무엇을 하나: 저장소 밖의 교재 글(전체 JSON 의 `sentence` · `cite`, 목록의 `anchor`, 버림 목록의 후보 글)을
   공백·`$` 를 뺀 뒤 WINDOW 글자 창으로 잘라, 저장소 파일(또는 표준 입력)에서 찾는다. 하나라도 나오면 종료 코드 1.
② 왜: 원장님 2026-09-28 — 시중 교재 원문은 저장소 밖. 손으로 «인용 없음»을 확인하면 놓친다(비고 · 주석 · 까닭 칸).
   허용 목록: 용어 이름 · 별칭 · 대단원/중단원/소단원 이름 · 목차 · 탐험 카드 이름과 뜻(우리 제품 글) — 창이 이 안에
   통째로 들면 샌 것으로 치지 않는다.
③ 안 바꾸는 것: 읽기만 한다.
"""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
spec = importlib.util.spec_from_file_location("build_midb", HERE / "build-gaenyeom-terms-midb.py")
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)

WINDOW = 12
#: 창에 한글이 이만큼은 있어야 센다 — 식 조각(«\overline{AB}=\overline{AC}»)은 교재 글이 아니라 수학이다.
MIN_HANGUL = 6
GRADES = ("2-2", "3-1", "3-2")
TARGETS = [
    *(REPO / "docs" / "reference" / "concept-terms" / f"gaenyeom-{g}{suf}" for g in GRADES for suf in (".json", ".md", "-explorer.md")),
    *sorted(p for p in HERE.glob("*midb*") if p.is_file()),
    HERE / "gaenyeom_midb.py",
]


def norm(s: str) -> str:
    # 인용 기호도 뺀다 — «용어 이름»처럼 허용된 이름을 감싼 기호 때문에 창이 허용 목록과 어긋나지 않게.
    return re.sub(r"[\s$«»‘’“”'\"]", "", s)


def sources() -> tuple[list[str], list[str]]:
    texts, allow = [], []
    for g in GRADES:
        d = json.loads((B.DATA / f"gaenyeom-{g}.json").read_text(encoding="utf-8"))
        for t in d["terms"]:
            texts += [t.get("sentence", ""), t.get("cite", "")]
            allow += [t["term"], *t["aliases"], t.get("part") or "", t.get("chapter") or "", t.get("section") or ""]
        for ch in d["toc"]:
            allow += [ch["chapter"], ch.get("part") or "", *ch["sections"], *ch.get("tocSections", [])]
    for row in B.read_tsv(B.TERMS, 9):
        texts.append(row[4])  # anchor
    for row in B.read_tsv(B.REJECTS, 4):
        texts.append(row[2])  # 후보 글(교재 제목·구절)
    cards = B.load_cards()
    allow += [c["name"] for c in cards["cards"]] + [c["definition"] for c in cards["cards"]]
    return texts, allow


def windows(texts: list[str], allow: list[str]) -> set[str]:
    allow_n = [norm(a) for a in allow if a]
    out = set()
    for t in texts:
        n = norm(t)
        for i in range(0, max(0, len(n) - WINDOW) + 1):
            w = n[i:i + WINDOW]
            if len(w) < WINDOW or len(re.findall(r"[가-힣]", w)) < MIN_HANGUL:
                continue
            if any(w in a for a in allow_n):
                continue
            out.add(w)
    return out


def main() -> None:
    texts, allow = sources()
    ws = windows(texts, allow)
    if "--stdin" in sys.argv:
        blobs = [("표준 입력", sys.stdin.buffer.read().decode("utf-8", "replace"))]
    else:
        blobs = [(str(p.relative_to(REPO)), p.read_text(encoding="utf-8")) for p in TARGETS if p.exists()]
    hits = 0
    for name, blob in blobs:
        nb = norm(blob)
        found = sorted(w for w in ws if w in nb)
        if found:
            hits += len(found)
            print(f"✗ {name}: {len(found)}창 — 예: {found[:5]}")
        else:
            print(f"✓ {name}")
    print(f"창 {len(ws)}개 · 걸린 창 {hits}")
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
