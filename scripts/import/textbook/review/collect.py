# -*- coding: utf-8 -*-
"""검토자의 답 ↔ 출판사 정답 (교과서 이관 · 2026-10-07).

  python collect.py <검토 폴더> [--report out.md]

`out/<묶음>.txt`(검토자가 쓴 것)를 읽어 `key/<묶음>.json`(출판사 정답)과 문항마다 대조하고 `reviewed.jsonl` 을 쓴다.

판정(`verdict`):
  match     검토자의 답과 출판사 정답이 같다 — **실을 수 있다**
  differ    둘 다 답이 있는데 다르다 — 정답이 잘못 붙었거나, 검토자가 틀렸거나, 표기만 다른 것(사람 · 둘째 검토가 가른다)
  no-answer 검토자가 답을 비웠다(못 풀었다 · 확신이 없다)
  not-ok    검토자가 «실을 수 없는 문항»이라 했다(그림이 없으면 못 푼다 · 글이 깨졌다 · 붙은 문항 …)
  missing   검토자의 출력에 이 문항이 없다(묶음을 다시 돌린다)

🔴 대조는 **표기를 접어서** 한다(띄어쓰기 · `\\dfrac`/`\\frac` · `\\left`/`\\right` · 단위 글자). 접어도 다르면 `differ` 다 —
   «같아 보이는데 다른 것»을 같다고 하지 않는다. 틀리게 같다고 하면 틀린 답이 시험지에 나간다.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FIELDS = ("ok", "why", "drop", "answer", "unit", "unit2", "type", "level", "format", "nofig")
TYPES = {"계산", "개념", "활용"}
LEVELS = {"연산", "기본", "응용", "심화하", "심화중", "심화상"}
FORMATS = {"객관식", "단답형", "서술형"}
CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"


#: 역슬래시가 제어 문자로 깨진 LaTeX 명령 — 검토자가 파일을 쓸 때 `\times` 의 `\t` 가 탭으로, `\frac` 의 `\f` 가
#: 쪽 넘김으로 들어간 것(170묶음 가운데 6묶음 · 91자리). 뒤따르는 글자가 그 명령의 나머지일 때만 되살린다.
_BROKEN_ESCAPES = (
    ("\t", "t", r"imes|heta|an(?![a-z])|ext|riangle|o(?![a-z])|au|herefore|frac|ilde"),
    ("\x0c", "f", r"rac|orall|rown"),
    ("\x08", "b", r"egin|ar(?![a-z])|eta|igcirc|oxed|inom|ecause|ullet|ot(?![a-z])"),
    ("\r", "r", r"ight|ho(?![a-z])|ightarrow"),
)


def repair_escapes(text: str) -> str:
    for control, letter, tails in _BROKEN_ESCAPES:
        text = re.sub(re.escape(control) + rf"(?={tails})", lambda _m, letter=letter: "\\" + letter, text)
    # 남은 `\r` 은 줄 끝이다(파일을 바이트로 읽으므로 여기서 맞춘다)
    return text.replace("\r\n", "\n").replace("\r", "\n")


def parse_output(text: str) -> dict[int, dict]:
    """`### i` 덩이들 → {i: {ok, why, drop, answer, unit, unit2, type, level, format, solution}}"""
    text = repair_escapes(text)
    blocks: dict[int, dict] = {}
    for chunk in re.split(r"(?m)^###\s*", text):
        head = re.match(r"(\d+)\s*\n", chunk)
        if not head:
            continue
        number = int(head.group(1))
        body = chunk[head.end():]
        cut = re.search(r"(?m)^solution:[ \t]*", body)
        fields_part = body[: cut.start()] if cut else body
        solution = body[cut.end():].strip() if cut else ""
        solution = re.sub(r"^```\w*\n?|\n?```$", "", solution).strip()
        record: dict = {"solution": solution}
        for name in FIELDS:
            match = re.search(rf"(?m)^{name}:[ \t]*(.*)$", fields_part)
            record[name] = match.group(1).strip() if match else ""
        blocks[number] = record
    return blocks


def fold(answer: str) -> str:
    """표기를 접는다 — 뜻이 같은 답이 같은 글자가 되게. 값은 건드리지 않는다."""
    s = answer
    s = s.replace("\\dfrac", "\\frac").replace("\\tfrac", "\\frac").replace("\\ ", "")
    s = re.sub(r"\\(?:left|right|displaystyle|,|;|!|:|quad|qquad)(?![a-zA-Z])", "", s)
    s = re.sub(r"\\(?:mathrm|text|mathit|rm|operatorname)\s*\{([^{}]*)\}", r"\1", s)
    s = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1)/(\2)", s)
    s = s.replace("\\times", "×").replace("\\div", "÷").replace("\\cdot", "·").replace("\\pm", "±")
    s = s.replace("\\leq", "≤").replace("\\geq", "≥").replace("\\le", "≤").replace("\\ge", "≥").replace("\\neq", "≠").replace("\\ne", "≠")
    s = re.sub(r"\^\{([^{}]*)\}", r"^\1", s)
    s = re.sub(r"_\{([^{}]*)\}", r"_\1", s)
    s = re.sub(r"\^\\circ|°|\^∘", "도", s)
    s = re.sub(r"[$~`\s{}]", "", s)
    s = s.replace("，", ",").replace("−", "-").replace("–", "-")
    # 숫자뿐인 분수는 «a/b» 로 — 소문항 번호 접기보다 먼저(«(1)/(6)» 이 번호로 읽히지 않게)
    s = re.sub(r"\((-?\d+)\)/\((-?\d+)\)", r"\1/\2", s)
    # 소문항 번호 — «(1)» 과 «⑴» 은 같은 표지다
    s = re.sub(r"\((\d{1,2})\)", lambda m: chr(0x2474 + int(m.group(1)) - 1) if 1 <= int(m.group(1)) <= 20 else m.group(0), s)
    # 양수 앞의 부호 — «+6.5» 와 «6.5» (값의 맨 앞 · 소문항 번호 바로 뒤 · 쉼표 뒤에서만)
    s = re.sub(r"(^|[⑴-⒇,])\+(?=[\d(\\a-zA-Z])", r"\1", s)
    return s


def choices(answer: str) -> list[str]:
    return sorted(set(ch for ch in answer if ch in CIRCLED))


#: 값 뒤에 붙는 단위 · 조사 — 한쪽에만 있어도 같은 답이다(«$10$» ↔ «$10$개»)
_UNIT_TAIL = re.compile(r"(?<=[\d)a-zA-Z])(?:개|명|원|번|회|점|살|쪽|장|권|대|마리|가지|도|cm\^?2?|cm\^?3?|mm|km|m\^?2?|kg|g|mL|L|시간|분|초|%|％)(?=[,⑴-⒇(]|$)")
#: «x=» 같은 머리 — 값만 견줄 때 뗀다
_VAR_HEAD = re.compile(r"(?:^|(?<=[,⑴-⒇]))[a-zA-Z]=")


_PART = re.compile(r"[⑴-⒇]")
_OX = {"○": "○", "◯": "○", "O": "○", "o": "○", "\\bigcirc": "○", "bigcirc": "○", "×": "×", "X": "×", "x": "×"}


def _parts(folded: str) -> list[str] | None:
    """소문항 번호로 가른 조각들 — 번호가 없으면 통째로 하나. 번호가 ⑴ 부터 차례로 서 있을 때만 가른다."""
    marks = _PART.findall(folded)
    if not marks:
        return [folded]
    if marks != [chr(0x2474 + i) for i in range(len(marks))] or not folded.startswith("⑴"):
        return None
    return [piece for piece in _PART.split(folded)[1:]]


def _ox(piece: str) -> str | None:
    """○ · × 로만 된 답이면 그 표기를 하나로 — «O» · «◯» · `bigcirc`(변환이 놓친 한글 수식 낱말) · «X»."""
    return _OX.get(piece.strip(",.()"))


def _tail_value(piece: str) -> str:
    """등식 사슬의 마지막 값 — «(-24)×5/2=-60» 의 «-60». 정답지가 계산 과정을 끝까지 적은 자료가 있다."""
    tail = piece.rsplit("=", 1)[-1]
    tail = re.sub(r"^\(([^()]*)\)$", r"\1", tail)  # «=(+31)» 의 괄호
    return re.sub(r"^\+(?=[\d(\\a-zA-Z])", "", tail)


def _items(piece: str) -> list[str] | None:
    """괄호 밖 쉼표로 가른 항목들(차례 없이 견준다) — 항목이 둘 넘을 때만."""
    out, depth, current = [], 0, ""
    for ch in piece:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(current)
            current = ""
        else:
            current += ch
    out.append(current)
    return sorted(out) if len(out) >= 2 and all(out) else None


def _value(piece: str) -> str:
    return _VAR_HEAD.sub("", _UNIT_TAIL.sub("", piece))


def same_answer(mine: str, theirs: str) -> str | None:
    """같으면 그 근거, 다르면 None.

    `exact` 글자 그대로 · `choice` 보기 번호 · `folded` 표기를 접으면 같다 · `value` 단위 · «x=» 를 떼면 같다 ·
    `tail` 정답지가 등식 사슬이고 그 마지막 값이 같다 · `ox` ○× 표기 · `set` 쉼표로 늘어놓은 항목이 차례만 다르다.
    소문항이 있으면 **모든 소문항**이 같아야 한다."""
    if not mine.strip() or not theirs.strip():
        return None
    if mine.strip() == theirs.strip():
        return "exact"
    a, b = choices(mine), choices(theirs)
    only_choice = lambda s: bool(choices(s)) and not re.sub(rf"[{CIRCLED},\s·과와및]", "", re.sub(r"\$", "", s))  # noqa: E731
    if only_choice(mine) and only_choice(theirs):
        return "choice" if a == b else None
    x, y = fold(mine), fold(theirs)
    if x == y:
        return "folded"
    xs, ys = _parts(x), _parts(y)
    if xs is None or ys is None or len(xs) != len(ys):
        return None
    how = "folded"
    for p, q in zip(xs, ys):
        if p == q:
            continue
        if _value(p) and _value(p) == _value(q):
            how = "value"
        elif _ox(p) and _ox(p) == _ox(q):
            how = "ox"
        elif "=" in q and _value(_tail_value(q)) == _value(p) and _value(p):
            how = "tail"
        elif _items(p) and _items(p) == _items(q):
            how = "set"
        elif _items(_value(p)) and _items(_value(p)) == _items(_value(q)):
            how = "set"
        else:
            return None
    return how


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    index = json.loads((root / "index.json").read_text(encoding="utf-8"))
    counts: dict[str, int] = {}
    basis: dict[str, int] = {}
    problems: list[str] = []
    done = 0
    with (root / "reviewed.jsonl").open("w", encoding="utf-8") as out:
        for batch in index:
            name = batch["name"]
            result = root / "out" / f"{name}.txt"
            if not result.exists():
                continue
            done += 1
            keys = json.loads((root / "key" / f"{name}.json").read_text(encoding="utf-8"))
            items = json.loads((root / "batch" / f"{name}.json").read_text(encoding="utf-8"))
            # 바이트로 읽는다 — 글로 읽으면 `\r`(= `\right` 의 머리가 깨진 것)이 줄바꿈으로 바뀌어 `repair_escapes` 가 못 알아본다
            blocks = parse_output(result.read_bytes().decode("utf-8"))
            units = json.loads((root / "units" / f"{batch['grade']}.json").read_text(encoding="utf-8"))
            for key, item in zip(keys, items):
                mine = blocks.get(key["i"])
                record = {"id": key["id"], "batch": name, "i": key["i"], "grade": batch["grade"], "keyAnswer": key["answer"], "answerFrom": key["answerFrom"]}
                if mine is None:
                    verdict = "missing"
                else:
                    flaws = []
                    unit = int(mine["unit"]) if mine["unit"].isdigit() else None
                    if unit is not None and not 1 <= unit <= len(units):
                        flaws.append(f"없는 차시 번호 {unit}")
                        unit = None
                    drop = [int(n) for n in re.findall(r"\d+", mine["drop"])]
                    if any(n >= len(item["lines"]) for n in drop):
                        flaws.append("없는 줄 번호")
                        drop = []
                    for field, allowed in (("type", TYPES), ("level", LEVELS), ("format", FORMATS)):
                        if mine[field] and mine[field] not in allowed:
                            flaws.append(f"{field}={mine[field]}")
                    how = same_answer(mine["answer"], key["answer"])
                    if mine["ok"].lower().startswith("n"):
                        verdict = "not-ok"
                    elif not mine["answer"]:
                        verdict = "no-answer"
                    elif how:
                        verdict = "match"
                        basis[how] = basis.get(how, 0) + 1
                    else:
                        verdict = "differ"
                    record.update(
                        ok=mine["ok"], why=mine["why"], drop=drop, answer=mine["answer"], how=how,
                        unit=unit, unit2=int(mine["unit2"]) if mine["unit2"].isdigit() else None,
                        unitName=f"{units[unit - 1]['chapter']} > {units[unit - 1]['section']}" if unit else None,
                        type=mine["type"], level=mine["level"], format=mine["format"],
                        solution=mine["solution"] or None, needSolution=key["needSolution"], flaws=flaws,
                        # 그림 문항 — 검토자가 «이 문항의 그림이 아니다»라고 한 그림의 번호(1부터)
                        noFigure=[int(n) for n in re.findall(r"\d+", mine.get("nofig", ""))],
                    )
                    if flaws:
                        problems.append(f"{name} #{key['i']}: {', '.join(flaws)}")
                record["verdict"] = verdict
                counts[verdict] = counts.get(verdict, 0) + 1
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
    total = sum(counts.values())
    print(f"묶음 {done}/{len(index)} · 문항 {total}")
    for verdict in ("match", "differ", "no-answer", "not-ok", "missing"):
        print(f"  {verdict}: {counts.get(verdict, 0)}")
    print("  같다고 본 근거:", json.dumps(basis, ensure_ascii=False))
    if problems:
        print(f"  꼴이 어긋난 출력 {len(problems)}:", *problems[:10], sep="\n    ")


if __name__ == "__main__":
    main()
