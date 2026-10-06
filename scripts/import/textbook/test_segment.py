# -*- coding: utf-8 -*-
"""교과서 이관 — 문단의 흐름을 문항 · 정답 · 풀이로 가르는 규칙 (실제 출판사 꼴을 본뜬 예).

  python -m pytest scripts/import/textbook/test_segment.py -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from hwpx_flow import Para, Picture  # noqa: E402
from segment import key_pairs, lead_number, merge_answer_file, segment  # noqa: E402
from extract import is_answer_file, pair_key, resolve_answer  # noqa: E402


def P(text: str = "", pictures=None, lead=None) -> Para:
    pictures = pictures or []
    return Para(text, pictures, lead, 0, [])


GLYPH = Picture("image1", 1740, 2040)
FIGURE = Picture("image9", 9960, 9000)


def test_lead_number_reads_padded_and_plain_and_attached_math():
    assert lead_number("01 다음 중 옳은 것은?") == (1, "다음 중 옳은 것은?", True)
    assert lead_number("12") == (12, "", False)
    assert lead_number("3. 다음을 계산하시오.")[:2] == (3, "다음을 계산하시오.")
    assert lead_number("01$2^3$의 값")[:2] == (1, "$2^3$의 값")
    # 단위 · 이름 칸 · 수식으로 시작하는 줄은 번호가 아니다
    assert lead_number("1 학년 반 번 이름") is None
    assert lead_number("$2$개") is None


def test_key_pairs_need_a_rising_run_from_the_line_start():
    assert key_pairs("01 ④ 02 ② 03 ⑤ 04 ②") == [(1, "④"), (2, "②"), (3, "⑤"), (4, "②")]
    assert key_pairs("16 $2^3 ×3^3 ×5$ 17 $45$ 18 $10$")[0] == (16, "$2^3 ×3^3 ×5$")
    # 본문 속 숫자 나열은 빠른 정답 줄이 아니다
    assert key_pairs("다음 수 1 2 3 중에서") == []
    # 0 채움 꼴만 받으라 하면 «1 소수와 합성수» 소제목을 섞지 않는다
    assert key_pairs("1 소수와 합성수 02 ②, ③ 03 ①", padded=True) == []


def test_numbered_problems_then_quick_answers_then_solutions():
    doc = segment([
        P("Ⅰ. 소인수분해"),
        P("반 번 이름 점수"),
        P("01 다음 중에서 소수는?"),
        P("① $1$ ② $2$ ③ $4$ ④ $6$ ⑤ $9$"),
        P("02 $12$의 약수의 개수를 구하시오."),
        P("대단원 평가 문제"),
        P("01 ② 02 $6$"),
        P("01 $2$는 약수가 $1$과 $2$뿐이므로 소수이다."),
        P("02 $12$의 약수는 $1$, $2$, $3$, $4$, $6$, $12$이다."),
    ])
    assert [p.number for p in doc.problems] == [1, 2]
    assert doc.problems[0].text == "다음 중에서 소수는?\n① $1$ ② $2$ ③ $4$ ④ $6$ ⑤ $9$"
    assert doc.keys == {(0, 1): "②", (0, 2): "$6$"}
    assert doc.solutions[(0, 1)].startswith("$2$는 약수가")


def test_restart_with_a_question_is_a_new_section_and_without_one_is_the_answer_part():
    doc = segment([
        P("01 다음 수의 약수를 모두 구하시오."),
        P("⑴ $11$ ⑵ $25$"),
        P("02 다음 수가 소수이면 ‘소’를 쓰시오."),
        P("01 다음 중에서 소수가 아닌 것은?"),
        P("① $23$ ② $47$ ③ $51$ ④ $67$ ⑤ $71$"),
        P("02 약수가 $2$개인 수의 개수를 구하시오."),
        P("기초 탄탄 문제 \uf0e0 480쪽"),
        P("01 ⑴ $1$, $11$ / 소수 ⑵ $1$, $5$, $25$ / 합성수"),
        P("02 ⑴ 소"),
        P("실력 쑥쑥 문제 481쪽"),
        P("01 ③ 02 $5$"),
    ])
    assert [(p.section, p.number) for p in doc.problems] == [(0, 1), (0, 2), (1, 1), (1, 2)]
    # 쪽수 줄은 앞 문항의 본문에 붙지 않는다
    assert "480쪽" not in doc.problems[-1].text
    # 빠른 정답 줄기(01 ③ 02 $5$)는 번호가 다 들어맞는 둘째 묶음으로 간다
    assert doc.keys[(1, 1)] == "③" and doc.keys[(1, 2)] == "$5$"
    assert doc.keys[(0, 2)] == "⑴ 소"


def test_glyph_numbers_count_by_order_and_a_picture_answer_is_noticed():
    doc = segment([
        P("Ⅲ. 경우의 수 | 1. 경우의 수"),
        P("방정식 $a+b=5$를 만족시키는 순서쌍의 개수를 구하시오.", [GLYPH], GLYPH),
        P("서로 다른 주사위 두 개를 던질 때 경우의 수를 구하시오.", [GLYPH], GLYPH),
        P("[정답]"),
        P("", [Picture("image6", 25860, 4860)], Picture("image6", 25860, 4860)),
    ])
    assert [(p.number, p.glyph_number) for p in doc.problems] == [(1, True), (2, True)]
    assert doc.answer_section and doc.answer_is_picture
    assert doc.keys == {}


def test_a_two_digit_number_glued_to_the_stem_is_the_next_problem_only():
    lines = [P(f"{n} 다음 값을 구하시오.") for n in range(1, 10)]
    doc = segment(lines + [
        P("10두 행렬 $A$, $B$에 대하여 $A+B$를 구하시오."),
        P("11등식이 성립할 때 $a$의 값을 구하시오."),
        # 바로 다음 번호가 아니면 본문이다(«15%»)
        P("15% 할인된 값을 구하시오."),
    ])
    assert [p.number for p in doc.problems] == list(range(1, 12))
    assert doc.problems[-1].lines[-1] == "15% 할인된 값을 구하시오."


def test_figures_stay_with_their_problem():
    doc = segment([
        P("1"),
        P("오른쪽 그림에서 $x$의 값을 구하시오.", [FIGURE], FIGURE),
        P("2"),
        P("$x+1=3$일 때 $x$의 값을 구하시오."),
    ])
    assert [len(p.pictures) for p in doc.problems] == [1, 0]


def test_a_separate_answer_file_fills_the_empty_slots():
    doc = segment([
        P("01 $2^3$의 값을 구하시오."),
        P("02 다음 중 옳은 것은?"),
        P("① ㄱ ② ㄴ ③ ㄷ ④ ㄱ, ㄴ ⑤ ㄴ, ㄷ"),
    ])
    assert doc.keys == {}
    filled = merge_answer_file(doc, [
        P("Ⅰ. 지수함수와 로그함수 > 1 지수와 로그"),
        P("정답 및 해설"),
        P("정 답"),
        P("01 $8$"),
        P("02 ③"),
        P("01$2^3 =2 TIMES 2 TIMES 2=8$"),
        P("02ㄷ만 옳다."),
    ])
    assert doc.keys == {(0, 1): "$8$", (0, 2): "③"}
    assert filled == 4


def test_unit_titles_at_the_head_of_an_answer_file_do_not_take_the_place_of_the_quick_answers():
    doc = segment([P(f"{n} 다음 값을 구하시오.") for n in range(1, 4)])
    merge_answer_file(doc, [
        P("1 유리수와 순환소수"),
        P("1.1 유리수의 소수 표현"),
        P("기본"),
        P("1 ③, ⑤ 2 (1) $2$ (2) $45$"),
        P("3 ㄴ, ㄷ"),
        P("1 ① ${1} over {3} =0.333 CDOTS$"),
        P("따라서 유한소수인 것은 ③, ⑤이다."),
        P("2 (1) 순환마디: $2$"),
        P("3 ㄴ과 ㄷ의 순환마디가 같다."),
    ])
    assert doc.keys == {(0, 1): "③, ⑤", (0, 2): "(1) $2$ (2) $45$", (0, 3): "ㄴ, ㄷ"}
    assert doc.solutions[(0, 1)].startswith("① ${1} over {3}")


def test_same_size_sections_take_the_solutions_whose_numbers_match_their_problems():
    # 동아 «소단원학습지 4_7» 꼴 — 묶음 셋 중 첫 묶음의 앞 문항을 놓쳐 묶음이 «4~6 / 1~3 / 1~3» 으로 잡혔다.
    # 정답 파일은 «빠른 정답 → 풀이»가 세 번. 번호 겹침만 보면 둘째 · 셋째 묶음이 한 칸씩 밀려 붙는다
    doc = segment([
        P("04 $x+y=7$, $xy=12$일 때 $x^2+y^2$의 값을 구하시오."),
        P("05 $x-y=4$일 때 $x$의 값을 구하시오."),
        P("01 $3x-5=16$의 해를 구하시오."),
        P("02 $2x+9=31$의 해를 구하시오."),
        P("03 $4x-6=38$의 해를 구하시오."),
        P("01 $7x-13=50$의 해를 구하시오."),
        P("02 $5x+17=92$의 해를 구하시오."),
        P("03 $6x-11=55$의 해를 구하시오."),
    ])
    assert [(p.section, p.number) for p in doc.problems][2:] == [(1, 1), (1, 2), (1, 3), (2, 1), (2, 2), (2, 3)]
    merge_answer_file(doc, [
        P("01 $1$ 02 $2$ 03 $3$"),
        P("01 $10+1=11$이므로 따라서 답"),
        P("02 $20+2=22$이므로 따라서 답"),
        P("03 $30+3=33$이므로 따라서 답"),
        P("01 $7$ 02 $11$ 03 $11$"),
        P("01 $3x-5=16$에서 $3x=21$이므로 $x=7$이다."),
        P("02 $2x+9=31$에서 $2x=22$이므로 $x=11$이다."),
        P("03 $4x-6=38$에서 $4x=44$이므로 $x=11$이다."),
        P("01 $9$ 02 $15$ 03 $11$"),
        P("01 $7x-13=50$에서 $7x=63$이므로 $x=9$이다."),
        P("02 $5x+17=92$에서 $5x=75$이므로 $x=15$이다."),
        P("03 $6x-11=55$에서 $6x=66$이므로 $x=11$이다."),
    ])
    assert doc.keys[(1, 1)] == "$7$" and doc.keys[(2, 2)] == "$15$"
    assert doc.solutions[(2, 3)] == "$6x-11=55$에서 $6x=66$이므로 $x=11$이다."


def test_a_quick_answer_line_splits_even_when_the_next_number_is_not_padded():
    assert key_pairs("07 $1$ 8 $23 over 2$", padded=True) == [(7, "$1$"), (8, "$23 over 2$")]


def test_answer_files_pair_by_folder_and_stem():
    problem = r"G:\고등교과서\대수\천재\평가자료\고_대수(전)_형성평가_1-1-1_1회_문제.hwp"
    answer = r"G:\고등교과서\대수\천재\평가자료\고_대수(전)_형성평가_1-1-1_1회_정답및해설.hwp"
    other = r"G:\중등교과서\중2\동아\(동아출판) 중학_수학2_소단원학습지_1_1_해설.hwp"
    assert is_answer_file(answer) and not is_answer_file(problem)
    assert pair_key(problem) == pair_key(answer)
    assert pair_key(other)[1] == "(동아출판) 중학_수학2_소단원학습지_1_1"


def test_answers_come_from_the_key_then_from_a_choice_at_the_end_of_the_solution():
    doc = segment([
        P("01 다음 중 옳은 것은?"),
        P("① $1$ ② $2$ ③ $3$ ④ $4$ ⑤ $5$"),
        P("02 $x$의 값을 구하시오."),
        P("정답 및 풀이"),
        P("01 계산하면 $3$이 나온다. 따라서 답은 ③이다."),
        P("02 양변에서 $1$을 빼면 $x=2$이므로 따라서 $x=2$"),
    ])
    assert resolve_answer(doc, (0, 1), True) == ("③", "solution-choice")
    # 풀이 끝이 «따라서 … $x=2$» 처럼 글과 식이 섞이고 «는 $X$이다» 꼴도 아니면 지어내지 않는다
    assert resolve_answer(doc, (0, 2), False) == (None, "none")


def test_a_value_is_taken_from_the_last_line_only_when_it_is_a_bare_equation():
    from extract import derive_from_solution, final_value

    assert final_value("$A-2(A-B)+5C$\n$=-A+2B+5C$\n$=-12x^2 + 11x-51$") == "$-12x^2 + 11x-51$"
    assert final_value("따라서 $x^3$의 계수는\n$8 times 9+(-12) times 6+6 times 1=6$") == "$6$"
    assert final_value("따라서 구하는 자연수는 $45$이다.") == "$45$"
    # 끝 줄이 설명이면 뽑지 않는다
    assert final_value("$x=2$\n이므로 두 근의 합을 생각해 보자.") is None
    # 소문항마다 뽑는다 — 하나라도 못 뽑으면 통째로 포기
    assert derive_from_solution("(1) $x+y=2$이므로\n$=20$\n(2) $=12root3$") == "(1) $20$ (2) $12root3$"
    assert derive_from_solution("(1) $=20$\n(2) 그림을 그려 보면 알 수 있다.") is None
