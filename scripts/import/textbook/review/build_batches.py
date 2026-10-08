# -*- coding: utf-8 -*-
"""준비된 문항 → 검토 묶음 (교과서 이관 · 2026-10-07).

  python build_batches.py <prepared.jsonl> <units.json> <출력 폴더> [--size 40] [--changed-from <앞 판 prepared.jsonl>] [--figures <그림 폴더>] [--only <문항 번호 목록.json>]

`--changed-from` 을 주면 **본문이나 정답이 앞 판과 달라진 문항만** 묶는다 — 수식 변환을 고쳐 본문이 바뀌면,
앞 판의 검토는 그 문항에 대해 낡았다(고친 본문으로 다시 풀어야 한다). 풀이만 바뀐 문항은 다시 검토하지 않는다.

과목마다 `units/<과목>.json`(차시 목록)과 `batch/<과목>-NNN.json`(문항 묶음)을 쓴다.
묶음에는 **정답을 넣지 않는다** — 검토자가 직접 풀고, 그 답을 `collect.py` 가 출판사 정답과 대조한다.
정답 · 풀이는 `key/<과목>-NNN.json` 에 따로 둔다(검토자에게 주지 않는 파일).

`--figures` 를 주면 그림 문항의 묶음이다 — 문항마다 `figures`(그림 파일의 경로들)를 싣는다. 본문의 `[그림]` 자리에
차례대로 놓이는 그림이고, 검토자가 Read 로 열어 본다(`figures.py --export` 가 낸 `meta.jsonl` · `img/`). 지시서는 `BRIEF-FIG.md`.
그 그림들의 지문(sha)은 `key/` 에 `figureKeys` 로 둔다 — 적재기가 «검토자가 본 그림이 지금 싣는 그림인가»를 견준다.

`--only` 를 주면 그 목록(JSON 배열)에 든 문항만 묶는다 — 추출을 고쳐 그림이 바뀐 문항만 다시 검토할 때.

묶음은 **자료(파일) 차례**로 자른다 — 같은 자료의 문항이 한 묶음에 모여야 단원을 고르기 쉽다.
다시 돌려도 같은 묶음이 나온다(차례는 문항의 열쇠로 정한다).
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

#: 책의 과목 이름 → 차시 목록의 과목 이름
GRADE_ALIAS = {"확률과통계": "확률과 통계"}
#: 풀이가 이보다 짧으면(수식은 한 글자로) 풀이가 아니라 답만 적은 것이다 — 해설을 새로 쓴다
SOLUTION_MIN = 25


def visible(text: str) -> int:
    return len(re.sub(r"\$[^$]*\$", "§", text))


def needs_solution(row: dict) -> bool:
    solution = (row.get("solution") or "").strip()
    return not solution or row.get("solutionFigure") or visible(solution) < SOLUTION_MIN or solution == row["answer"].strip()


def source_hint(row: dict) -> str:
    parts = pathlib.PureWindowsPath(row["path"]).parts
    return " · ".join([row["book"], parts[-2], pathlib.PureWindowsPath(row["path"]).stem])


def main() -> None:
    prepared, units_path, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
    size = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else 40
    rows = [json.loads(line) for line in prepared.open(encoding="utf-8")]
    rows = [row for row in rows if not row["bad"]]
    if "--changed-from" in sys.argv:
        before = {
            row["id"]: (row["content"], row["answer"])
            for row in map(json.loads, pathlib.Path(sys.argv[sys.argv.index("--changed-from") + 1]).open(encoding="utf-8"))
            if not row["bad"]
        }
        rows = [row for row in rows if before.get(row["id"]) != (row["content"], row["answer"])]
    if "--only" in sys.argv:
        only = set(json.loads(pathlib.Path(sys.argv[sys.argv.index("--only") + 1]).read_text(encoding="utf-8")))
        rows = [row for row in rows if row["id"] in only]
    figures: dict[str, list[str]] = {}
    figure_keys: dict[str, list[str]] = {}
    if "--figures" in sys.argv:
        figure_dir = pathlib.Path(sys.argv[sys.argv.index("--figures") + 1])
        for meta in map(json.loads, (figure_dir / "meta.jsonl").open(encoding="utf-8")):
            figures[meta["id"]] = [str(figure_dir / "img" / pathlib.PurePosixPath(item["file"])) for item in meta["figures"]]
            figure_keys[meta["id"]] = [item["sha"] for item in meta["figures"]]
    units = json.loads(units_path.read_text(encoding="utf-8"))
    for name in ("units", "batch", "key", "out"):
        (out / name).mkdir(parents=True, exist_ok=True)

    by_grade: dict[str, list[dict]] = {}
    for row in rows:
        by_grade.setdefault(GRADE_ALIAS.get(row["grade"], row["grade"]), []).append(row)

    index = []
    for grade, items in sorted(by_grade.items()):
        listed = [u for u in units if u["grade"] == grade]
        if not listed:
            raise SystemExit(f"차시 목록에 «{grade}» 가 없다")
        (out / "units" / f"{grade}.json").write_text(
            json.dumps([{"u": n, "chapter": u["chapter"], "section": u["section"]} for n, u in enumerate(listed, 1)], ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
        items.sort(key=lambda row: (row["path"], row["section"], row["number"]))
        for start in range(0, len(items), size):
            chunk = items[start : start + size]
            name = f"{grade}-{start // size + 1:03d}"
            batch = [
                {"i": i, "from": source_hint(row), "lines": row["content"].split("\n"), "needSolution": bool(needs_solution(row)),
                 **({"figures": figures[row["id"]]} if row["id"] in figures else {})}
                for i, row in enumerate(chunk, 1)
            ]
            key = [
                {"i": i, "id": row["id"], "answer": row["answer"], "answerFrom": row["answerFrom"], "solution": row.get("solution"),
                 "solutionFigure": row.get("solutionFigure", False), "needSolution": bool(needs_solution(row)),
                 **({"figureKeys": figure_keys[row["id"]]} if row["id"] in figure_keys else {})}
                for i, row in enumerate(chunk, 1)
            ]
            (out / "batch" / f"{name}.json").write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
            (out / "key" / f"{name}.json").write_text(json.dumps(key, ensure_ascii=False, indent=1), encoding="utf-8")
            index.append({"name": name, "grade": grade, "count": len(chunk), "needSolution": sum(b["needSolution"] for b in batch)})
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"묶음 {len(index)} · 문항 {sum(b['count'] for b in index)} · 해설을 새로 쓸 것 {sum(b['needSolution'] for b in index)}")
    for grade in sorted(by_grade):
        mine = [b for b in index if b["grade"] == grade]
        print(f"  {grade}: 묶음 {len(mine)} · 문항 {sum(b['count'] for b in mine)}")


if __name__ == "__main__":
    main()
