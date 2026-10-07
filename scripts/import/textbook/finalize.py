# -*- coding: utf-8 -*-
"""검토를 지난 문항의 글을 지면에 낼 꼴로 마무리한다 (교과서 이관 · 2026-10-07).

  python finalize.py <작업 폴더> --prepared prepared2 --review review --review review2 …

`prepare.py` 뒤에 손보고 싶은 것이 생겨도 **`prepare.py` 를 다시 돌리지 않는다** — 검토자가 본 본문이 바뀌면 그 검토가
낡는다(적재기가 «검토 뒤에 본문이 바뀌었다»로 뺀다). 뜻을 안 바꾸는 손질은 여기서, 검토가 끝난 글에 한다:

  본문 — 검토자가 본 줄에서 «문항이 아닌 줄»(`drop`)을 뺀 뒤, 줄 끝에서 끊긴 글을 **폭으로 재서** 다시 잇는다
         (수식이 긴 줄은 보이는 글자로 세면 짧아 보여 첫 손질에서 빠졌다 — «항등식일 / 때, 상수 …»)
  풀이 — 보기 번호로 시작하는 줄도 잇는다(«① … 정삼각형 / 으로 같다») · 서술형 채점 단계 표지(`◀ ㉮`)를 걷는다
  수식 — `+-` 는 ±(한글 수식의 그 낱말을 변환이 놓쳤다) · `\\mathrm{A}B` 는 `\\mathrm{AB}`(곧은 글자는 띄어쓰기까지다)

쓰는 것: `final/final.jsonl` — 문항 하나에 한 줄(`id` · `content` · `answerTidy` · `solution`). 적재기가 있으면 이것을 쓴다.

🔴 여기서 하는 일은 전부 **글자를 안 바꾸는** 손질이어야 한다(줄바꿈 · 띄어쓰기 · 표기). 값이 바뀌는 손질은 검토 앞(`prepare.py`)에 둔다.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from normalize import Corpus, join_wrapped  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

_MATH = re.compile(r"\$[^$]*\$")
#: 서술형 풀이의 채점 단계 표지 — «◀ ㉮» · «◀ ㉰ 단계»
_STEP_MARK = re.compile(r"[ \t]*◀\s*[㉮-㉻]\s*(?:단계)?")
#: 곧은 글자 뒤에 바로 붙은 글자 — `\mathrm{A}B` · `\mathrm{k}m` · `\mathrm{c}m^{2}`
_ROMAN_SPLIT = re.compile(r"\\mathrm\{([A-Za-z]+)\}([A-Za-z]+)")


def tidy_math(text: str) -> str:
    """수식 안의 표기만 — 값은 그대로다."""

    def fix(match: re.Match) -> str:
        body = match.group(0)
        # 한글 수식의 `+-` 는 ± 다(`x=+-1`). 변환이 낱말로 못 알아봐 두 기호로 남았다
        body = re.sub(r"\+-(?=\s*[\d\\a-zA-Z(])", r"\\pm ", body)
        previous = None
        while previous != body:
            previous, body = body, _ROMAN_SPLIT.sub(r"\\mathrm{\1\2}", body)
        return body

    return _MATH.sub(fix, text)


def finish_content(lines: list[str], drop: list[int], corpus: Corpus) -> str:
    kept = [line for index, line in enumerate(lines) if index not in set(drop)]
    return tidy_math(join_wrapped("\n".join(kept), corpus, by_width=True)).strip()


def finish_solution(text: str, corpus: Corpus) -> str:
    text = "\n".join(_STEP_MARK.sub("", line) for line in text.split("\n"))
    return tidy_math(join_wrapped(text, corpus, by_width=True, choice_guard=False)).strip()


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    option = lambda name: [sys.argv[i + 1] for i, arg in enumerate(sys.argv) if arg == name]  # noqa: E731
    prepared_dir = (option("--prepared") or ["prepared"])[0]
    review_dirs = option("--review") or ["review"]

    corpus = Corpus()
    for line in (root / "extract2" / "problems.jsonl").open(encoding="utf-8"):
        row = json.loads(line)
        corpus.feed(row["content"])
        if row.get("solution"):
            corpus.feed(row["solution"])

    prepared = {row["id"]: row for row in map(json.loads, (root / prepared_dir / "prepared.jsonl").open(encoding="utf-8"))}
    winner: dict[str, tuple[dict, list[str]]] = {}
    for folder in review_dirs:
        batches: dict[str, list] = {}
        for review in map(json.loads, (root / folder / "reviewed.jsonl").open(encoding="utf-8")):
            if review["batch"] not in batches:
                batches[review["batch"]] = json.loads((root / folder / "batch" / f"{review['batch']}.json").read_text(encoding="utf-8"))
            winner[review["id"]] = (review, batches[review["batch"]][review["i"] - 1]["lines"])

    (root / "final").mkdir(exist_ok=True)
    counts = {"rows": 0, "contentJoined": 0, "solutionChanged": 0, "mathTidied": 0}
    with (root / "final" / "final.jsonl").open("w", encoding="utf-8") as out:
        for rid, (review, lines) in winner.items():
            source = prepared.get(rid)
            if source is None:
                continue
            plain = "\n".join(line for index, line in enumerate(lines) if index not in set(review.get("drop") or []))
            content = finish_content(lines, review.get("drop") or [], corpus)
            solution = finish_solution(source["solution"], corpus) if source.get("solution") else None
            counts["rows"] += 1
            counts["contentJoined"] += content.count("\n") != plain.count("\n")
            counts["solutionChanged"] += bool(solution) and solution != source["solution"].strip()
            counts["mathTidied"] += tidy_math(plain) != plain
            out.write(json.dumps({"id": rid, "content": content, "solution": solution}, ensure_ascii=False) + "\n")
    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
