# -*- coding: utf-8 -*-
"""개념원리 1-1 · 1-2 · 2-1 개념 쪽의 **노란 형광펜 띠**를 전수로 센다 — 트랙 mida 의 독립 대조.

    python scripts/qa/concept-terms/census-gaenyeom-highlight-mida.py [out.json]

① 무엇을 하나: 개념 쪽마다 노랑 채움 사각형(R>0.9, G>0.85, B<0.7, 높이 8~24pt, 폭>20pt)을 찾아
   그 띠에 걸린 낱말을 뽑는다. 결과는 JSON(권 → [{page, rect, text}])으로 낸다.
② 왜: 용어 추출기의 자동 후보는 **글자**(붉은 글씨·굵은 고딕·«：»·«~라 한다»)만 본다. 형광펜은 **그림**
   (벡터 채움)이라 글자층에 없다 — 세는 쪽과 다른 근거로 «빠진 성질»을 찾는 그물이다(18 §2-1).
   2026-09-28 실측: 1-1 71 · 1-2 94 · 2-1 81 띠. 대부분 넣은 용어의 뜻 문장 속 구절이었고, 새로 찾은 것은
   1-1 p35 서로소인 두 수의 최소공배수 사실 하나(이름 없는 성질 → 애매 목록).
③ 무엇을 안 바꾸나: 읽기만 한다. 판정은 사람이 한다(띠는 대부분 구절 조각이라 기계 판정이 안 된다).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gaenyeom_pages_mida as g  # noqa: E402


def yellow_band(dr: dict) -> bool:
    f, r = dr.get("fill"), dr["rect"]
    return bool(f) and dr.get("type") in ("f", "fs") and f[0] > 0.9 and f[1] > 0.85 and f[2] < 0.7 \
        and 8 < r.height < 24 and r.width > 20


def main() -> None:
    out = {}
    for gr in ["1-1", "1-2", "2-1"]:
        book = g.load_book(gr)
        doc = pymupdf.open(g.BOOKS[gr])
        rows = []
        for pno in book.concept:
            page = doc[pno - 1]
            words = page.get_text("words")
            for dr in page.get_drawings():
                if yellow_band(dr):
                    r = dr["rect"]
                    text = " ".join(w[4] for w in words if pymupdf.Rect(w[:4]).intersects(r))
                    rows.append({"page": pno, "rect": [round(x) for x in r], "text": text})
        out[gr] = rows
        print(gr, len(rows), file=sys.stderr)
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    body = json.dumps(out, ensure_ascii=False, indent=1)
    if dest:
        dest.write_text(body, encoding="utf-8")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(body)


if __name__ == "__main__":
    main()
