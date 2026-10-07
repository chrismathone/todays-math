# -*- coding: utf-8 -*-
"""검토자의 답 ↔ 출판사 정답 — 표기는 접고, 값이 다르면 다르다고 한다.

  python -m pytest scripts/import/textbook/review/test_collect.py -q

예는 전부 2026-10-07 시범 묶음 넷(160문항)에서 실제로 나온 짝이다.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from collect import parse_output, same_answer  # noqa: E402


def test_the_same_value_in_another_notation_is_the_same_answer():
    for mine, theirs in (
        ("③", "③"),
        ("②, ④", "④, ②"),
        (r"⑴ $-6$명 ⑵ $-5$점", r"(1) $-6$명 (2) $-5$점"),
        (r"⑴ $-5\le a<2$ ⑵ $-1<b\le 3$", r"(1) $-5\leq a<2$ (2) $-1<b\leq 3$"),
        (r"⑴ $|x|\le 3$ ⑵ $7$개", r"(1) $\left| x\right| \leq 3$ (2) $7$개"),
        (r"⑴ $-11, 11$ ⑵ $-9$", r"(1) $-11$, $11$ (2) $-9$"),
        (r"⑴ $-2$ ⑵ $6.5$ ⑶ $\frac{1}{6}$", r"(1) $-2$ (2) $+6.5$ (3) $+\frac{1}{6}$"),
        ("$1$", "$+1$"),
        (r"$\dfrac{2}{5}$", r"$\frac{2}{5}$"),
        ("$10$", "$10$개"),
        ("$x=4$", "$4$"),
        (r"⑴ $9.8x\,\mathrm{N}$ ⑵ $98\,\mathrm{N}$", r"(1) $9.8x$ $\mathrm{N}$ (2) $98\,\mathrm{N}$"),
    ):
        assert same_answer(mine, theirs), (mine, theirs)


def test_a_different_value_is_never_called_the_same():
    for mine, theirs in (
        ("③", "④"),
        ("②", "②, ④"),
        ("$243$", "$267$번째"),
        (r"⑴ $-3$ ⑵ $5$", r"⑴ $-3$ ⑵ $-1$"),
        ("$6.5$", "$-6.5$"),
        (r"⑴ $-3a$ ⑵ $a-\frac{bc}{4}$", "문자의 사용과 식"),
        ("$12$", "$1$, $2$"),
        ("", "③"),
        ("$3$", ""),
    ):
        assert same_answer(mine, theirs) is None, (mine, theirs)


def test_a_worked_chain_in_the_key_matches_its_last_value():
    # 정답지가 계산 과정을 끝까지 적은 자료 — 마지막 «=» 뒤가 답이다(170묶음에서 «다름»의 가장 큰 갈래였다)
    assert same_answer("$-60$", r"$(-24)\times \frac{5}{2}=-60$") == "tail"
    assert same_answer("$1.2$", r"$\left( +1.5\right) -\left( +0.3\right) =\left( +1.2\right)$") == "tail"
    assert same_answer(r"$\dfrac{13}{36}$", r"$\frac{1}{4}+\frac{1}{9}=\frac{13}{36}$") == "tail"
    assert same_answer(r"⑴ $2^{4}$ ⑵ $2^{3}\times3$", "⑴ $16=2×8=2×2×4=2×2×2×2=2^{4}$\n⑵ $24=2×12=2×2×6=2×2×2×3=2^{3}×3$") == "tail"
    assert same_answer("⑴ $-24$ ⑵ $27$", "⑴ $(-8)×(+3)=-(8×3)=-24$\n⑵ $(-9)×(-3)=+(9×3)=+27$") == "tail"
    # 마지막 값이 다르면 다르다 · 소문항 하나라도 다르면 다르다
    assert same_answer("$-61$", r"$(-24)\times \frac{5}{2}=-60$") is None
    assert same_answer("⑴ $-24$ ⑵ $28$", "⑴ $(-8)×(+3)=-24$\n⑵ $(-9)×(-3)=+27$") is None
    # 정답 자리에 «다른 문항의 식»이 붙은 것은 같다고 하지 않는다(등호가 없다)
    assert same_answer(r"$\frac{3}{20}$", "$(+16)+0$") is None
    assert same_answer("$15$", "$(+16)+(-19)$") is None


def test_circle_cross_marks_and_reordered_lists():
    assert same_answer(r"⑴ $\bigcirc$ ⑵ $\times$ ⑶ $\times$", r"⑴ $bigcirc$ ⑵ $\times ~$ ⑶ $\times ~$") == "ox"
    assert same_answer("⑴ ○ ⑵ ×", "⑴ $bigcirc$\n⑵ $\\times$") == "ox"
    assert same_answer("⑴ ○ ⑵ ○", "⑴ $bigcirc$\n⑵ $\\times$") is None
    assert same_answer("$(3,~5),~(6,~3),~(9,~1)$", "$(9,~1)$, $(6,~3)$, $(3,~5)$") == "set"
    assert same_answer("$a=8,\\ b=-4$", "$a=8$, $b=-4$") in ("folded", "value", "set")
    assert same_answer("$(3,~5),~(6,~3)$", "$(9,~1)$, $(6,~3)$, $(3,~5)$") is None


def test_latex_commands_broken_into_control_characters_are_put_back():
    from collect import repair_escapes

    assert repair_escapes("$3\times 4$") == r"$3\times 4$"
    assert repair_escapes("$\x0crac{3}{20}$") == r"$\frac{3}{20}$"
    # 진짜 탭 · 줄바꿈은 그대로다
    assert repair_escapes("answer:\t③") == "answer:\t③"
    blocks = parse_output("### 1\nok: yes\nanswer: $\x0crac{3}{20}$\nsolution:\n$2\times 3=6$이다.")
    assert blocks[1]["answer"] == r"$\frac{3}{20}$" and blocks[1]["solution"] == r"$2\times 3=6$이다."


def test_equal_values_written_differently_stay_apart_for_a_second_look():
    # 같은 값이지만 글자로는 못 가른다 — 틀리게 «같다»고 하느니 «다르다»로 두고 둘째 검토에 넘긴다
    assert same_answer(r"$\frac{\pi}{3}$", r"$\frac{1}{3}\pi$") is None
    assert same_answer(r"$\frac{9}{2}y^{5}$", r"$\frac{9y^{5}}{2}$") is None
    assert same_answer("$2$", r"$\left| -2\right|$") is None


def test_the_block_format_is_read_back():
    text = "\n".join([
        "### 1",
        "ok: yes",
        "why:",
        "drop: 3, 4",
        "answer: ③",
        "unit: 14",
        "unit2:",
        "type: 계산",
        "level: 기본",
        "format: 객관식",
        "solution:",
        r"$3x=12$이므로 $x=4$이다.",
        "따라서 답은 ③이다.",
        "",
        "### 2",
        "ok: no",
        "why: 그림이 없으면 못 푼다",
        "drop:",
        "answer:",
        "unit: 7",
        "unit2: 8",
        "type: 활용",
        "level: 응용",
        "format: 단답형",
        "solution:",
    ])
    blocks = parse_output(text)
    assert blocks[1]["answer"] == "③" and blocks[1]["drop"] == "3, 4" and blocks[1]["unit"] == "14"
    assert blocks[1]["solution"] == "$3x=12$이므로 $x=4$이다.\n따라서 답은 ③이다."
    assert blocks[2]["ok"] == "no" and blocks[2]["why"] == "그림이 없으면 못 푼다" and blocks[2]["solution"] == ""
    assert blocks[2]["unit2"] == "8"
