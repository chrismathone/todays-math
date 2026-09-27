# -*- coding: utf-8 -*-
"""개념원리 중학 2-2 · 3-1 · 3-2 의 **개념 쪽**을 서식 표시와 함께 글로 꺼낸다 — 트랙 midb.

    python scripts/qa/concept-terms/dump-gaenyeom-concept-midb.py <출력 폴더> [2-2 3-1 3-2]

① 무엇을 하나: 소단원마다 «개념원리 이해» 쪽(제목 쪽 ~ «개념원리 확인하기» 앞)의 줄을 찍는다.
   «…» = 적갈색(새 용어·기호) · ‹…› = 자주색(핵심 구절) · **…** = 굵은 고딕(정의 표제) · […] = 칩(예·참고·증명)
   · 줄 앞 `!` = 수식을 다 못 풀었다(`[수식]`). 사람이 읽고 용어를 고르는 데 쓴다.
② 왜: 용어 목록(`terms-midb.tsv`)을 사람이 고를 때 **지면과 같은 서식**을 봐야 정의·성질이 갈린다.
③ 안 바꾸는 것: N 드라이브 읽기만. 출력 폴더에 `concept-<학년>.txt` 만 쓴다.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gaenyeom_midb as G  # noqa: E402


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    grades = sys.argv[2:] or list(G.GRADES)
    for g in grades:
        b = G.load(g)
        buf = []
        for s in G.sections(b):
            first = b.pages[s["start"] - 1]
            buf.append(f"\n########## {first.part} / {first.header} / {s['title']} (p{s['start']})")
            for pno in s["concept"]:
                p = b.pages[pno - 1]
                buf.append(f"=== p{p.pno} (책 {p.book}쪽)")
                for ln in p.lines:
                    buf.append(("!" if ln.garbled else " ") + " %4.0f %4.0f  %s" % (ln.y, ln.x, ln.marked))
        path = out / f"concept-{g}.txt"
        path.write_text("\n".join(buf), encoding="utf-8")
        print(g, path, len(buf), "줄")


if __name__ == "__main__":
    main()
