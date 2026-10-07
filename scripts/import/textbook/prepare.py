# -*- coding: utf-8 -*-
"""뽑은 문항 → 문제은행에 실을 꼴의 글(LaTeX) (교과서 이관 · 2026-10-07).

  python prepare.py <extract 폴더> <출력 폴더> [--all]

하는 일(차례대로):
  ① 고른다 — 평가 자료 · 물음이 있는 문항 · 답이 붙은 것 · **글만으로 완결된 것**
     (그림 · 한글 도형 · 자료 표 · «그림» 을 가리키는 말 · 붙은 문항 표시가 없는 것). `--all` 이면 고르지 않는다.
  ② 다듬는다 — 줄 잇기 · 보기 한 줄에 하나 · 풀이의 채점 기준표 걷기(`normalize.py`)
  ③ 수식을 LaTeX 로 — 기출 이관과 **같은 변환기**(`scripts/qa/convert-hwp-spans.py` — 정본을 새로 만들지 않는다)
  ④ 잔재를 고치고 **제품 렌더러로 판정**한다 — 기출 이관과 같은 도구(`scripts/import/exam-paper/fix-exam-solutions.ts`)
  ⑤ `prepared.jsonl` — 문항 하나에 한 줄. 렌더가 안 되는 칸은 `bad` 에 적는다(그 문항은 싣지 않는다)

글자를 지어내지 않는다 — 여기까지는 전부 결정적이다. 단원 · 유형 · 난이도와 «답이 맞는가»는 다음 단계가 본다.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from normalize import Corpus, normalize_content, normalize_solution  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # 윈도 콘솔(cp949)은 «» 를 못 찍는다

REPO = Path(__file__).resolve().parents[3]
ANSWER_SOURCES = {"key", "solution-short", "solution-choice", "solution-last"}
#: 본문이 이보다 길면 문항 하나가 아니다(붙은 문항 · 활동지)
CONTENT_MAX = 1200
_FIGURE_IN_SOLUTION = re.compile(r"그림|그래프는?\s*(?:다음|오른쪽|아래)|다음과\s*같(?:이|은)\s*(?:그래프|표)|수직선\s*위에\s*나타내면")
_LEFT_BRACE = re.compile(r"\\left\\\{")
_RIGHT = re.compile(r"\\right(?![a-zA-Z])")


def external_id(row: dict) -> str:
    return f"tb-{row['key']}-{row['section']}-{row['number']}"


def eligible(row: dict) -> str | None:
    """실을 수 없는 까닭 — 실을 수 있으면 None."""
    if row.get("kind") != "assessment":
        return "평가 자료가 아니다"
    if not row.get("isQuestion", True):
        return "물음이 없다"
    if not row.get("answer") or row.get("answerFrom") not in ANSWER_SOURCES:
        return "답이 없다"
    if row["pictures"]:
        return "그림"
    if row["shapes"]:
        return "한글 도형"
    if row.get("tables"):
        return "자료 표"
    if row.get("figureMention"):
        return "그림을 가리키는 말"
    if row.get("embeddedNumber") is not None:
        return "붙은 문항"
    if len(row["content"]) > CONTENT_MAX:
        return "본문이 너무 길다"
    if re.search(r"풀이\s*참조|해설\s*참조", row["answer"]):
        return "답이 «풀이 참조»"
    return None


def balance_braces(text: str) -> str:
    """`\\left\\{` 가 `\\right` 없이 선 수식 — 집합을 두 수식에 걸쳐 쓴 자료(«$A= left{x | x$는 … $right}$»)다.
    짝 없는 `\\left` 는 KaTeX 가 통째로 포기하므로, 그 수식 안에서 짝이 안 맞으면 크기 조절만 뗀다(`\\{` · `\\}`)."""

    def fix(match: re.Match) -> str:
        body = match.group(1)
        lefts = len(re.findall(r"\\left(?![a-zA-Z])", body))
        rights = len(_RIGHT.findall(body))
        if lefts == rights:
            return match.group(0)
        body = re.sub(r"\\left(?![a-zA-Z])\s*", "", body)
        body = re.sub(r"\\right(?![a-zA-Z])\s*\.?", "", body)
        return f"${body}$"

    return re.sub(r"\$([^$]*)\$", fix, text)


def close_set_brace(text: str) -> str:
    """`LEFT { 1,~2,~3 RIGHT` — 닫는 중괄호가 빠진 채 저장된 집합(원본이 그렇다 — 187자리).
    변환기는 이것을 `\\left\\{ … \\right.` 로 내 «{1, 2, 3» 이 된다. 연립방정식의 `LEFT { pile{…} RIGHT .` 은 건드리지 않는다."""

    def fix(match: re.Match) -> str:
        body = match.group(1)
        if re.search(r"(?i)left\s*\{", body) and re.search(r"(?i)right\s*$", body) and not re.search(r"(?i)pile|cases|matrix", body):
            return f"${body} }}$"
        return match.group(0)

    return re.sub(r"\$([^$]*)\$", fix, text)


#: 첨자의 몫이 끝나는 글자 — 띄어쓰기 · 한글 수식의 간격 기호(` ~) · 묶음 · 다음 첨자 · 줄 맞춤(&) · 줄바꿈(#) · 쉼표
_SCRIPT_RUN = re.compile(r"([_^])(?![{\s])([^\s{}_^`~&#,]+)")
_ATOM = re.compile(r"[A-Za-z]|\d+|[가-힣]+")


def brace_scripts(script: str) -> str:
    """한글 수식의 첨자는 **띄어쓰기까지**다 — `x^m+n` 은 x^{m+n}, `{}_n-1 {rm P}_r-1` 은 ₙ₋₁Pᵣ₋₁, `a_ij` 는 a_{ij}.

    변환 정본은 첨자 뒤 한 토큰만 올려 `x^{m}+n` · `a_{n}+1` 을 낸다 — KaTeX 는 초록이고 **식은 틀린다**.
    교과서 자료의 수식 372,942개 가운데 2,900여 자리가 그 꼴이다(수열 · 지수법칙 · 순열과 조합 · 행렬 성분).
    출판사 조판자는 이 규칙을 알고 쓴다: 첨자를 끝낼 자리마다 띄어 썼다(`x^2 +y^2` · `(a_1 +a_2 )` · `|a_1 |`).
    그래서 변환 **앞에서** 그 몫을 중괄호로 묶어 준다. 글자 하나 · 숫자열 같은 원자는 그대로 둔다."""

    def fix(match: re.Match) -> str:
        mark, arg = match.group(1), match.group(2)
        # 짝 없는 닫는 괄호 앞에서 끊는다 — `(x^2)` 의 `)` 는 첨자가 아니다
        depth = 0
        for index, ch in enumerate(arg):
            if ch in "([":
                depth += 1
            elif ch in ")]":
                if depth == 0:
                    arg, rest = arg[:index], arg[index:]
                    break
                depth -= 1
        else:
            rest = ""
        # 끝에 매달린 연산 기호는 첨자가 아니다(`it_r= `)
        trimmed = arg.rstrip("=+-<>.;:")
        rest = arg[len(trimmed):] + rest
        arg = trimmed
        if not arg or _ATOM.fullmatch(arg):
            return f"{mark}{arg}{rest}"
        return f"{mark}{{{arg}}}{rest}"

    return _SCRIPT_RUN.sub(fix, script)


#: 홀로 선 `over`(분수) — `overline` · `overbrace` 같은 다른 낱말의 머리가 아닌 것
_OVER = re.compile(r"(?<![A-Za-z\\])(?:over|OVER|Over)(?![A-Za-z])")
#: 뒤 글자와 붙어 버린 `over` — `over2-i` · `overn+1`. 다른 낱말(`overline` …)은 건드리지 않는다
_OVER_GLUED = re.compile(r"(?<![A-Za-z\\])(over|OVER|Over)(?=[A-Za-z0-9(\[-])(?!line|brace|arc|set|rightarrow|leftarrow|bar)")
#: 몫을 끊는 글자 — 띄어쓰기와 한글 수식의 간격 기호
_OPERAND_BREAK = " \t\n`~"
#: 몫 안에서 식을 가르는 글자(괄호 밖에서) — 등호 · 부등호 · 쉼표 · 줄 맞춤
_OPERAND_SPLIT = "=<>,&#"
#: 묶지 않아도 되는 몫 — 글자 하나 · 수 하나
_SIMPLE_OPERAND = re.compile(r"[A-Za-z]|\d+(?:\.\d+)?")


def _left_operand(script: str, end: int) -> tuple[int, int] | None:
    """`over` 앞의 몫 — [시작, 끝). 이미 중괄호로 묶였거나 묶을 것이 없으면 None."""
    stop = end
    while stop > 0 and script[stop - 1] in _OPERAND_BREAK:
        stop -= 1
    if stop == 0 or script[stop - 1] == "}":
        return None
    start, depth = stop, 0
    while start > 0:
        ch = script[start - 1]
        if ch in _OPERAND_BREAK:
            break
        if ch in ")]":
            depth += 1
        elif ch in "([{":
            if depth == 0:
                break  # 짝 없는 여는 괄호 — 몫은 그 뒤부터다(`left(1+i over …`)
            depth -= 1
        elif ch == "}":
            depth += 1
        elif ch in _OPERAND_SPLIT and depth == 0:
            break
        start -= 1
    return (start, stop) if start < stop else None


def _right_operand(script: str, start: int) -> tuple[int, int] | None:
    """`over` 뒤의 몫 — [시작, 끝)."""
    begin = start
    while begin < len(script) and script[begin] in _OPERAND_BREAK:
        begin += 1
    if begin >= len(script) or script[begin] == "{":
        return None
    stop, depth = begin, 0
    while stop < len(script):
        ch = script[stop]
        if ch in _OPERAND_BREAK:
            break
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            if depth == 0:
                break  # 짝 없는 닫는 괄호 — 몫은 그 앞까지다
            depth -= 1
        elif ch in _OPERAND_SPLIT and depth == 0:
            break
        stop += 1
    return (begin, stop) if begin < stop else None


def brace_over(script: str) -> str:
    """한글 수식의 분수도 **띄어쓰기까지**가 분자 · 분모다 — `a+3i over 2-i` 는 (a+3i)/(2−i),
    `4+4i over 1+1 =2+2i` 는 (4+4i)/(1+1) = 2+2i.

    변환 정본은 `over` 바로 옆의 한 토큰만 잡아 `a+3\\frac{i}{2}-i` 를 낸다 — 첨자(`brace_scripts`)와 같은 뿌리이고,
    같이 KaTeX 는 초록인데 식이 틀린다. 둘째 검토자가 «본문의 분수가 깨졌다»로 짚었다(복소수 · 유리함수 · 귀납법).
    교과서 자료에서 본문 500여 · 풀이 600여 자리 — 변환 앞에서 그 몫을 중괄호로 묶어 준다."""
    script = _OVER_GLUED.sub(lambda m: m.group(1) + " ", script)
    edits: list[tuple[int, int]] = []
    for match in _OVER.finditer(script):
        for span in (_left_operand(script, match.start()), _right_operand(script, match.end())):
            if span and not _SIMPLE_OPERAND.fullmatch(script[span[0]:span[1]]):
                edits.append(span)
    for start, stop in sorted(set(edits), reverse=True):
        script = f"{script[:start]}{{{script[start:stop]}}}{script[stop:]}"
    return script


#: 제곱근 — 뒤 글자와 붙어 있어도 된다(`sqrtab` · `rootx+1`). 세제곱근 `root 3 of 8` 은 건드리지 않는다
_ROOT = re.compile(r"(?<![A-Za-z\\])(?:sqrt|SQRT|Sqrt|root|ROOT|Root)(?![A-Za-z]*\s*\{)")
_ROOT_INDEX = re.compile(r"\s*\S+\s+(?:of|OF)(?![A-Za-z])")


def brace_roots(script: str) -> str:
    """제곱근의 몫도 **띄어쓰기까지**다 — `root-1` 은 √(−1), `root2x+1 - root1-x` 는 √(2x+1) − √(1−x),
    `y= 2rootx = root4x` 는 2√x = √(4x). 변환 정본은 첫 토큰만 덮어 `\\sqrt{-}1` · `\\sqrt{2}x+1` 을 낸다.
    교과서 자료에서 750여 자리(복소수의 `i=root-1` · 무리함수 · 산술평균과 기하평균)."""
    edits: list[tuple[int, int]] = []
    for match in _ROOT.finditer(script):
        if _ROOT_INDEX.match(script, match.end()):
            continue  # `root 3 of 8` — 앞의 것은 근의 차수다
        span = _right_operand(script, match.end())
        if span and not _SIMPLE_OPERAND.fullmatch(script[span[0]:span[1]]):
            edits.append(span)
    for start, stop in sorted(set(edits), reverse=True):
        script = f"{script[:start]}{{{script[start:stop]}}}{script[stop:]}"
    return script


def roman_escapes(script: str) -> str:
    """`\\P` · `\\C` · `\\A` · `\\cm` — 한글 수식에서 역슬래시는 «곧은 글자로»다. 변환 정본은 그대로 흘려보내
    `\\C_{2}` 가 되고 KaTeX 는 모르는 명령이라 수식을 통째로 포기한다. 변환 앞에서 `{rm …}` 으로 바꾼다."""
    return re.sub(r"\\([A-Za-z]+)", lambda m: "{rm " + m.group(1) + "}", script)


#: 앞뒤 글자에 붙어 버린 나눗셈 · 곱셈 낱말 — `(4a-6)div2` · `3times4`. 변환 정본은 띄어 쓴 낱말만 안다
_GLUED_OPERATOR = re.compile(r"(?<=[0-9)\]}])(div|DIV|times|TIMES)(?=[0-9(\[{\\-])")


def unglue_operators(script: str) -> str:
    """`(4a-6)div2` 의 `div` 는 변환을 못 지나 날 글자로 남는다 — 문제은행의 «죽은 역슬래시» 문지기가 그 문항을 막는다.
    숫자 · 괄호 사이에 낀 것만 띄운다(글자 사이의 `div` 는 다른 낱말일 수 있다)."""
    return _GLUED_OPERATOR.sub(lambda m: f" {m.group(1)} ", script)


def pre_convert(text: str) -> str:
    """변환 앞 — `$…$` 안의 한글 수식만 고친다."""
    return re.sub(r"\$([^$]*)\$", lambda m: "$" + brace_over(brace_roots(brace_scripts(unglue_operators(roman_escapes(m.group(1)))))) + "$", text)


#: 줄 머리의 사용자 영역 글자 — 기호 글꼴의 «답» 표시 · 글머리표(뜻을 가진 글자가 아니다). 줄 가운데 것은 남긴다(뒤에서 걸린다)
_PUA_HEAD = re.compile("(?m)^[-\U000f0000-\U000ffffd]+\\s*")


def post_convert(text: str) -> str:
    """변환 뒤 — LaTeX 에서만 보이는 잔재."""
    text = _PUA_HEAD.sub("", text)
    # 글자 그대로의 중괄호가 `\text{{}` · `\text{}}` 로 나온다(집합 `{a_n}`)
    text = text.replace("\\text{{}", "\\{").replace("\\text{}}", "\\}")

    def fix(match: re.Match) -> str:
        body = match.group(1)
        # 줄 맞춤 `&` 가 환경 밖에 남은 것 — KaTeX 가 포기한다
        if "&" in body and "\\begin{" not in body:
            body = body.replace("&", "")
        return f"${body}$"

    return re.sub(r"\$([^$]*)\$", fix, text)


def run(command: list[str], log: Path, *, allow_failure: bool = False) -> None:
    with log.open("w", encoding="utf-8") as out:
        result = subprocess.run(command, cwd=REPO, stdout=out, stderr=subprocess.STDOUT, shell=sys.platform == "win32")
    if result.returncode != 0 and not allow_failure:
        raise SystemExit(f"실패: {' '.join(command)} — {log}")


def main() -> None:
    source = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    take_all = "--all" in sys.argv
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = [json.loads(line) for line in (source / "problems.jsonl").open(encoding="utf-8")]
    corpus = Corpus()
    for row in rows:
        corpus.feed(row["content"])
        if row.get("solution"):
            corpus.feed(row["solution"])

    reasons: dict[str, int] = {}
    chosen: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        reason = None if take_all else eligible(row)
        if reason is None and external_id(row) in seen:
            reason = "같은 열쇠가 두 번"
        reasons[reason or "고름"] = reasons.get(reason or "고름", 0) + 1
        if reason is None:
            seen.add(external_id(row))
            chosen.append(row)
    print("고르기:", json.dumps(reasons, ensure_ascii=False))

    pieces: list[dict] = []
    for row in chosen:
        rid = external_id(row)
        pieces.append({"id": f"{rid}#c", "text": pre_convert(close_set_brace(normalize_content(row["content"], corpus)))})
        pieces.append({"id": f"{rid}#a", "text": pre_convert(close_set_brace(row["answer"].strip()))})
        solution = (row.get("solution") or "").strip()
        if solution:
            pieces.append({"id": f"{rid}#s", "text": pre_convert(close_set_brace(normalize_solution(solution, corpus)))})

    raw, converted, balanced, fixed = (out_dir / name for name in ("pieces_in.json", "pieces_conv.json", "pieces_bal.json", "pieces_fixed.json"))
    raw.write_text(json.dumps(pieces, ensure_ascii=False), encoding="utf-8")
    run(["python", "scripts/qa/convert-hwp-spans.py", str(raw), str(converted)], out_dir / "convert.log")
    conv = json.loads(converted.read_text(encoding="utf-8"))
    for piece in conv:
        piece["text"] = balance_braces(post_convert(piece["text"]))
    balanced.write_text(json.dumps([{"id": p["id"], "text": p["text"]} for p in conv], ensure_ascii=False), encoding="utf-8")
    config = out_dir / "no-hand.json"
    config.write_text('{"hand": []}', encoding="utf-8")
    # 남은 결함이 있으면 1 로 끝난다 — 그 목록을 읽어 그 문항을 뺀다(멈추지 않는다)
    run(
        ["npx", "tsx", "scripts/import/exam-paper/fix-exam-solutions.ts", str(balanced), str(fixed), "--config", str(config)],
        out_dir / "fix.log",
        allow_failure=True,
    )
    if not fixed.exists():
        raise SystemExit(f"잔재 고침이 결과를 못 냈다 — {out_dir / 'fix.log'}")
    text_of = {piece["id"]: piece["text"] for piece in json.loads(fixed.read_text(encoding="utf-8"))}
    bad: dict[str, list[str]] = {}
    for line in (out_dir / "fix.log").read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\[문(.+?)#([cas])\]\s*(.*)$", line)
        if match:
            bad.setdefault(match.group(1), []).append(f"{match.group(2)}: {match.group(3)}")

    counts = {"rows": 0, "bad": 0, "solution": 0, "solutionFigure": 0}
    with (out_dir / "prepared.jsonl").open("w", encoding="utf-8") as out:
        for row in chosen:
            rid = external_id(row)
            solution = text_of.get(f"{rid}#s")
            solution_figure = bool(solution and _FIGURE_IN_SOLUTION.search(solution))
            counts["rows"] += 1
            counts["bad"] += rid in bad
            counts["solution"] += bool(solution)
            counts["solutionFigure"] += solution_figure
            out.write(json.dumps({
                "id": rid,
                "key": row["key"],
                "path": row["path"],
                "grade": row["grade"],
                "book": row["book"],
                "section": row["section"],
                "number": row["number"],
                "content": text_of[f"{rid}#c"],
                "answer": text_of[f"{rid}#a"],
                "answerFrom": row["answerFrom"],
                "solution": solution,
                #: 풀이가 그림을 가리킨다 — 그 그림은 우리에게 없다. 이 풀이는 그대로 못 쓴다
                "solutionFigure": solution_figure,
                #: 변환 뒤에도 렌더가 안 되거나 잔재가 남은 칸 — 이 문항은 싣지 않는다
                "bad": bad.get(rid, []),
            }, ensure_ascii=False) + "\n")
    print("결과:", json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
