# -*- coding: utf-8 -*-
"""«다르다»로 나온 문항 → 둘째 검토 묶음 (교과서 이관 · 2026-10-07).

  python build_judge.py <검토 폴더> [--size 40]

`reviewed.jsonl` 의 `differ` 를 과목 차례로 모아 `judge/batch/J-NNN.json` 을 쓴다. 둘째 검토자에게는 본문 · 두 답 ·
정답지의 풀이 글을 **다 준다** — 여기서 가르는 것은 «누가 옳은가»라서 감출 것이 없다.
어느 문항이 어느 묶음의 몇 번인지는 `judge/index.json` 에 적는다(둘째 검토자에게 주지 않는다).
"""
from __future__ import annotations

import json
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    size = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else 40
    rows = [json.loads(line) for line in (root / "reviewed.jsonl").open(encoding="utf-8")]
    differ = [row for row in rows if row["verdict"] == "differ"]
    (root / "judge" / "batch").mkdir(parents=True, exist_ok=True)
    (root / "judge" / "out").mkdir(parents=True, exist_ok=True)

    batches: dict[str, list] = {}
    keys: dict[str, list] = {}

    def load(kind: str, name: str) -> list:
        cache = batches if kind == "batch" else keys
        if name not in cache:
            cache[name] = json.loads((root / kind / f"{name}.json").read_text(encoding="utf-8"))
        return cache[name]

    index = []
    for start in range(0, len(differ), size):
        chunk = differ[start : start + size]
        name = f"J-{start // size + 1:03d}"
        items = []
        for i, row in enumerate(chunk, 1):
            item = load("batch", row["batch"])[row["i"] - 1]
            key = load("key", row["batch"])[row["i"] - 1]
            lines = [line for n, line in enumerate(item["lines"]) if n not in set(row.get("drop") or [])]
            items.append({
                "i": i,
                "lines": lines,
                "mine": row["answer"],
                "key": key["answer"],
                "bookSolution": key.get("solution"),
                "needSolution": bool(key["needSolution"]),
            })
            index.append({"judge": name, "i": i, "id": row["id"]})
        (root / "judge" / "batch" / f"{name}.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    (root / "judge" / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"둘째 검토 — 문항 {len(differ)} · 묶음 {(len(differ) + size - 1) // size}")


if __name__ == "__main__":
    main()
