# -*- coding: utf-8 -*-
"""교과서 이관 — 지면 검토자의 출력 읽기.

  python -m pytest scripts/import/textbook/final-check/test_check_collect.py -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_collect import check_key, judge, parse_output, repair_escapes  # noqa: E402

OUTPUT = """### 1
content: ok
why:
solution: keep
solwhy:
new:
### 2
content: flaw
why: 본문 수식에 boldx 가 글자로 남았다
solution: replace
solwhy: 다음 문항의 본문이 들어 있다
new:
$3x=12$이므로 $x=4$이다.
따라서 답은 ③이다.
### 3
content: OK
why:
solution: none
solwhy:
new:
```
$2+3=5$이다.
```
"""


def test_blocks_are_read_with_the_new_solution_as_the_tail():
    blocks = parse_output(OUTPUT)
    assert sorted(blocks) == [1, 2, 3]
    assert blocks[1] == {"content": "ok", "why": "", "solution": "keep", "solwhy": "", "new": ""}
    assert blocks[2]["why"] == "본문 수식에 boldx 가 글자로 남았다"
    assert blocks[2]["new"] == "$3x=12$이므로 $x=4$이다.\n따라서 답은 ③이다."
    # 코드 울타리로 감싼 해설은 울타리를 걷는다
    assert blocks[3]["new"] == "$2+3=5$이다."


def test_a_control_character_that_was_a_latex_command_is_put_back():
    broken = "$\\dfrac{9}{5}\times\\left(-\\dfrac{10}{3}\right)$ · $\x0crac{1}{2}$ · $\x08egin{cases}$ · $\x07ngle A$"
    assert repair_escapes(broken) == "$\\dfrac{9}{5}\\times\\left(-\\dfrac{10}{3}\\right)$ · $\\frac{1}{2}$ · $\\begin{cases}$ · $\\angle A$"
    # 줄 끝의 CRLF 는 줄바꿈일 뿐이다
    assert repair_escapes("content: ok\r\nwhy:\r\n") == "content: ok\nwhy:\n"


def test_a_verdict_that_does_not_fit_is_not_written():
    block = lambda **over: {"content": "ok", "why": "", "solution": "keep", "solwhy": "", "new": "", **over}  # noqa: E731
    assert judge(block(), True)[0] == {"content": "ok", "contentWhy": None, "solution": "keep", "solutionWhy": None, "newSolution": None}
    assert judge(block(content="OK"), True)[0]["content"] == "ok"
    # 후보가 없는데 그대로 두라 · 다시 쓰라면서 해설이 없다 · 모르는 값
    assert judge(block(), False) == (None, "후보가 없는데 keep")
    assert judge(block(solution="replace"), True) == (None, "새 해설이 없다")
    assert judge(block(content="maybe"), True)[0] is None
    # 후보가 있는데 none — 새 해설이 있으면 replace 로 읽는다
    assert judge(block(solution="none", new="$1$이다."), True)[0]["solution"] == "replace"
    # 본문이 흠이면 해설이 없어도 된다(어차피 잠긴다)
    assert judge(block(content="flaw", why="끊겼다", solution="none"), False)[0]["newSolution"] is None
    # keep 인데 해설을 적었으면 버린다 — 후보를 그대로 쓴다
    assert judge(block(new="$1$이다."), True)[0]["newSolution"] is None


def test_the_key_of_a_text_is_the_same_value_the_loader_computes():
    """🔴 `src/__tests__/unit/schoolTextbookCheckKey.test.ts` 가 쥔 값과 같다 — 값이 바뀌면 두 시험을 같이 고친다."""
    frac = chr(92) + "frac{1}{2}"
    assert check_key("두 점 사이의 거 리는 $12$이다.\n① $1$\n② $" + frac + "$", "②", None) == "03d5c45174dfe3f6"
    assert check_key("다음을 계산하시오.", "$3$", "$1+2=3$이다.\n따라서 답은 $3$이다.") == "fa5c672c3ea86ef3"
    # 빈칸 · 줄바꿈은 지문에 넣지 않는다
    assert check_key("두 점 사이의 거리는 $12$이다. ① $1$ ② $" + frac + "$", " ② ", "") == "03d5c45174dfe3f6"
    # 그림이 딸린 문항 — 그림의 지문이 들어가면 다른 값이고, 없으면 전과 같다
    assert check_key("다음을 계산하시오.", "$3$", None, []) == check_key("다음을 계산하시오.", "$3$", None)
    assert check_key("오른쪽 그림에서 [그림]", "$3$", None, ["aaaa", "bbbb"]) == "33dc7ff9a0995456"
