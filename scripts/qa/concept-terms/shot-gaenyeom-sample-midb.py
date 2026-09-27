# -*- coding: utf-8 -*-
"""표본 대조용 — 권마다 개념 쪽 5장을 무작위(씨앗 고정)로 골라 렌더하고, 그 쪽에 적힌 용어를 옆에 적는다. 트랙 midb.

    python scripts/qa/concept-terms/shot-gaenyeom-sample-midb.py <출력 폴더> [--extra 3-1:150,3-1:202]

① 무엇을 하나: 개념 쪽 목록에서 `random.Random(SEED)` 로 5장을 뽑아 PNG 로 찍고, 같은 이름의 `.txt` 에
   JSON(`docs/reference/concept-terms/gaenyeom-<학년>.json`)이 그 쪽에 적은 용어를 쓴다. `--extra` 는 더 찍을 쪽
   (용어 0 소단원 확인용).
② 왜: 사람이 지면을 보고 «놓친 것 · 잘못 넣은 것»을 센다(공통 규칙 «표본 대조»). 씨앗을 고정해 다시 돌려도 같은 쪽.
③ 안 바꾸는 것: N 드라이브 읽기만. 출력 폴더에만 쓴다.
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import pymupdf

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(HERE))
import gaenyeom_midb as G  # noqa: E402

SEED = 20260928
N = 5
ZOOM = 1.6


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    extra: list[tuple[str, int]] = []
    if "--extra" in sys.argv:
        for tok in sys.argv[sys.argv.index("--extra") + 1].split(","):
            g, p = tok.split(":")
            extra.append((g, int(p)))
    rng = random.Random(SEED)
    for g in G.GRADES:
        book = G.load(g)
        pages = sorted({p for s in G.sections(book) for p in s["concept"]})
        pick = sorted(rng.sample(pages, N))
        data = json.loads((REPO / "docs" / "reference" / "concept-terms" / f"gaenyeom-{g}.json").read_text(encoding="utf-8"))
        doc = pymupdf.open(G.book_path(g))
        for pno in pick + [p for gg, p in extra if gg == g]:
            png = out / f"{g}-p{pno:03d}.png"
            doc[pno - 1].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM)).save(png)
            terms = [t for t in data["terms"] if t["pdfPage"] == pno]
            lines = [f"{g} p{pno} (책 {book.pages[pno - 1].book}쪽) — JSON 용어 {len(terms)}개"]
            lines += [f"  · {t['term']} [{t['kind']}]" for t in terms]
            (out / f"{g}-p{pno:03d}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
            print(png.name, len(terms), "개")
        print(g, "표본:", pick)


if __name__ == "__main__":
    main()
