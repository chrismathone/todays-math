# -*- coding: utf-8 -*-
"""교과서 이관 — 뽑아 낸 글을 문제은행의 꼴로 다듬기(실제 출판사 꼴을 본뜬 예).

  python -m pytest scripts/import/textbook/test_normalize.py -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from normalize import Corpus, clean_solution, join_wrapped, merge_markers, normalize_content, split_choices  # noqa: E402


def corpus_of(*texts: str) -> Corpus:
    corpus = Corpus()
    for text in texts:
        corpus.feed(text)
    return corpus


#: 같은 자료의 다른 자리 — «조사하여» · «다면체» 는 붙여 쓰고 «자료의 중앙값» 은 띄어 쓴다
CORPUS = corpus_of(
    "다음은 학생들의 키를 조사하여 나타낸 표이다. 이 자료의 중앙값을 구하시오.",
    "어느 반 학생들의 몸무게를 조사하여 나타낸 것이다. 이 자료의 중앙값은 얼마인가?",
    "각 면이 합동인 다면체를 정다면체라고 한다. 이런 다면체를 모두 구하시오.",
    "면의 개수가 가장 적은 다면체를 말하고 이 자료의 중앙값을 다시 구하시오.",
)


def test_a_word_cut_at_the_line_end_is_glued_and_a_word_boundary_is_spaced():
    # 지학사 — 줄마다 엔터를 쳤다. 낱말 가운데서 끊긴 자리(«조사」+「하여»)와 낱말 사이에서 끊긴 자리가 섞여 있다
    text = "다음은 태민이네 반 학생 $24$명의 혈액형을 조사\n하여 나타낸 것이다. 혈액형의 최빈값은?"
    assert join_wrapped(text, CORPUS) == "다음은 태민이네 반 학생 $24$명의 혈액형을 조사하여 나타낸 것이다. 혈액형의 최빈값은?"
    text = "다음은 어느 모둠 학생들의 통학 시간을 나타낸 이 자료의\n중앙값은 몇 분인지 구하시오."
    assert join_wrapped(text, CORPUS) == "다음은 어느 모둠 학생들의 통학 시간을 나타낸 이 자료의 중앙값은 몇 분인지 구하시오."


def test_lines_that_mean_something_are_kept():
    # 문장이 끝난 줄 · 보기 · 소문항 · 식만 선 줄 · 짧은 줄 · «(단, …)»
    text = "\n".join([
        "다음 중 작도에 대한 설명으로 옳은 것을 모두 고르면?",
        "(정답 $2$개)",
        "① 길이를 잴 때에는 자를 사용한다.",
        "② 작도할 때에는 각도기를 사용한다.",
    ])
    assert join_wrapped(text, CORPUS) == text
    text = "첫째항이 $20$, 공차가 $-3$인 등차수열 $a_n$에서\n$|a_1 |+|a_3 |+|a_5 |$\n의 값을 구하시오. \n(단, $n$은 자연수)"
    assert join_wrapped(text, CORPUS).split("\n") == [
        "첫째항이 $20$, 공차가 $-3$인 등차수열 $a_n$에서",
        "$|a_1 |+|a_3 |+|a_5 |$",
        "의 값을 구하시오.",
        "(단, $n$은 자연수)",
    ]
    assert join_wrapped("낮 기온\n(단위 : $℃$)\n$4 ~~~3 ~~~5$", CORPUS) == "낮 기온\n(단위 : $℃$)\n$4 ~~~3 ~~~5$"


def test_a_particle_after_math_is_glued_and_a_new_word_is_spaced():
    assert join_wrapped("이 자료의 평균이 $6 ℃$이고 최빈값이 $5 ℃$\n일 때, $a$의 값을 구하시오.", CORPUS).startswith(
        "이 자료의 평균이 $6 ℃$이고 최빈값이 $5 ℃$일 때,"
    )
    assert join_wrapped("두 수의 합이 $10$이고 그 차가 정확히 $4$\n따라서 큰 수는 $7$이다.", CORPUS).endswith("$4$ 따라서 큰 수는 $7$이다.")


def test_an_underlined_word_on_its_own_line_is_joined_back():
    # «옳지 / 않은 / 것은?» — 밑줄 친 낱말이 따로 떨어져 나온 꼴
    text = "다음 중 함수 $f(x)=- {12} over {x}$의 함숫값으로 옳지\n않은\n것은?\n① $f(-6)=2$ ② $f(-3)=4$"
    assert join_wrapped(text, CORPUS).split("\n")[0] == "다음 중 함수 $f(x)=- {12} over {x}$의 함숫값으로 옳지 않은 것은?"


def test_choices_go_one_per_line_and_a_marker_alone_takes_the_next_line():
    assert split_choices("① $24$ ② $30$ ③ $32$\n④ $36$ ⑤ $40$").split("\n") == ["① $24$", "② $30$", "③ $32$", "④ $36$", "⑤ $40$"]
    assert split_choices("①$a<b$ ②$-2a> -2b$") == "① $a<b$\n② $-2a> -2b$"
    # 보기 안에서 다른 보기를 가리키는 글은 가르지 않는다(번호가 차례로 늘지 않는다)
    assert split_choices("⑤ ①과 ③은 서로 같다.") == "⑤ ①과 ③은 서로 같다."
    # 수식 안의 원문자는 세지 않는다
    assert split_choices("① $x+y=7 cdots ①$의 해") == "① $x+y=7 cdots ①$의 해"
    assert merge_markers("몇 개인지 구하시오.\n①\n$2$개\n②\n$3$개") == "몇 개인지 구하시오.\n① $2$개\n② $3$개"
    assert normalize_content("다음을 고르시오.\n①\n$2$개\n②\n$3$개", CORPUS) == "다음을 고르시오.\n① $2$개\n② $3$개"


def test_the_scoring_table_and_step_marks_are_taken_out_of_a_solution():
    solution = "\n".join([
        "육각기둥의 꼭짓점은 $12$개이므로 $a=12$ $CDOTS$➊",
        "칠각뿔의 면은 $8$개이므로 $b=8$ $CDOTS$➋",
        "따라서 $a+b=12+8=20$ $CDOTS$➌",
        "채점 기준",
        "배점 비율",
        "➊ $a$의 값 구하기",
        "30%",
    ])
    assert clean_solution(solution).split("\n") == [
        "육각기둥의 꼭짓점은 $12$개이므로 $a=12$",
        "칠각뿔의 면은 $8$개이므로 $b=8$",
        "따라서 $a+b=12+8=20$",
    ]
    steps = "문제 이해\n$a+b=-a$, $ab=b$\n▸20%\n해결 과정\n$a=1$\n▸60%\n답 구하기\n$a^2 +b^2 =5$\n▸20%"
    assert clean_solution(steps) == "$a+b=-a$, $ab=b$\n$a=1$\n$a^2 +b^2 =5$"
