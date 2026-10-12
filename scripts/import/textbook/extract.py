# -*- coding: utf-8 -*-
"""교과서 자료 HWPX → 문항 기록(JSONL) + 파일별 요약 (교과서 이관 · 2026-10-07).

  python extract.py <변환 폴더(manifest*.jsonl · hwpx/)> <출력 폴더>

변환 폴더는 `convert_batch.py` 가 만든다(원본 경로 → `hwpx/<key>.hwpx`). 원본은 G 드라이브의 출판사 자료다.
출력:
  - `problems.jsonl` — 문항 하나에 한 줄(원본 경로 · 책 · 묶음 · 번호 · 본문 · 답 · 답의 출처 · 풀이 · 그림 수)
  - `files.jsonl`    — 파일 하나에 한 줄(문항 수 · 답 붙은 수 · 정답 칸 · 정답 그림뿐 …)
답은 이 파일 안에서만 붙인다. 따로 있는 정답 파일과의 짝짓기는 `pair_answers.py` 가 한다.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from hwpx_flow import read_paras
from segment import (
    CIRCLED,
    Segmented,
    content_score,
    embedded_number,
    looks_like_question,
    merge_answer_file,
    segment,
    strip_math,
)

ROOT_NAMES = ("중등교과서", "고등교과서")

#: 정답 파일 이름의 끝 — `_정답및해설` · `_정답 및 풀이` · `_해설` · `_정답`
#: «풀이» · «해설» 홀로는 `_` 로 떨어져 있을 때만 — 단원 이름 «일차방정식과 그 풀이»를 정답 파일로 읽지 않게
_ANSWER_SUFFIX = re.compile(r"(?:[\s_\-]*(?:정답\s*(?:및|과)\s*(?:해설|풀이)|정답\s*해설|정답)|[_\-]\s*(?:해설|풀이))\s*$")
#: 문제 파일 이름의 끝 — `_문제` · `_학생용`
_PROBLEM_SUFFIX = re.compile(r"[\s_\-]*(?:문제지|문제|학생용)\s*$")


#: 교과서 본문 · 지도서 — 개념 설명 사이에 문제가 섞여 있고 답은 따로 된 정답책(대개 PDF)에 있다. 이번 판에서는 세기만 한다
_TEXTBOOK_BODY = re.compile(r"교과서|지도서|개념\s*정리|탐구\s*학습|활동지|학습지\(|차시별")
_ASSESSMENT = re.compile(r"평가|문제|마무리|형성|수준별|확인|진단|테스트|TEST|대비|연산|학습지|해결해요|NOTE|기출")


def file_kind(path: str) -> str:
    """`assessment`(평가 · 문제 자료 — 이번 판) · `textbook`(교과서 본문 · 지도서 — 다음 판)."""
    name = Path(path).name
    if _TEXTBOOK_BODY.search(name) and not re.search(r"문제|평가|마무리", name):
        return "textbook"
    return "assessment"


def is_answer_file(path: str) -> bool:
    return bool(_ANSWER_SUFFIX.search(_stem(path)))


def _stem(path: str) -> str:
    stem = Path(path).name
    for _ in range(3):
        stem = re.sub(r"\.(hwpx?|pdf)$", "", stem, flags=re.I)
    return stem


def pair_key(path: str) -> tuple[str, str]:
    """짝짓기 열쇠 — (폴더, 꼬리를 뗀 이름). 정답 파일과 문제 파일이 같은 열쇠를 갖는다."""
    stem = _ANSWER_SUFFIX.sub("", _stem(path))
    stem = _PROBLEM_SUFFIX.sub("", stem)
    stem = re.sub(r"\s+", " ", stem).strip().lower()
    return str(Path(path).parent), stem


def book_of(path: str) -> tuple[str, str]:
    parts = Path(path).parts
    for i, part in enumerate(parts):
        if part in ROOT_NAMES and i + 2 < len(parts):
            return parts[i + 1], parts[i + 2]
    return "", ""


_CHOICE_IN_SOLUTION = re.compile(r"(?:따라서|그러므로|답은|정답은)[^①②③④⑤]{0,80}([①②③④⑤](?:\s*,\s*[①②③④⑤])*)")


def resolve_answer(doc: Segmented, key: tuple[int, int], has_choices: bool, problem_text: str = "") -> tuple[str | None, str]:
    """답과 그 출처 — `key`(빠른 정답) · `solution-short`(풀이가 곧 답) · `solution-choice`(풀이 끝의 보기 번호) · `none`."""
    if key in doc.keys:
        return doc.keys[key].strip(), "key"
    solution = doc.solutions.get(key)
    if not solution:
        return None, "none"
    if has_choices:
        found = _CHOICE_IN_SOLUTION.findall(solution)
        if found:
            return found[-1], "solution-choice"
        return None, "none"
    plain = strip_math(solution)
    if len(plain) <= 150 and solution.count("\n") <= 3 and not re.search(r"따라서|이므로|그러므로|에서", plain):
        # 풀이 칸이 답만 적었다(소문항 답 «⑴ … ⑵ …» 꼴). 문제를 되풀이한 줄은 답이 아니다
        lines = [line for line in solution.strip().splitlines() if line.strip() and line.strip() not in problem_text]
        if lines:
            return "\n".join(lines), "solution-short"
        return None, "none"
    # An equation is the answer to an equation-writing question. Taking only
    # the RHS would turn e.g. y=12x-16 into an expression rather than a line.
    equation_answer = bool(re.search(r"(?:접선|직선)의\s*방정식(?:을\s*구(?:하|하여)|\s*$)", problem_text, re.M))
    derived = derive_from_solution(solution, equation_answer=equation_answer)
    if derived:
        return derived, "solution-last"
    return None, "none"


_FIGURE_WORD = re.compile(r"그림|전개도|그래프|도형|좌표평면 위|다음 표|아래 표|오른쪽 표|히스토그램|도수분포다각형|줄기와 잎")


def is_bare_choice(answer: str) -> bool:
    """답이 보기 번호뿐인가 — `③` · `②, ④`."""
    return bool(re.fullmatch(r"\s*[①②③④⑤](?:\s*[,，]\s*[①②③④⑤])*\s*", answer))


def suspicious_sections(doc: Segmented, resolved: dict) -> set[int]:
    """답 짝이 어긋난 것으로 보이는 묶음 — 보기 문항(①~⑤가 넷 이상)인데 답에 보기 번호가 없는 문항이 하나라도 있으면
    그 묶음의 답을 **통째로** 믿지 않는다. 번호 짝이 한 칸 밀리면 이 꼴이 반드시 섞여 나온다(동아 «소단원학습지»에서 실측).
    한 문항만 빼지 않는 까닭: 밀린 묶음에서는 우연히 보기 번호끼리 맞물린 문항의 답도 틀리다."""
    bad = set()
    scores: dict[int, list[float]] = {}
    for problem in doc.problems:
        has_choices, answer, answer_from = resolved[problem.key]
        if answer and has_choices and answer_from in ("key", "solution-short") and not re.search(f"[{CIRCLED}]", answer):
            bad.add(problem.section)
        solution = doc.solutions.get(problem.key)
        if answer and solution and len(strip_math(solution)) >= 60:
            value = content_score(problem.text, solution)
            if value is not None:
                scores.setdefault(problem.section, []).append(value)
    # 묶음의 풀이가 대체로 다른 문제의 풀이다 — 수 겹침의 가운데 값이 낮다
    for section, values in scores.items():
        if len(values) >= 3 and sorted(values)[len(values) // 2] < 0.3:
            bad.add(section)
    return bad


#: 빠른 정답 안에 다음 번호가 섞였다 — «$1$ 8 $23 over 2$»(줄이 갈리지 않았다)
_MERGED_KEY = re.compile(r"(?:^|\s)0?\d{1,2}\s+(?:\$|[①②③④⑤])")


def problem_suspicious(problem_text: str, answer: str, answer_from: str, solution: str | None) -> bool:
    """문항 하나의 답이 다른 문제의 것으로 보인다 — 진짜 풀이(60자 넘음)가 있는데 문제의 수가 거의 안 나오거나,
    빠른 정답에 다음 번호가 섞였다."""
    if answer_from == "key" and _MERGED_KEY.search(answer):
        return True
    if solution and len(strip_math(solution)) >= 60:
        value = content_score(problem_text, solution)
        if value is not None and value < 0.2:
            return True
    return False


_PART = re.compile(r"(?:^|\n)\s*(\(\d\)|[⑴⑵⑶⑷⑸⑹⑺⑻])\s*")


def final_equations(text: str) -> str | None:
    """Read explicit final y= equations, retaining every '또는' alternative.

    Observed in 천재 미적분1 홍진곤 기초력 UP 접선의 방정식 (2026-10-11).
    Conditional cases ('a=0일 때 ...') are deliberately left for review.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return None
    tail = lines[-1]
    # The source sometimes wraps an alternative onto a second paragraph.
    cursor = len(lines) - 1
    while cursor > 0 and lines[cursor - 1].endswith("또는"):
        cursor -= 1
        tail = lines[cursor] + " " + tail
    spans = re.findall(r"\$([^$]+)\$", tail)
    outside = re.sub(r"\$[^$]+\$", "", tail)
    if re.sub(r"즉|또는|[\s,.]", "", outside) or not spans:
        return None
    if any(not re.match(r"^\s*y\s*=", span) or span.count("=") != 1 for span in spans):
        return None
    if "즉" in outside:
        # 'original form, 즉 final form' describes one equation; a leading
        # '즉' followed by alternatives describes all of those equations.
        position = tail.find("즉")
        spans = re.findall(r"\$([^$]+)\$", tail[position:])
    if len(spans) > 1 and "또는" not in outside:
        return None
    return " 또는 ".join(f"${span.strip()}$" for span in spans)


def final_value(text: str, *, equation_answer: bool = False) -> str | None:
    """풀이 마지막 줄이 **식 하나뿐**이면 그 마지막 «=» 의 오른쪽(없으면 식 전체). 글이 섞인 줄은 «따라서 … 는 $X$이다» 꼴만."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return None
    if equation_answer:
        return final_equations(text)
    last = lines[-1]
    # An explicitly solved variable after '에서', with no other prose/branch,
    # is a final result, rather than an arbitrary equation inside the proof.
    solved = re.fullmatch(r"\$[^$]+\$에서\s*\$[a-zA-Z]\s*=\s*([^$=]+)\$", last)
    if solved:
        return f"${solved[1].strip()}$"
    spans = re.findall(r"\$([^$]+)\$", last)
    rest = re.sub(r"\$[^$]+\$", "", last)
    conclusion = bool(re.match(r"^(?:따라서|즉[,，]?)\s*\$", last))
    if conclusion:
        # The reacquired source also ends with '따라서 $k=-6$' and
        # '따라서 $f(x)=...$이므로 $f(4)=8+3=11$'. A list of independent
        # assignments is not one answer and must not silently lose its prefix.
        if len(spans) > 1 and not re.search(r"이므로|즉", rest.removeprefix("즉")):
            return None
        rest = re.sub(r"^(?:따라서|즉[,，]?)\s*", "", rest)
    rest = re.sub(r"[\s`.,…➊➋➌➍①②③④⑤]|이다|입니다|이고|이므로", "", rest)
    if spans and not rest:
        expr = spans[-1].strip().rstrip("`").strip()
        value = expr.rsplit("=", 1)[1].strip() if "=" in expr else (expr if last.lstrip("$ ").startswith("=") else None)
        if value is None and len(spans) == 1 and len(lines) == 1:
            value = expr
        if value is None and len(spans) == 1 and len(lines) > 1:
            # Explicit conclusion cue on the preceding paragraph, e.g.
            # '... 즉' / '구하는 실수 k의 값의 범위는' then '$2<k<12$'.
            cue = re.sub(r"\$[^$]+\$", "", lines[-2])
            if re.search(r"(?:즉[,，]?|구하는.{0,60}(?:범위|값)(?:은|는))\s*$", cue):
                value = expr
        if value and not re.search(r"cdots|LEFT|left\s*\{$", value):
            return f"${value}$"
        return None
    match = re.search(r"따라서[^$]{0,40}(?:은|는|이|가)\s*\$([^$]+)\$\s*(?:이다|입니다)?\.?\s*$", last)
    if match:
        expr = match.group(1).strip()
        return f"${expr.rsplit('=', 1)[1].strip() if '=' in expr else expr}$"
    return None


def derive_from_solution(solution: str, *, equation_answer: bool = False) -> str | None:
    """풀이에서 답을 뽑는다 — 소문항(⑴ · (1))이 있으면 소문항마다, 없으면 풀이 끝에서. 하나라도 못 뽑으면 `None`."""
    marks = list(_PART.finditer(solution))
    if len(marks) >= 2:
        values = []
        for i, mark in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(solution)
            value = final_value(solution[mark.end():end], equation_answer=equation_answer)
            if not value:
                return None
            values.append(f"{mark.group(1)} {value}")
        return " ".join(values)
    return final_value(solution, equation_answer=equation_answer)


def main() -> None:
    convert_dir = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = {}
    for manifest in sorted(convert_dir.glob("manifest*.jsonl")):
        for line in manifest.read_text(encoding="utf-8").splitlines():
            item = json.loads(line)
            if item.get("ok"):
                entries[item["path"]] = convert_dir / "hwpx" / f"{item['key']}.hwpx"

    answer_files: dict[tuple[str, str], list[str]] = {}
    problem_keys: set[tuple[str, str]] = set()
    for source in entries:
        if is_answer_file(source):
            answer_files.setdefault(pair_key(source), []).append(source)
        else:
            problem_keys.add(pair_key(source))

    with (out_dir / "problems.jsonl").open("w", encoding="utf-8") as problems_out, (
        out_dir / "files.jsonl"
    ).open("w", encoding="utf-8") as files_out:
        for source, hwpx in sorted(entries.items()):
            grade, book = book_of(source)
            summary = {"path": source, "grade": grade, "book": book}
            if is_answer_file(source) and pair_key(source) in problem_keys:
                # 짝 문제 파일에 붙는다 — 따로 문항을 내지 않는다
                summary.update(role="answer-file", pairedTo=True)
                files_out.write(json.dumps(summary, ensure_ascii=False) + "\n")
                continue
            try:
                doc = segment(read_paras(hwpx))
                paired = [] if is_answer_file(source) else answer_files.get(pair_key(source), [])
                filled = 0
                for answer_source in paired:
                    filled += merge_answer_file(doc, read_paras(entries[answer_source]))
                summary.update(answerFiles=paired, filledFromAnswerFile=filled)
                if is_answer_file(source):
                    summary.update(role="answer-file", pairedTo=False)
            except Exception as error:  # noqa: BLE001
                summary.update(error=f"{type(error).__name__}: {error}"[:200])
                files_out.write(json.dumps(summary, ensure_ascii=False) + "\n")
                continue
            answered = 0
            by_from: dict[str, int] = {}
            kind = file_kind(source)
            summary.update(kind=kind)
            resolved = {}
            for problem in doc.problems:
                has_choices = sum(1 for c in CIRCLED if c in problem.text) >= 4
                resolved[problem.key] = (has_choices, *resolve_answer(doc, problem.key, has_choices, problem.text))
            rejected = suspicious_sections(doc, resolved)
            summary.update(rejectedSections=sorted(rejected))
            for problem in doc.problems:
                text = problem.text
                has_choices, answer, answer_from = resolved[problem.key]
                if answer and (
                    problem.section in rejected
                    or problem_suspicious(text, answer, answer_from, doc.solutions.get(problem.key))
                ):
                    answer, answer_from = None, "rejected-mismatch"
                elif answer and not has_choices and is_bare_choice(answer) and not re.search(f"[{CIRCLED}]", text):
                    # 답은 보기 번호인데 본문에 보기 번호가 없다 — 보기가 그림 · 자동 번호로 들어 있어 글에 안 남은 문항
                    answer_from = "choices-unnumbered"
                by_from[answer_from] = by_from.get(answer_from, 0) + 1
                if answer and answer_from != "choices-unnumbered":
                    answered += 1
                problems_out.write(json.dumps({
                    "path": source,
                    #: 변환본의 이름(원본 경로의 sha1 앞 16자) — 출처 자료의 열쇠 · 그림 폴더 이름과 같은 값
                    "key": hwpx.stem,
                    "kind": kind,
                    #: 물음 끝이나 보기가 있어야 문항이다 — 교과서 본문의 설명 덩이 · 표 조각을 거른다
                    "isQuestion": has_choices or looks_like_question(text),
                    "answerSectionPicture": doc.answer_is_picture,
                    "answerSection": doc.answer_section,
                    "grade": grade,
                    "book": book,
                    "section": problem.section,
                    "number": problem.number,
                    "glyphNumber": problem.glyph_number,
                    "content": text,
                    "hasChoices": has_choices,
                    "answer": answer,
                    "answerFrom": answer_from,
                    "solution": doc.solutions.get(problem.key),
                    "pictures": [[p.bin_id, p.width, p.height] for p in problem.pictures],
                    "shapes": problem.shapes,
                    #: 도형 하나하나 — [종류, 가로, 세로](HWPUNIT). 번호 딱지 같은 작은 묶음을 가린다
                    "shapeList": [list(item) for item in problem.shape_list],
                    #: 자료 표의 수 — 문제은행은 표를 글로 싣지 않는다. 0 이 아니면 글만으로는 못 싣는 문항이다
                    "tables": problem.tables,
                    #: 본문 안에 다른 문항의 머리로 보이는 줄이 있다(그 번호) — 두 문항이 붙었을 수 있다
                    "embeddedNumber": embedded_number(problem),
                    #: 본문이 그림 · 표 · 그래프를 가리킨다 — 그림 파일도 도형도 없으면 «그림 못 찾음»
                    "figureMention": bool(_FIGURE_WORD.search(text)),
                    #: 그림과 그 자리(묶음 개체 안의 그림 · 번호가 있는 첫 문단의 그림 · 같이 쓰는 지시문의 그림까지).
                    #: `pictures` 는 예전 그대로다 — 이쪽이 그림 문항을 싣는 데 쓰는 온전한 목록이다
                    "figs": [
                        {
                            "bin": fig.picture.bin_id,
                            "w": fig.picture.width,
                            "h": fig.picture.height,
                            "line": fig.line,
                            "offset": fig.offset,
                            "grouped": fig.picture.grouped,
                            "group": fig.picture.group,
                            #: 자료 표의 칸 안에 든 그림이면 그 표의 번호(표를 그린 그림에 들어 있다)
                            "inTable": fig.in_table,
                            "behind": fig.picture.behind,
                            "clip": fig.picture.clip,
                            "rot": fig.picture.rotation,
                            "flip": list(fig.picture.flip),
                        }
                        for fig in problem.figs
                    ],
                    #: 본문에 그림의 자리를 `[[FIG:k]]` 로 · 자료 표의 자리를 `[[TBL:번호]]` 로 적은 글(k 는 `figs` 의 번호)
                    "contentFig": problem.marked_text if problem.figs or problem.tables else None,
                    #: 이 문항에 든 자료 표의 번호들(`hwpx_flow.data_tables` 의 번호)
                    "tableIds": sorted({table for table in problem.line_tables if table}),
                }, ensure_ascii=False) + "\n")
            summary.update(
                problems=len(doc.problems),
                answered=answered,
                answerFrom=by_from,
                sections=len({p.section for p in doc.problems}),
                answerSection=doc.answer_section,
                answerIsPicture=doc.answer_is_picture,
                withPictures=sum(1 for p in doc.problems if p.pictures),
            )
            files_out.write(json.dumps(summary, ensure_ascii=False) + "\n")
    print(f"파일 {len(entries)}")


if __name__ == "__main__":
    main()
