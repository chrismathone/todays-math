# -*- coding: utf-8 -*-
"""교과서 이관 — 검토가 끝난 글의 마무리 손질(글자를 안 바꾸는 것만).

  python -m pytest scripts/import/textbook/test_finalize.py -q

예는 전부 실으려던 문항의 최종 표본에서 눈으로 찾은 것이다(2026-10-07).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from finalize import finish_content, finish_solution, tidy_math  # noqa: E402
from normalize import Corpus, join_wrapped, width  # noqa: E402

CORPUS = Corpus()
for sample in (
    "이 등식이 항등식일 때, 상수의 값을 구하시오.",
    "주어진 식이 항등식일 때, 상수의 값을 모두 구하시오.",
    "각 면이 합동인 정다면체는 정십이면체이다. 그리고 정십이면체이다.",
    "꼭짓점이 가장 많은 것은 정십이면체이다. 면의 모양이 정삼각형으로 같다고 한다.",
    "두 도형은 면의 모양이 정삼각형으로 같다. 그래서 정삼각형으로 같다고 본다.",
):
    CORPUS.feed(sample)


def test_a_line_full_of_math_is_wide_even_when_it_has_few_visible_letters():
    line = r"등식 $\frac{x-1}{3}=\frac{ax+4}{6}+b$가 $x$에 대한 항등식일"
    assert width(line) >= 34
    assert width("(정답 $2$개)") < 34 and width("태민이네 반 학생들의 혈액형") < 34
    text = line + "\n때, 상수 $a,\\,b$의 값을 각각 구하시오."
    # 처음 지은 대로(검토자가 본 꼴)는 안 잇고, 폭으로 재면 잇는다
    assert join_wrapped(text, CORPUS).count("\n") == 1
    assert finish_content(text.split("\n"), [], CORPUS) == line + " 때, 상수 $a,\\,b$의 값을 각각 구하시오."


def test_dropped_lines_are_taken_out_before_joining():
    lines = ["등식", "번부터 25번까지 서술형입니다.", "20", r"이차 정사각행렬 $A$의 성분을 $a_{ij}=(-2)^{i+j}+k$라 하자. $k$의 값을 구하시오."]
    assert finish_content(lines, [0, 1, 2], CORPUS) == lines[3]


def test_a_solution_line_that_starts_with_a_choice_mark_is_joined_too():
    solution = "① 정사면체와 정팔면체는 면의 모양이 정삼각형\n으로 같다.\n⑤ 꼭짓점의 개수가 가장 많은 정다면체는 정십이\n면체이다.\n따라서 옳지 않은 것은 ⑤이다."
    assert finish_solution(solution, CORPUS).split("\n") == [
        "① 정사면체와 정팔면체는 면의 모양이 정삼각형으로 같다.",
        "⑤ 꼭짓점의 개수가 가장 많은 정다면체는 정십이면체이다.",
        "따라서 옳지 않은 것은 ⑤이다.",
    ]


def test_step_marks_of_a_written_answer_are_taken_out():
    solution = "$\\frac{25}{84}=\\frac{25}{2^{2}×3×7}$ ◀ ㉮\n따라서 $63$이다. ◀ ㉰ 단계"
    assert finish_solution(solution, CORPUS) == "$\\frac{25}{84}=\\frac{25}{2^{2}×3×7}$\n따라서 $63$이다."


def test_math_notation_is_tidied_without_changing_a_value():
    assert tidy_math(r"따라서 $x=+-1$, $x=+-\sqrt{2}$이므로") == r"따라서 $x=\pm 1$, $x=\pm \sqrt{2}$이므로"
    assert tidy_math(r"선분 $\mathrm{A}B$ · $74.8\,\mathrm{k}m$ · $\mathrm{c}m^{2}$ · $100\,\mathrm{d}B$") == (
        r"선분 $\mathrm{AB}$ · $74.8\,\mathrm{km}$ · $\mathrm{cm}^{2}$ · $100\,\mathrm{dB}$"
    )
    # 수식 밖 · 띄어 쓴 것 · 괄호 앞은 그대로
    for text in (r"$\mathrm{P}(A)$", r"$\mathrm{A} B$", "값은 +-1 이다", r"$a+(-3)$", r"$\mathrm{AB}$"):
        assert tidy_math(text) == text
