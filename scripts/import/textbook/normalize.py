# -*- coding: utf-8 -*-
"""뽑아 낸 문항의 글을 문제은행의 꼴로 다듬는다 (교과서 이관 · 2026-10-07).

글자를 **바꾸지 않는다** — 줄을 잇고, 가르고, 군더더기 줄을 걷을 뿐이다. 수식 안은 건드리지 않는다
(수식을 LaTeX 로 바꾸는 일은 `scripts/qa/convert-hwp-spans.py` 가 한다).

  join_wrapped   줄 끝에서 끊긴 글을 잇는다 — 출판사가 줄마다 엔터를 친 자료가 있다(지학사 · YBM)
  split_choices  한 줄에 나란히 있는 보기를 한 줄에 하나씩(문제은행의 꼴)
  merge_markers  보기 번호만 선 줄을 다음 줄과 잇는다(보기를 표로 짠 자료 — «①» / «$2$개»)
  clean_solution 풀이 끝의 채점 기준표 · 배점 표시를 걷는다
"""
from __future__ import annotations

import collections
import re

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"
_MATH = re.compile(r"\$[^$]*\$")
#: 줄 머리의 표지 — 이런 줄은 앞 줄에 잇지 않는다
_MARKER_HEAD = re.compile(
    r"^\s*(?:[①-⑳]|[⑴-⒇]|[㉠-㉯]|[㈎-㈛]|[➊-➓]|[ㄱ-ㅎ]\s*[.)]|\(\s*(?:\d{1,2}|[가-힣ㄱ-ㅎ]|[ⅰ-ⅹ]+)\s*\)|[<\[【]\s*보\s*기|\(\s*단\s*,"
    r"|[•∙·■□▶▷➜→※\-]|\[)"
)
#: 줄 끝이 이러면 문장이 끝난 것이다 — 뒤 줄을 잇지 않는다
_SENTENCE_END = re.compile(r"[.?!:;]\s*$|[)\]】>]\s*$|(?:시오|하라|인가|는가|은가)\s*$")
#: 수식 바로 뒤에 붙는 말(조사 · 어미) — 수식과 띄우지 않는다
_PARTICLE = re.compile(
    r"^(?:은|는|이|가|을|를|의|에|와|과|로|으로|도|만|일|인|이다|이고|이며|이므로|이면|이라|라고|라|에서|에게|보다|까지|부터|마다|씩|개|명|원|번|배|점|쪽|회|초|분|시간|도|%|㎝|cm|m|g|L)(?![가-힣A-Za-z]{3,})"
)
#: 이보다 짧은 줄은 줄바꿈이 뜻이 있다(제목 · «(정답 2개)» · 식 한 줄)
WRAP_MIN = 18


def visible(text: str) -> str:
    """수식을 한 글자로 접은 글 — 길이와 낱말을 셀 때."""
    return _MATH.sub("§", text)


def _tokens(line: str) -> list[str]:
    return [token for token in visible(line).split() if token]


class Corpus:
    """줄 **안쪽**의 낱말 · 낱말 쌍을 센 것. 줄 끝에서 끊긴 자리를 붙일지(«조사」+「하여»→«조사하여»)
    띄울지(«자료의」+「중앙값은»)를 여기에 묻는다 — 같은 자료가 다른 자리에서 그 말을 어떻게 썼는지가 근거다."""

    def __init__(self) -> None:
        self.words: collections.Counter[str] = collections.Counter()
        self.pairs: collections.Counter[tuple[str, str]] = collections.Counter()

    def feed(self, text: str) -> None:
        for line in text.split("\n"):
            tokens = _tokens(line)
            # 줄의 첫 낱말 · 끝 낱말은 끊긴 조각일 수 있어 세지 않는다
            inner = tokens[1:-1] if len(tokens) > 2 else []
            self.words.update(inner)
            self.pairs.update(zip(inner, inner[1:]))

    def glue(self, left: str, right: str) -> bool:
        """두 조각을 붙여 쓴 꼴이 띄어 쓴 꼴보다 흔한가."""
        if not left or not right or "§" in left or "§" in right:
            return False
        together = self.words[left + right]
        return together >= 2 and together > self.pairs[(left, right)]


def _is_display(line: str) -> bool:
    """수식만 선 줄."""
    return bool(line.strip()) and not _MATH.sub("", line).strip()


def width(line: str) -> int:
    """줄의 폭(반각 글자 수로 어림) — 한글은 둘, 수식은 명령 이름과 묶음 기호를 뺀 글자 수.
    수식이 긴 줄은 «보이는 글자»로 세면 짧아 보인다(«등식 §가 §에 대한 항등식일» 은 16자지만 한 단을 다 채운 줄이다)."""
    total = 0
    for piece in re.split(r"(\$[^$]*\$)", line):
        if piece.startswith("$") and piece.endswith("$") and len(piece) >= 2:
            total += len(re.sub(r"\\[a-zA-Z]+|[{}^_$\\\s]", "", piece))
        else:
            total += sum(2 if "가" <= ch <= "힣" else 1 for ch in piece)
    return total


#: 폭이 이보다 좁은 줄은 한 단을 못 채운 줄이다 — 줄바꿈이 뜻이 있다
WRAP_MIN_WIDTH = 34


def join_wrapped(text: str, corpus: Corpus, *, by_width: bool = False, choice_guard: bool = True) -> str:
    """줄 끝에서 끊긴 글을 잇는다. 보기 · 소문항 · 식만 선 줄 · 짧은 줄 · 문장이 끝난 줄은 그대로 둔다.

    `by_width` — 짧은 줄인지를 «보이는 글자 수» 대신 «폭»으로 잰다(수식이 긴 줄을 놓치지 않는다).
    `choice_guard` — 보기 번호로 시작하는 짧은 줄 뒤는 잇지 않는다(본문의 보기). 풀이에서는 끈다:
    풀이의 «① 정사면체와 정팔면체는 면의 모양이 정삼각형 / 으로 같다» 는 한 문장이다.
    기본값은 처음 지은 그대로다 — 검토자가 본 본문(`prepare.py`)이 바뀌지 않게."""
    out: list[str] = []
    for raw in text.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            continue
        if not out:
            out.append(line)
            continue
        previous = out[-1]
        if (
            _MARKER_HEAD.match(line)
            or _is_display(line)
            or _is_display(previous)
            or _SENTENCE_END.search(visible(previous))
            or (width(previous) < WRAP_MIN_WIDTH if by_width else len(visible(previous)) < WRAP_MIN)
            or (choice_guard and previous[:1] in CIRCLED and len(visible(previous)) < 40)
        ):
            out.append(line)
            continue
        head = line.lstrip()
        left_tokens, right_tokens = _tokens(previous), _tokens(head)
        left = left_tokens[-1] if left_tokens else ""
        right = right_tokens[0] if right_tokens else ""
        if previous.endswith("$"):
            # 수식 뒤 — 조사 · 단위면 붙이고, 새 낱말이면 띄운다
            joiner = "" if _PARTICLE.match(head) else " "
        elif head.startswith("$") or raw[:1].isspace() or previous != raw and previous.endswith(" "):
            joiner = " "
        else:
            joiner = "" if corpus.glue(left, right) else " "
        out[-1] = previous + joiner + head
    return "\n".join(out)


def merge_markers(text: str) -> str:
    """보기 번호만 선 줄을 다음 줄과 잇는다."""
    lines = [line for line in text.split("\n")]
    out: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if len(line) == 1 and line in CIRCLED and index + 1 < len(lines) and lines[index + 1].strip()[:1] not in CIRCLED:
            out.append(f"{line} {lines[index + 1].strip()}")
            index += 2
            continue
        out.append(lines[index])
        index += 1
    return "\n".join(out)


def split_choices(text: str) -> str:
    """보기 번호로 시작하고 보기가 둘 넘게 든 줄을 보기마다 한 줄로. 수식 안의 원문자는 세지 않는다."""
    out: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped[:1] not in CIRCLED:
            out.append(line)
            continue
        masked = _MATH.sub(lambda m: "§" * len(m.group(0)), stripped)
        cuts = [i for i, ch in enumerate(masked) if ch in CIRCLED]
        marks = [masked[i] for i in cuts]
        # 번호가 차례로 늘 때만 가른다 — «① ㄱ, ②» 처럼 보기 속에서 다른 번호를 가리키는 글이 있다
        rising = all(CIRCLED.index(b) == CIRCLED.index(a) + 1 for a, b in zip(marks, marks[1:]))
        if len(cuts) < 2 or not rising:
            out.append(_space_after_marker(stripped))
            continue
        for start, end in zip(cuts, cuts[1:] + [len(stripped)]):
            piece = stripped[start:end].strip()
            if piece:
                out.append(_space_after_marker(piece))
    return "\n".join(out)


def _space_after_marker(line: str) -> str:
    if line[:1] in CIRCLED and len(line) > 1 and not line[1].isspace():
        return f"{line[0]} {line[1:]}"
    return line


#: 풀이 끝의 채점 기준표 — 표가 한 줄에 한 칸씩 풀려 붙어 있다(«채점 기준 / 배점 비율 / ➊ … / 30%»)
_RUBRIC_HEAD = re.compile(r"^\s*(?:채점\s*기준|평가\s*기준|단계\s*채점\s*기준|배점\s*비율)\s*(?:표)?\s*$")
#: 풀이 줄 사이의 배점 · 단계 이름 — «▸20%» · «문제 이해» · «해결 과정» · «답 구하기» · «…… ➊» 의 꼬리표
_STEP_NOISE = re.compile(r"^\s*(?:[▸▶►]\s*\d+\s*%|\d+\s*%|문제\s*이해|해결\s*과정|답\s*구하기|확인하기|…+\s*[➊-➓]?)\s*$")
_STEP_TAIL = re.compile(r"\s*(?:\$\s*(?:CDOTS|cdots|LDOTS|…)+\s*(?:CDOTS|cdots)*\s*\$|…+|·{3,})\s*[➊-➓❶-❿①-⑩]\s*$")


def clean_solution(text: str) -> str:
    """풀이에서 채점 기준표(끝의 덩이)와 배점 표시를 걷는다. 풀이 글은 그대로다."""
    out: list[str] = []
    for line in text.split("\n"):
        if _RUBRIC_HEAD.match(line):
            break  # 여기부터 끝까지가 기준표다
        if _STEP_NOISE.match(line):
            continue
        out.append(_STEP_TAIL.sub("", line).rstrip())
    return "\n".join(line for line in out if line.strip())


def normalize_content(text: str, corpus: Corpus) -> str:
    return split_choices(join_wrapped(merge_markers(text), corpus))


def normalize_solution(text: str, corpus: Corpus) -> str:
    return join_wrapped(clean_solution(text), corpus)
