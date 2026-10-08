# -*- coding: utf-8 -*-
"""적재 계획(`load/plan.json`) → 지면 검토 묶음 (교과서 이관 · 2026-10-07).

  python check_batches.py <작업 폴더> [--out final-check] [--size 100] [--all]

첫 검토는 «풀 수 있나 · 답이 맞나»를 봤다. 이 검토는 **실으려는 글 그대로**(표기를 손질한 본문 · 확인된 정답 ·
해설 후보)를 읽고 «지면에 낼 꼴인가 · 해설이 이 문항의 풀이인가»를 본다(지시서 `BRIEF.md`).

묶음에는 계획의 줄을 그대로 싣는다 — 검토자가 본 글과 적재기가 실을 글이 같아야 한다. 줄마다 그 글의 지문(`checkKey`)을
`key/` 에 따로 두고, 수집기(`check_collect.py`)가 판정에 붙인다. 적재기는 지문이 지금 글과 다르면 그 판정을 버린다.

기본은 **아직 검토받지 않은 줄만** 묶는다(계획의 `hold` 에 «지면 검토를 아직 받지 않았다»). `--all` 은 전부.
다시 돌려도 같은 묶음이 나온다(차례는 과목 · 문항의 열쇠).
"""
from __future__ import annotations

import json
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PENDING = "지면 검토를 아직 받지 않았다"
FROM = {"original": "교과서", "ai": "검토자", None: None}


def item_of(number: int, row: dict) -> dict:
    solution = row.get("candidateSolution")
    return {
        "i": number,
        "grade": row["grade"],
        "unit": f"{row['chapter']} > {row['section']}",
        "lines": row["content"].split("\n"),
        "answer": row["answer"],
        "solution": solution.split("\n") if solution else None,
        "solutionFrom": FROM[row.get("candidateFrom")] if solution else None,
    }


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    option = lambda name, default: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default  # noqa: E731
    out = root / option("--out", "final-check")
    size = int(option("--size", "100"))
    rows = json.loads((root / "load" / "plan.json").read_text(encoding="utf-8"))["rows"]
    if "--all" not in sys.argv:
        rows = [row for row in rows if PENDING in row["hold"]]
    for name in ("batch", "key", "out"):
        (out / name).mkdir(parents=True, exist_ok=True)

    by_grade: dict[str, list[dict]] = {}
    for row in rows:
        by_grade.setdefault(row["grade"], []).append(row)
    index = []
    for grade, items in sorted(by_grade.items()):
        items.sort(key=lambda row: row["externalId"])
        for start in range(0, len(items), size):
            chunk = items[start : start + size]
            name = f"{grade}-{start // size + 1:03d}"
            (out / "batch" / f"{name}.json").write_text(
                json.dumps([item_of(i, row) for i, row in enumerate(chunk, 1)], ensure_ascii=False, indent=1), encoding="utf-8"
            )
            (out / "key" / f"{name}.json").write_text(
                json.dumps(
                    [{"i": i, "id": row["externalId"], "key": row["checkKey"], "hasSolution": bool(row.get("candidateSolution"))} for i, row in enumerate(chunk, 1)],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            index.append({"name": name, "grade": grade, "count": len(chunk)})
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    with_solution = sum(1 for row in rows if row.get("candidateSolution"))
    print(json.dumps({"rows": len(rows), "batches": len(index), "withSolution": with_solution, "withoutSolution": len(rows) - with_solution}, ensure_ascii=False))


if __name__ == "__main__":
    main()
