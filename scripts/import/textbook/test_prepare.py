# -*- coding: utf-8 -*-
"""교과서 이관 — 수식 변환 앞뒤의 손질(실제 출판사 수식을 본뜬 예).

  python -m pytest scripts/import/textbook/test_prepare.py -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from prepare import balance_braces, brace_over, brace_roots, brace_scripts, close_set_brace, converts_answer, eligible, points_to_figure, post_convert, pre_convert, roman_escapes  # noqa: E402


def test_a_script_runs_until_the_space_as_the_hancom_editor_reads_it():
    # 지수법칙 · 순열 · 수열 · 행렬 성분 — 변환 정본은 첫 토큰만 올려 식을 틀리게 낸다
    assert brace_scripts("x^m x^n =x^m+n") == "x^m x^n =x^{m+n}"
    assert brace_scripts("{}_n {rm P}_r =n× {}_n-1 {rm P}_r-1") == "{}_n {rm P}_r =n× {}_{n-1} {rm P}_{r-1}"
    assert brace_scripts("a_n+1 =2a_n -3") == "a_{n+1} =2a_n -3"
    assert brace_scripts("S_n =3^2n+1 +k") == "S_n =3^{2n+1} +k"
    assert brace_scripts("a_ij = i+2j-3") == "a_{ij} = i+2j-3"
    assert brace_scripts("=a^-(p+q) =a^(-p)+(-q)") == "=a^{-(p+q)} =a^{(-p)+(-q)}"
    assert brace_scripts("sum_k=1^n`a_k = 2^n+1 -1") == "sum_{k=1}^n`a_k = 2^{n+1} -1"
    assert brace_scripts("y=left({1}over{2}right)^f(x)") == "y=left({1}over{2}right)^{f(x)}"


def test_atoms_and_already_braced_scripts_are_left_alone():
    for script in ("x^2 +y^2 +4x-2y+1=0", "a_1 +a_2 +a_7", "S_30", "2^10", "a _{1} = {1} over {2}", "x ^{2} -1", "90^CIRC"):
        assert brace_scripts(script) in (script, script.replace("^CIRC", "^{CIRC}"))


def test_a_script_stops_at_alignment_commas_spacing_marks_and_an_unmatched_paren():
    assert brace_scripts("x^2&-5x+a=0") == "x^2&-5x+a=0"
    assert brace_scripts("(x_1,````y_1 )") == "(x_1,````y_1 )"
    assert brace_scripts("a_ij`") == "a_{ij}`"
    assert brace_scripts("(a+b^2)") == "(a+b^2)"
    assert brace_scripts("(x^2n) +1") == "(x^{2n}) +1"
    # 끝에 매달린 등호는 첨자가 아니다
    assert brace_scripts("`_n rmC it_r= 5") == "`_n rmC it_r= 5"
    assert brace_scripts("a_n-1= 5") == "a_{n-1}= 5"


def test_a_fraction_takes_everything_up_to_the_space_on_both_sides():
    # 둘째 검토자가 «본문의 분수가 깨졌다»로 짚은 꼴들 — 전부 실제 자료의 수식이다
    assert brace_over("a+3i over2-i") == "{a+3i} over {2-i}"
    assert brace_over("2a-3 over5 + a+6 over5") == "{2a-3} over 5 + {a+6} over 5"
    assert brace_over("y = 1+i over 1-i") == "y = {1+i} over {1-i}"
    assert brace_over("4 over 1-i = 4(1+i) over {(1-i)(1+i)} = 4+4i over 1+1 =2+2i") == (
        "4 over {1-i} = {4(1+i)} over {(1-i)(1+i)} = {4+4i} over {1+1} =2+2i"
    )
    assert brace_over("= ac+bd over {c^2 +d^2} + bc-ad over {c^2 +d^2} i") == (
        "= {ac+bd} over {c^2 +d^2} + {bc-ad} over {c^2 +d^2} i"
    )
    assert brace_over("1 overn ge 2n overn+1") == "1 over n ge {2n} over {n+1}"
    # 괄호 안의 분수 — 몫은 괄호를 넘지 않는다
    assert brace_over("left(1+i over root2 right)^m") == "left({1+i} over {root2} right)^m"
    assert brace_over("(a+3i over 2-i)") == "({a+3i} over {2-i})"
    # 등호 · 쉼표는 몫을 가른다(띄어 쓰지 않았어도)
    assert brace_over("f(x)=x+1 over x-2") == "f(x)={x+1} over {x-2}"
    assert brace_over("2x-1 over x-2,") == "{2x-1} over {x-2},"


def test_simple_or_already_braced_fractions_and_other_over_words_are_left_alone():
    for script in ("1 over 2", "{1} over {2}", "a over b", "11 over2 ,~ 5", "{x+1} over {x-2}", "overline {AB}", "x overline y"):
        assert brace_over(script) in (script, script.replace("over2", "over 2"))
    assert brace_over("11 over2") == "11 over 2"


def test_a_root_covers_everything_up_to_the_space():
    assert brace_roots("i = root-1") == "i = root{-1}"
    assert brace_roots("sqrt a sqrt b =sqrt ab") == "sqrt a sqrt b =sqrt {ab}"
    assert brace_roots("sqrtx sqrty = sqrtxy") == "sqrtx sqrty = sqrt{xy}"
    assert brace_roots("root2x+1 - root1-x") == "root{2x+1} - root{1-x}"
    assert brace_roots("y= 2rootx = root4x") == "y= 2rootx = root{4x}"
    assert brace_roots("sqrt(-5)^2") == "sqrt{(-5)^2}"
    assert brace_roots("(sqrtab )^2") == "(sqrt{ab} )^2"
    assert brace_roots("rootx over{root3-2x}") == "rootx over{root{3-2x}}"
    # 줄바꿈(#) · 괄호는 몫을 끊는다 · 원자와 이미 묶인 것은 그대로
    assert brace_roots("cases{ x=2sqrt7#y=-sqrt7}") == "cases{ x=2sqrt7#y=-sqrt7}"
    for script in ("sqrt {x+1}", "root 2", "2SQRT6", "SQRT21", "root {3} of {8}", "root 3 of x+1"):
        assert brace_roots(script) == script
    # 분수와 같이 — 근호가 먼저 묶이고, 그 덩이가 분수의 몫이 된다
    assert pre_convert("$a+b over 2 geq sqrtab$") == "${a+b} over 2 geq sqrt{ab}$"
    assert pre_convert("$root2 over 1+i$") == "${root2} over {1+i}$"


def test_an_operator_word_stuck_between_digits_and_brackets_is_spaced_out():
    assert pre_convert("$(4a-6)div2$") == "$(4a-6) div 2$"
    assert pre_convert("$(-10x+25)div5$") == "$(-10x+25) div 5$"
    assert pre_convert("$3times(-2)$") == "$3 times (-2)$"
    # 이미 띄어 쓴 것 · 글자 사이의 것은 그대로
    assert pre_convert("$6 div x$") == "$6 div x$"
    assert pre_convert("$a div b$") == "$a div b$"
    # 몫을 묶은 **뒤에** 띄운다 — 분모는 원문의 띄어쓰기까지다(1/(3×5) 이지 1/3 × 5 가 아니다)
    assert pre_convert("$1 over 3times5 + 1 over 5times7$") == "$1 over {3 times 5} + 1 over {5 times 7}$"
    assert pre_convert("$2^3times2$") == "$2^{3 times 2}$"


def test_backslash_letters_become_upright_groups():
    assert roman_escapes(r"`_7 \P_4") == "`_7 {rm P}_4"
    assert roman_escapes(r"12`\cm") == "12`{rm cm}"
    assert pre_convert(r"상자 $\A$에 $6$개, $`_n-1 \C_2$") == "상자 ${rm A}$에 $6$개, $`_{n-1} {rm C}_2$"
    # 수식 밖의 글은 건드리지 않는다
    assert pre_convert("a_n-1 은 글이다") == "a_n-1 은 글이다"


def test_a_set_whose_closing_brace_was_lost_is_closed_but_a_system_of_equations_is_not():
    assert close_set_brace("$U= left{ 0,~1,~2 right$") == "$U= left{ 0,~1,~2 right }$"
    assert close_set_brace("$LEFT { pile{x+y=3 # x-y=1} RIGHT .$") == "$LEFT { pile{x+y=3 # x-y=1} RIGHT .$"


def test_leftovers_after_conversion():
    # 집합을 두 수식에 걸쳐 쓴 것 — 짝 없는 \left 는 크기 조절만 뗀다
    assert balance_braces(r"$A=\left\{ x\,|\,x$는 소수$\right\} $") == r"$A=\{ x\,|\,x$는 소수$\} $"
    assert balance_braces(r"$\left( \frac{1}{2}\right) ^{2}$") == r"$\left( \frac{1}{2}\right) ^{2}$"
    assert post_convert(r"수열 $\text{{}a_{n}\text{}}$의") == r"수열 $\{a_{n}\}$의"
    assert post_convert("$f(x)&=(x+1)Q(x)+1&=x+2$") == "$f(x)=(x+1)Q(x)+1=x+2$"
    assert post_convert(r"$\begin{cases} x & (x\geq 0) \\ -x & (x<0) \end{cases}$").count("&") == 2
    # 줄 머리의 기호 글꼴 «답» 표시는 걷고, 줄 가운데 것은 남긴다(뒤의 잔재 검사가 잡는다)
    assert post_convert("\U000f00bc " + r"$6\pi$" + "\n둘째 줄") == r"$6\pi$" + "\n둘째 줄"
    assert "\U000f005a" in post_convert("$l$\U000f005a$m$")


ROW = {"kind": "assessment", "isQuestion": True, "answer": "③", "answerFrom": "key", "pictures": [], "shapes": 0,
       "tables": 0, "figureMention": False, "embeddedNumber": None, "content": "다음 중 옳은 것은?"}


def test_only_self_contained_text_problems_with_an_answer_are_taken():
    assert eligible(ROW) is None
    for change, reason in (
        ({"tables": 1}, "자료 표"),
        ({"pictures": [["image1", 9000, 9000]]}, "그림"),
        ({"shapes": 2}, "한글 도형"),
        ({"content": "오른쪽 그림에서 $x$의 값은?"}, "그림을 가리키는 말"),
        ({"embeddedNumber": 3}, "붙은 문항"),
        ({"answer": None}, "답이 없다"),
        ({"answerFrom": "rejected-mismatch"}, "답이 없다"),
        ({"answerFrom": "picture-unread"}, "답이 없다"),
        ({"answer": "풀이 참조"}, "답이 «풀이 참조»"),
        ({"kind": "textbook"}, "평가 자료가 아니다"),
        ({"content": "가" * 1300}, "본문이 너무 길다"),
    ):
        assert eligible({**ROW, **change}) == reason


def test_only_words_that_point_at_a_drawing_hold_a_problem_back():
    """«그래프» · «도형» · «좌표평면» 이라는 낱말만으로는 미루지 않는다 — 그림 없이 풀리는 글이 대부분이다(771 가운데 630).
    «여기 그려진 것»을 가리키는 말만 미룬다. 글만으로 못 푸는 나머지는 검토자가 가른다(`review/BRIEF.md` 1번)."""
    for text in (
        "이차함수 $y=x^2+ax-5$의 그래프와 $x$축이 만나는 두 점의 $x$좌표가 $1$, $b$일 때",
        "곡선 $y=x^2-6x+8$과 $x$축으로 둘러싸인 도형의 넓이를 구하시오.",
        "좌표평면 위의 점 $(a, 2a)$를 $x$축의 방향으로 $b$만큼 평행이동한 점",
        "다음 중 일차함수 $y=2x-3$의 그래프에 대한 설명으로 옳지 않은 것은?",
        "다음 일차함수의 그래프 중 $x$절편이 나머지 넷과 다른 하나는?",
        "다음 입체도형 중 면의 개수가 나머지 넷과 다른 하나는?",
        "다음 도형의 넓이를 구하시오.",
        "다음 표를 완성하시오.",
    ):
        assert not points_to_figure(text), text
    for text in (
        "오른쪽 그림에서 $x$의 값은?",
        "오른쪽 그림과 같은 전개도로 만들어지는 입체도형",
        "다음 그래프는 어느 도시의 기온을 나타낸 것이다.",
        "일차함수 $y=ax+b$의 그래프가 다음과 같을 때",
        "오른쪽 표는 어느 반 학생들의 키를 조사한 것이다.",
        "다음 표는 어느 반 학생들의 키를 조사한 것이다.",
        "아래 수직선 위의 점 $A$가 나타내는 수",
        "다음 수직선 위의 네 점 $A$, $B$, $C$, $D$의 좌표",
        "다음 좌표평면 위에 세 점 $A$, $B$, $C$를 나타내시오.",
        "다음은 어느 반 학생들의 통학 시간을 나타낸 히스토그램이다.",
        "다음 줄기와 잎 그림에서",
        "오른쪽 도형의 둘레의 길이",
    ):
        assert points_to_figure(text), text


def test_decoration_only_pictures_do_not_hold_a_problem_back():
    """그림이 장식뿐이라고 갈린 문항(`figures.py` 의 text 갈래)은 글 문항이다 — 그래도 본문이 그림을 가리키면 미룬다."""
    row = {**ROW, "pictures": [["image1", 9000, 9000]], "shapes": 1}
    assert eligible(row) == "그림"
    assert eligible(row, decor=True) is None
    assert eligible({**row, "content": "오른쪽 그림에서 $x$의 값은?"}, decor=True) == "그림을 가리키는 말"


def test_an_answer_read_from_the_answer_picture_is_taken_like_any_other_key():
    """정답 칸이 그림인 자료 — 구독 모델이 읽은 답(`picture`)도 다른 출처처럼 검토로 간다(검토가 정답을 안 보고 풀어 대조한다)."""
    assert eligible({**ROW, "answerFrom": "picture"}) is None


def test_an_upright_bar_is_written_with_the_bar_outside_and_a_leftover_italic_is_dropped():
    """`rm {bar{PF prime}}` 은 `\\mathrm{\\overline{PF'}}` 로 나온다 — 그려지기는 하지만 기출 판정기가 «\\mathrm 이 삼킨 바»로 막는다
    (2026-10-08 렌더 실패 85 가운데 60). 뜻이 같은 `\\overline{\\mathrm{PF'}}` 로 쓴다. 남은 `\\mathit{x}` 는 기울임이 기본이라 `x` 다."""
    assert post_convert(r"$\mathrm{\overline{PF'}}<\overline{PF}$") == r"$\overline{\mathrm{PF'}}<\overline{PF}$"
    assert post_convert(r"$\mathrm{\overline{A'B'}}=3$") == r"$\overline{\mathrm{A'B'}}=3$"
    assert post_convert(r"$\mathit{x}+\mathit{}1$") == r"$x+1$"
    # 수식 밖은 건드리지 않는다
    assert post_convert(r"\mathit{x}") == r"\mathit{x}"


def test_an_answer_read_from_a_picture_is_already_latex_and_is_not_converted_again():
    """🔴 정답 그림에서 읽은 답은 이미 LaTeX 다 — 한글 수식 변환을 한 번 더 걸면 `\frac{5}{18}` 이 `\mathrm{frac}518` 로 깨진다
    (2026-10-08 — 정답 그림 자료 816문항 가운데 326이 «답이 다르다»로 나와 찾았다)."""
    assert converts_answer({**ROW, "answerFrom": "key"}) is True
    assert converts_answer({**ROW, "answerFrom": "picture"}) is False
