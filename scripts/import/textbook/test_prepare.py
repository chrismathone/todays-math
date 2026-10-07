# -*- coding: utf-8 -*-
"""교과서 이관 — 수식 변환 앞뒤의 손질(실제 출판사 수식을 본뜬 예).

  python -m pytest scripts/import/textbook/test_prepare.py -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from prepare import balance_braces, brace_scripts, close_set_brace, eligible, post_convert, pre_convert, roman_escapes  # noqa: E402


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
        ({"figureMention": True}, "그림을 가리키는 말"),
        ({"embeddedNumber": 3}, "붙은 문항"),
        ({"answer": None}, "답이 없다"),
        ({"answerFrom": "rejected-mismatch"}, "답이 없다"),
        ({"answer": "풀이 참조"}, "답이 «풀이 참조»"),
        ({"kind": "textbook"}, "평가 자료가 아니다"),
        ({"content": "가" * 1300}, "본문이 너무 길다"),
    ):
        assert eligible({**ROW, **change}) == reason
