# -*- coding: utf-8 -*-
"""교과서 원본 대조 — 읽기 · 뼈대 · 견주기 · 정답 대조의 규칙 (지어낸 예문만 — 교과서 글을 넣지 않는다).

  <venv>/bin/python -m pytest scripts/qa/textbook-verify/test_verify.py -q

venv 는 저장소 밖(`display-survey/textbook-verify/.venv` — olefile · rapidfuzz · pytest).
"""
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from compare import Context, compare  # noqa: E402
from hwp5_flow import TAG_EQEDIT, Record, _char_at, equation_script, records, tree  # noqa: E402
from skeleton import skeleton  # noqa: E402
from verify import answer_verdict, display_flags  # noqa: E402


def header(tag: int, level: int, size: int) -> bytes:
    if size >= 0xFFF:
        return struct.pack("<II", tag | (level << 10) | (0xFFF << 20), size)
    return struct.pack("<I", tag | (level << 10) | (size << 20))


def judge(db: str, orig: str, context: Context = Context()) -> str:
    return compare(skeleton(db, source="latex"), skeleton(orig, source="hwp"), context).verdict


# ── HWP 이진 판 읽기 ──────────────────────────────────────────────


def test_records_read_the_extended_size_and_tree_nests_by_level():
    big = b"x" * 5000
    data = header(66, 0, 2) + b"ab" + header(67, 1, len(big)) + big + header(71, 1, 0)
    flat = records(data)
    assert [(r.tag, r.level, len(r.payload)) for r in flat] == [(66, 0, 2), (67, 1, 5000), (71, 1, 0)]
    roots = tree(flat)
    assert len(roots) == 1 and [c.tag for c in roots[0].children] == [67, 71]


def test_records_refuse_a_record_running_past_the_stream():
    try:
        records(header(67, 0, 10) + b"short")
    except ValueError:
        return
    raise AssertionError("스트림 밖으로 나가는 레코드를 받았다")


def test_char_at_joins_surrogate_pairs_and_marks_lone_halves():
    assert _char_at((0xD835, 0xDC65, 0x41), 0) == ("\U0001D465", 2)
    assert _char_at((0xD835, 0x41), 0) == ("�", 1)
    assert _char_at((0xAC00,), 0) == ("가", 1)


def test_equation_script_reads_the_eqedit_record():
    script = "x ^{2} over 3"
    payload = b"\0\0\0\0" + struct.pack("<H", len(script)) + script.encode("utf-16le") + b"\0" * 8
    ctrl = Record(71, 0, b" deqe", 0, [Record(TAG_EQEDIT, 1, payload, 0)])
    assert equation_script(ctrl) == script


# ── 뼈대 — 한글 수식과 LaTeX 를 같은 꼴로, 뜻의 구조는 남긴다 ─────────


def test_hangul_equation_and_latex_meet_on_one_skeleton():
    assert skeleton("$1 over 2$", source="hwp").strict == skeleton("$\\frac{1}{2}$", source="latex").strict
    assert skeleton("$x^2$", source="hwp").strict == skeleton("$x^{2}$", source="latex").strict
    assert skeleton("$\\dfrac{1}{2}$", source="latex").strict == skeleton("$\\frac{1}{2}$", source="latex").strict


def test_skeleton_keeps_script_and_fraction_structure():
    # 위첨자 ↔ 아래첨자 · 분수 ↔ 붙은 수는 다른 문항이다(Codex 1회차의 반례)
    assert skeleton("$x^{2}$", source="latex").strict != skeleton("$x_{2}$", source="latex").strict
    assert skeleton("$\\frac{1}{2}$", source="latex").strict != skeleton("$12$", source="latex").strict


# ── 견주기 ─────────────────────────────────────────────────────


STEM = "$x+3=5$일 때, $x$의 값을 구하시오."


def test_identical_text_is_same():
    assert judge(STEM, "$x+3=5$일 때, $x$의 값을 구하시오.") == "same"


def test_a_changed_number_sign_or_inequality_is_a_different_problem():
    assert judge("$x+3=6$일 때, $x$의 값을 구하시오.", STEM) == "different"
    assert judge("$x=3$일 때, $2x$의 값을 구하시오.", "$x=-3$일 때, $2x$의 값을 구하시오.") == "different"
    assert judge("$x<3$인 자연수 $x$를 모두 구하시오.", "$x le 3$인 자연수 $x$를 모두 구하시오.") == "different"


def test_a_dropped_question_sentence_is_a_different_problem():
    orig = "한 변의 길이가 $4$인 정사각형의 넓이를 구하시오. 또, 둘레의 길이도 구하시오."
    assert judge("한 변의 길이가 $4$인 정사각형의 넓이를 구하시오.", orig) == "different"


def test_figure_pointer_wording_is_not_a_difference():
    # D-164 «오른쪽 그림» → «다음 그림»
    assert judge("다음 그림에서 $x$의 값을 구하시오.", "오른쪽 그림에서 $x$의 값을 구하시오.") in ("same", "notation")


def test_a_file_title_left_on_the_original_side_is_notation():
    title = skeleton("문자의 사용", source="hwp").strict
    verdict = compare(
        skeleton(STEM, source="latex"),
        skeleton("문자의 사용\n" + STEM, source="hwp"),
        Context(titles=title),
    )
    assert verdict.verdict == "notation"
    assert any("머리글" in why for why in verdict.reasons)


# ── 정답 ───────────────────────────────────────────────────────


def test_answer_keeps_the_sign():
    assert answer_verdict("$-3$", {"answer": "$3$", "answerFrom": "key"}, {})[0] == "different"
    assert answer_verdict("$-3$", {"answer": "$-3$", "answerFrom": "key"}, {})[0] == "same"


def test_answer_choice_matches_a_key_with_trailing_explanation():
    assert answer_verdict("②", {"answer": "② 풀이 생략", "answerFrom": "key"}, {})[0] == "same"


def test_picture_answer_is_not_compared():
    assert answer_verdict("$5$", {"answer": None}, {"answerIsPicture": True})[0] == "picture"


def test_display_flag_catches_a_number_left_at_the_head():
    assert display_flags("3 다음 식을 계산하시오.") == ["본문 머리에 문항 번호가 남았다"]
    assert display_flags("$3$개의 공 가운데") == []
