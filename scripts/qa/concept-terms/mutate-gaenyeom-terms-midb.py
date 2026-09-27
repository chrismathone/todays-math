# -*- coding: utf-8 -*-
"""발견기 변이 시험 — 목록(`terms-midb.tsv`)에서 용어를 **하나씩 빼고** 발견기가 그 빈자리를 잡는지 센다. 트랙 midb.

    python scripts/qa/concept-terms/mutate-gaenyeom-terms-midb.py

① 무엇을 하나: 권마다 빌더의 `build_grade` 로 기준(빼지 않음)을 세우고, 용어 줄을 하나씩 뺀 목록으로 발견기 후보의
   걸림을 다시 따진다. 뺀 뒤 «안 걸림» 후보가 하나라도 생기면 «잡힘». 안 잡힌 용어는 발견기가 **보지 못하는**
   용어다 — 사람이 읽어서만 찾은 것이거나, 같은 소단원의 다른 용어가 가려 주는 것.
② 왜: 발견기의 «안 걸림 0»이 «빠짐이 없다»인지 «못 센다»인지 가른다(18 §2-7 · 20 «가드가 0을 내면 못 센다»).
   변이 뒤 걸림 판정은 빌더의 `covered` 를 그대로 부른다(규칙을 옮겨 적지 않는다).
③ 안 바꾸는 것: 아무 파일도 쓰지 않는다. N 드라이브 읽기만.
"""
from __future__ import annotations

import collections
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gaenyeom_midb as G  # noqa: E402

spec = importlib.util.spec_from_file_location("build_midb", HERE / "build-gaenyeom-terms-midb.py")
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)


def main() -> None:
    rows = B.read_tsv(B.TERMS, 9)
    rej_rows = B.read_tsv(B.REJECTS, 4)
    total = caught = 0
    for grade in G.GRADES:
        base = B.build_grade(grade, rows, rej_rows, collections.defaultdict(list), set(), [])
        assert not base["uncovered"], f"{grade} 기준에서 이미 안 걸림 {len(base['uncovered'])}"
        entries, cands, rejects, secs, book = base["entries"], base["cands"], base["rejects"], base["secs"], base["book"]
        missed = []
        for k, e in enumerate(entries):
            rest = entries[:k] + entries[k + 1:]
            hit = [c for c in cands if B.covered(c, rest, rejects, secs, book) is None]
            total += 1
            if hit:
                caught += 1
            else:
                missed.append(e)
        by_kind = collections.Counter(e["kind"] for e in missed)
        print(f"{grade}: 뺀 용어 {len(entries)} · 잡힘 {len(entries) - len(missed)} · 안 잡힘 {len(missed)} {dict(by_kind)}")
        for e in missed:
            print(f"   - p{e['pdfPage']} {e['term']} [{e['kind']}]")
    print(f"합계: {total} 중 {caught} 잡힘 ({caught * 100 // max(total, 1)}%)")


if __name__ == "__main__":
    main()
