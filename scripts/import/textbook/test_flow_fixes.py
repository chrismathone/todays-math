# -*- coding: utf-8 -*-
"""교과서 이관 — 2026-10-07 표본 검수에서 찾은 추출 결함 넷(실제 출판사 꼴을 본뜬 예).

  python -m pytest scripts/import/textbook/test_flow_fixes.py -q

넷 다 «글은 멀쩡해 보이는데 틀린 문항»을 만든다 — 그래서 싣기 전에 여기서 막는다:
  ① 소단원 제목 «02 등차수열» 을 2번 문항으로 읽어 01 · 02 가 한 문항이 된다(답은 2번 것만 붙는다)
  ② 발문 아래에 띄워 둔 자료 표가 발문보다 먼저 읽혀 **앞 문항의 끝**에 붙는다(제 문항은 자료 없이 글만 남는다)
  ③ 두 단 표의 문항이 가로로 읽혀 01 · 03 · 02 · 04 로 나오면 03 이 01 의 본문이 된다
  ④ 번호가 1로 돌아갔을 때 물음이 몇 줄 뒤에 있으면 «정답 칸»으로 읽어 뒤 문항을 통째로 답으로 쓴다
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.sax.saxutils import escape

sys.path.insert(0, str(Path(__file__).parent))

from hwpx_flow import Para, _Walker  # noqa: E402
from segment import embedded_number, segment  # noqa: E402

NS = 'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"'


def P(text: str = "", table_id: int = 0) -> Para:
    return Para(text, [], None, 0, [], 0, table_id)


def paras_of(body: str) -> list[Para]:
    walker = _Walker()
    walker.walk(ET.fromstring(f"<hp:sec {NS}>{body}</hp:sec>"), 0)
    return walker.paras


def para(*runs: str) -> str:
    return "<hp:p>" + "".join(f"<hp:run>{run}</hp:run>" for run in runs) + "</hp:p>"


def t(text: str) -> str:
    return f"<hp:t>{escape(text)}</hp:t>"


def table(rows: list[list[str]], *, float_below: int | None = None) -> str:
    pos = (
        f'<hp:pos treatAsChar="0" vertRelTo="PARA" vertOffset="{float_below}"/>'
        if float_below is not None
        else '<hp:pos treatAsChar="1" vertRelTo="PARA" vertOffset="0"/>'
    )
    body = "".join(
        "<hp:tr>" + "".join(f"<hp:tc><hp:subList>{para(t(cell))}</hp:subList></hp:tc>" for cell in row) + "</hp:tr>"
        for row in rows
    )
    return f'<hp:tbl rowCnt="{len(rows)}" colCnt="{len(rows[0])}">{pos}{body}</hp:tbl>'


# ── ① 소단원 제목은 문항 번호가 아니다 ──────────────────────────────────────────


def test_a_unit_title_before_the_first_problem_is_not_problem_two():
    doc = segment([
        P("Ⅲ. 수열 > 1 등차수열과 등비수열"),
        P("02 등차수열"),
        P("01다음 등차수열의 일반항을 구하시오."),
        P("$6,~ 11 over2 ,~ 5$"),
        P("02다섯 수 $4,~a,~b,~c,~20$이 이 순서대로 등차수열을 이룰 때, $a+b+c$의 값은?"),
        P("① $28$"),
        P("② $30$"),
    ])
    assert [(p.number, p.lines[0][:12]) for p in doc.problems] == [
        (1, "다음 등차수열의 일반항"),
        (2, "다섯 수 $4,~a,~"),
    ]
    assert all(embedded_number(p) is None for p in doc.problems)


def test_the_first_tight_number_may_ask_several_lines_later():
    # «01다음은 … 증명한 것이다.» — 물음은 증명 뒤에 온다
    doc = segment([
        P("02 수학적 귀납법"),
        P("01다음은 모든 자연수 $n$에 대하여 등식이 성립함을 수학적 귀납법으로 증명한 것이다."),
        P("(ⅰ) $n=1$일 때, 성립한다."),
        P("위의 ㈎, ㈏에 알맞은 식을 각각 $f(k)$, $g(k)$라 할 때, $f(5)+g(4)$의 값은?"),
        P("02다음은 모든 자연수 $n$에 대하여 다른 등식이 성립함을 증명한 것이다."),
    ])
    assert [p.number for p in doc.problems] == [1, 2]


def test_a_real_first_problem_that_is_not_number_one_still_starts():
    # 이어지는 자료(5번부터 시작) — 물음이 따라오면 받는다
    doc = segment([P("05 다음 중 옳은 것은?"), P("① 가 ② 나 ③ 다 ④ 라 ⑤ 마"), P("06 $x$의 값을 구하시오.")])
    assert [p.number for p in doc.problems] == [5, 6]


def test_a_tag_line_like_bar_topic_bar_is_dropped():
    doc = segment([P("02. 순열"), P("01"), P("|계승|"), P("다음을 구하시오."), P("(1) $5!$"), P("02"), P("|계승|"), P("$6!$의 값을 구하시오.")])
    assert [p.number for p in doc.problems] == [1, 2]
    assert doc.problems[0].text == "다음을 구하시오.\n(1) $5!$"


# ── ② 아래에 띄운 표는 그 문단의 글 뒤에 ────────────────────────────────────────


def test_a_table_floated_below_its_paragraph_is_read_after_the_paragraph_text():
    data = table([["$41$", "$29$"], ["$21$", "$33$"]], float_below=4132)
    paras = paras_of(
        para(t("01 다음은 윗몸 일으키기 횟수이다. 이 자료의 중앙값은?"))
        + para(t("① $29$회 ② $30$회"))
        # 02번: 표가 발문 문단의 **맨 앞 run** 에 매여 있다(자리는 문단 아래)
        + para(data, t("02 다음 자료의 최빈값은?"))
        + para(t("① $21$ ② $33$"))
    )
    texts = [p.text for p in paras]
    assert texts.index("02 다음 자료의 최빈값은?") < texts.index("$41$")
    doc = segment(paras)
    assert [(p.number, p.tables) for p in doc.problems] == [(1, 0), (2, 1)]
    # 앞 문항에 남의 표가 붙지 않는다
    assert "$41$" not in doc.problems[0].text


def test_an_inline_or_top_anchored_box_keeps_its_place():
    # 글자처럼 놓인 표(보기 상자) · 문단 첫 줄 높이에 띄운 개체는 문서 차례 그대로
    inline = table([["ㄱ. $a<b$이면 $a+c<b+c$이다. 이런 문장은 길다 — 자료 표가 아니다."]])
    paras = paras_of(para(inline, t("뒤따르는 글")))
    assert [p.text for p in paras] == ["ㄱ. $a<b$이면 $a+c<b+c$이다. 이런 문장은 길다 — 자료 표가 아니다.", "뒤따르는 글"]
    top = table([["$1$", "$2$"], ["$3$", "$4$"]], float_below=512)
    assert [p.text for p in paras_of(para(top, t("글")))][-1] == "글"


def test_table_kinds_short_cells_are_data_and_frames_or_choices_are_not():
    data = paras_of(para(table([["$x$", "$1$", "$2$"], ["$y$", "$9$", "$b$"]])))
    assert {p.table_id for p in data} == {1}
    # 보기를 표로 짠 것 — 자료 표가 아니다(보기 번호가 든 칸)
    choices = paras_of(para(table([["① $2$개", "② $3$개"], ["③ $4$개", "④ $5$개"]])))
    assert {p.table_id for p in choices} == {0}
    # 칸 하나짜리 상자(<보기> · 조건) · 물음이 든 칸(지면을 짠 틀)
    assert {p.table_id for p in paras_of(para(table([["(가) 원점에서 출발한다."]])))} == {0}
    layout = paras_of(para(table([["01", "다음을 구하시오."], ["02", "값은?"]])))
    assert {p.table_id for p in layout} == {0}
    # 표가 둘이면 번호도 둘
    two = paras_of(para(table([["$1$", "$2$"], ["$3$", "$4$"]])) + para(table([["가", "나"], ["다", "라"]])))
    assert sorted({p.table_id for p in two}) == [1, 2]


# ── ③ 차례를 벗어난 번호 ───────────────────────────────────────────────────────


def test_problems_read_across_a_two_column_table_are_put_back_in_order():
    doc = segment([
        P("01 다항식 $f(x)$를 $x+1$로 나누었을 때의 나머지를 구하시오."),
        P("03 다항식 $g(x)$가 $x+3$으로 나누어떨어질 때, 상수 $a$의 값을 구하시오."),
        P("02 다항식 $h(x)$를 $x-2$로 나누었을 때의 나머지가 $9$일 때, $k$의 값을 구하시오."),
        P("04 조립제법을 이용하여 몫과 나머지를 구하시오."),
        P("05 $P(5)$의 값을 구하시오."),
    ])
    assert [p.number for p in doc.problems] == [1, 2, 3, 4, 5]
    assert doc.problems[0].text == "다항식 $f(x)$를 $x+1$로 나누었을 때의 나머지를 구하시오."
    assert all(embedded_number(p) is None for p in doc.problems)


def test_a_far_or_repeated_number_is_not_taken_as_a_problem():
    doc = segment([
        P("01 다음을 구하시오."),
        P("12 이 줄은 물음처럼 보여도 너무 먼 번호다. 값을 구하시오."),
        P("02 다음을 구하시오."),
        P("02 같은 번호가 또 나와도 새 문항이 아니다. 구하시오."),
    ])
    assert [p.number for p in doc.problems] == [1, 2]
    # 본문에 묻힌 번호는 표시가 남는다 — 싣기 전에 걸러진다
    assert embedded_number(doc.problems[0]) == 12


# ── ④ 번호가 1로 돌아갔다 — 물음이 몇 줄 뒤에 와도 새 묶음 ───────────────────────


def test_a_restart_whose_question_comes_a_few_lines_later_is_a_new_section():
    doc = segment([
        P("1 $y=2x$에서 $f(2)$의 값을 구하시오."),
        P("2 $f(3)$의 값을 구하시오."),
        P("쌍둥이"),
        P("1"),
        P("어떤 소방차 물탱크에 $20$ L의 물이 채워져 있다."),
        P("이 물탱크에 $1$초에 $5$ L씩 물을 넣는다."),
        P("(1) 다음 표를 완성하시오."),
        P("2"),
        P("$x$와 $y$ 사이의 관계를 식으로 나타내시오."),
    ])
    assert [(p.section, p.number) for p in doc.problems] == [(0, 1), (0, 2), (1, 1), (1, 2)]
    assert not doc.answer_section


def test_a_restart_followed_by_answers_is_still_the_answer_part():
    doc = segment([
        P("1 $y=2x$에서 $f(2)$의 값을 구하시오."),
        P("2 $f(3)$의 값을 구하시오."),
        P("1"),
        P("$f(2)=2 times 2=4$"),
        P("2"),
        P("$f(3)=6$이므로 구하면 $6$이다."),
    ])
    assert [p.number for p in doc.problems] == [1, 2]
    assert doc.answer_section


def test_a_title_repeated_at_the_head_of_the_answer_part_does_not_stay_on_the_last_problem():
    doc = segment([
        P("계승"),
        P("01"),
        P("다음을 구하시오."),
        P("02"),
        P("$3!$의 값을 구하시오."),
        P("계승"),
        P("01"),
        P("$120$"),
        P("02"),
        P("$6$"),
    ])
    assert doc.problems[-1].text == "$3!$의 값을 구하시오."
