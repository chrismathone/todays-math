# -*- coding: utf-8 -*-
"""지면 검토자의 출력 → `checked.jsonl` (교과서 이관 · 2026-10-07).

  python check_collect.py <검토 폴더>

`out/<묶음>.txt` 의 `### i` 덩이를 읽어 문항마다 한 줄을 쓴다:
  { id, key, batch, i, content: ok|flaw, contentWhy, solution: keep|replace|none, solutionWhy, newSolution }
`key` 는 검토자가 본 글의 지문이다(`check_batches.py` 가 `key/` 에 둔 것) — 적재기가 지금 글의 지문과 견준다.

판정이 꼴에 안 맞는 덩이는 **쓰지 않는다**(그 문항은 «아직 검토받지 않음»으로 남아 잠긴 채다):
  - `content` 가 ok · flaw 가 아니다 / `solution` 이 keep · replace · none 이 아니다
  - 후보가 없는데 `keep` 이다 / 후보가 있는데 `none` 이다
  - `replace` · `none` 인데 새 해설이 없다 — 단, 본문이 `flaw` 면 해설이 없어도 된다(어차피 잠긴다)
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FIELDS = ("content", "why", "solution", "solwhy")
#: 검토자가 셸로 파일을 쓰면 LaTeX 명령의 역슬래시 + 첫 글자가 제어 글자가 된다(`\times` → 탭 + imes).
#: 🔴 파일은 바이트로 읽는다 — 글로 읽으면 `\r`(= `\right` 의 머리)이 줄바꿈으로 바뀌어 여기서 못 알아본다(첫 검토의 11문항).
_BROKEN_ESCAPES = (
    ("\t", "t", r"imes|heta|an(?![a-z])|ext|riangle|o(?![a-z])|au|herefore|frac|ilde"),
    ("\x0c", "f", r"rac|orall|rown"),
    ("\x08", "b", r"egin|ar(?![a-z])|eta|igcirc|oxed|inom|ecause|ullet|ot(?![a-z])"),
    ("\r", "r", r"ight|ho(?![a-z])|angle"),
    ("\x07", "a", r"lpha|ngle|pprox|st(?![a-z])"),
    ("\x0b", "v", r"ec(?![a-z])|arnothing|ert|dots"),
)


def repair_escapes(text: str) -> str:
    for control, letter, tails in _BROKEN_ESCAPES:
        text = re.sub(re.escape(control) + rf"(?={tails})", lambda _m, letter=letter: "\\" + letter, text)
    return text.replace("\r\n", "\n").replace("\r", "\n")


def parse_output(text: str) -> dict[int, dict]:
    """`### i` 덩이들 → {i: {content, why, solution, solwhy, new}}"""
    blocks: dict[int, dict] = {}
    for chunk in re.split(r"(?m)^###\s*", repair_escapes(text)):
        head = re.match(r"(\d+)\s*\n", chunk)
        if not head:
            continue
        body = chunk[head.end():]
        cut = re.search(r"(?m)^new:[ \t]*", body)
        fields_part = body[: cut.start()] if cut else body
        new = body[cut.end():].strip() if cut else ""
        new = re.sub(r"^```\w*\n?|\n?```$", "", new).strip()
        record: dict = {"new": new}
        for name in FIELDS:
            match = re.search(rf"(?m)^{name}:[ \t]*(.*)$", fields_part)
            record[name] = match.group(1).strip() if match else ""
        blocks[int(head.group(1))] = record
    return blocks


def judge(block: dict, has_solution: bool) -> tuple[dict | None, str | None]:
    """덩이 하나 → (쓸 줄, 버리는 까닭)."""
    content = block["content"].lower()
    solution = block["solution"].lower()
    if content not in ("ok", "flaw"):
        return None, f"content={block['content']!r}"
    if solution not in ("keep", "replace", "none"):
        return None, f"solution={block['solution']!r}"
    if solution == "keep" and not has_solution:
        return None, "후보가 없는데 keep"
    if solution == "none" and has_solution:
        # 후보가 있는데 none — 새 해설을 썼으면 replace 로 읽는다
        solution = "replace"
    if solution != "keep" and not block["new"] and content == "ok":
        return None, "새 해설이 없다"
    return (
        {
            "content": content,
            "contentWhy": block["why"] or None,
            "solution": solution,
            "solutionWhy": block["solwhy"] or None,
            "newSolution": block["new"] or None if solution != "keep" else None,
        },
        None,
    )


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    index = json.loads((root / "index.json").read_text(encoding="utf-8"))
    counts = {"content": {}, "solution": {}}
    problems: list[str] = []
    done = missing = 0
    with (root / "checked.jsonl").open("w", encoding="utf-8") as out:
        for batch in index:
            name = batch["name"]
            result = root / "out" / f"{name}.txt"
            if not result.exists():
                continue
            done += 1
            blocks = parse_output(result.read_bytes().decode("utf-8"))
            for key in json.loads((root / "key" / f"{name}.json").read_text(encoding="utf-8")):
                block = blocks.get(key["i"])
                if block is None:
                    missing += 1
                    problems.append(f"{name} #{key['i']}: 출력에 없다")
                    continue
                record, why = judge(block, key["hasSolution"])
                if record is None:
                    missing += 1
                    problems.append(f"{name} #{key['i']}: {why}")
                    continue
                for field in ("content", "solution"):
                    counts[field][record[field]] = counts[field].get(record[field], 0) + 1
                out.write(json.dumps({"id": key["id"], "key": key["key"], "batch": name, "i": key["i"], **record}, ensure_ascii=False) + "\n")
    print(f"묶음 {done}/{len(index)} · 판정 {sum(counts['content'].values())} · 못 쓴 덩이 {missing}")
    print("  본문:", json.dumps(counts["content"], ensure_ascii=False))
    print("  해설:", json.dumps(counts["solution"], ensure_ascii=False))
    if problems:
        print(f"  꼴이 어긋난 출력 {len(problems)}:", *problems[:15], sep="\n    ")


if __name__ == "__main__":
    main()
