# -*- coding: utf-8 -*-
"""둘째 검토의 판정을 모은다 (교과서 이관 · 2026-10-07).

  python collect_judge.py <검토 폴더>

`judge/out/J-NNN.txt` 를 읽어 `judged.jsonl` 을 쓴다 — 문항 하나에 한 줄(`id` · `verdict` · `final` · `why` · `solution`).
적재기(`load-school-textbook.ts`)는 `same` · `mine` · `key` 만 싣고, `neither` · `unsure` 는 까닭과 함께 남긴다.

🔴 `same` · `mine` · `key` 인데 `final` 이 비어 있으면 `missing` 으로 내린다 — 실을 답이 없는 판정은 판정이 아니다.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from collect import repair_escapes  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

VERDICTS = {"same", "mine", "key", "neither", "unsure"}


def parse_judge(text: str) -> dict[int, dict]:
    text = repair_escapes(text)
    blocks: dict[int, dict] = {}
    for chunk in re.split(r"(?m)^###\s*", text):
        head = re.match(r"(\d+)\s*\n", chunk)
        if not head:
            continue
        body = chunk[head.end():]
        cut = re.search(r"(?m)^solution:[ \t]*", body)
        fields = body[: cut.start()] if cut else body
        solution = body[cut.end():].strip() if cut else ""
        solution = re.sub(r"^```\w*\n?|\n?```$", "", solution).strip()
        record = {"solution": solution or None}
        for name in ("verdict", "final", "why"):
            match = re.search(rf"(?m)^{name}:[ \t]*(.*)$", fields)
            record[name] = match.group(1).strip() if match else ""
        blocks[int(head.group(1))] = record
    return blocks


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    index = json.loads((root / "judge" / "index.json").read_text(encoding="utf-8"))
    parsed: dict[str, dict[int, dict]] = {}
    counts: dict[str, int] = {}
    with (root / "judged.jsonl").open("w", encoding="utf-8") as out:
        for entry in index:
            name = entry["judge"]
            if name not in parsed:
                path = root / "judge" / "out" / f"{name}.txt"
                parsed[name] = parse_judge(path.read_text(encoding="utf-8")) if path.exists() else {}
            block = parsed[name].get(entry["i"])
            if block is None or block["verdict"] not in VERDICTS:
                record = {"id": entry["id"], "verdict": "missing"}
            elif block["verdict"] in ("same", "mine", "key") and not block["final"]:
                record = {"id": entry["id"], "verdict": "missing", "why": "실을 답이 비어 있다"}
            else:
                record = {"id": entry["id"], **block}
            counts[record["verdict"]] = counts.get(record["verdict"], 0) + 1
            out.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(f"둘째 검토 {len(index)}문항 — " + " · ".join(f"{k} {v}" for k, v in sorted(counts.items(), key=lambda kv: -kv[1])))


if __name__ == "__main__":
    main()
