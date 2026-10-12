"""Regressions grounded in the reacquired 천재 미적분1 홍진곤 source."""
import hashlib
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).parent))
from extract import derive_from_solution, final_value  # noqa: E402
from source_input import conversion_input, source_key  # noqa: E402
from prepare import pre_convert, post_convert, separate_inline_math  # noqa: E402


def test_staged_bytes_do_not_rekey_the_original_source(tmp_path):
    logical = r"G:\고등교과서\미적분1\천재교육 미적분1 (22개정) (홍진곤)\평가자료\기초력 UP 문제\기초력 UP 문제_Ⅱ-2-01 접선의 방정식.hwp"
    local = tmp_path / "download.hwp"
    local.write_bytes(b"test source")
    original, path, key = conversion_input({"path": logical, "localPath": str(local),
        "sha256": hashlib.sha256(b"test source").hexdigest()})
    assert original == logical and path == local
    assert key == "f84c254aaee88ed5"
    assert source_key(str(local)) != key
    local.write_bytes(b"modified")
    with pytest.raises(ValueError, match="bytes changed"):
        conversion_input({"path": logical, "localPath": str(local), "sha256": hashlib.sha256(b"test source").hexdigest()})


def test_key_mismatch_stops_before_conversion():
    with pytest.raises(ValueError, match="key does not match"):
        conversion_input({"path": "G:\\old.hwp", "key": "wrong"})


def test_equation_answer_keeps_lhs_and_equivalent_final_form():
    # Source tb-f84c254aaee88ed5-0-1, last line of each of its three parts.
    text = "⑴ 따라서 구하는 접선의 방정식은\n$y=12(x-2)+8$, 즉 $y=12x-16$\n⑵ 따라서 구하는 접선의 방정식은\n$y=-3(x+1)+4$, 즉 $y=-3x+1$\n⑶ 따라서 구하는 접선의 방정식은\n$y=4(x+2)+3$, 즉 $y=4x+11$"
    assert derive_from_solution(text, equation_answer=True) == "⑴ $y=12x-16$ ⑵ $y=-3x+1$ ⑶ $y=4x+11$"


def test_equation_alternatives_survive_paragraph_wraps():
    assert final_value("즉, $y=3x+4$ 또는 $y = 3x + 4 over 9$", equation_answer=True) == "$y=3x+4$ 또는 $y = 3x + 4 over 9$"
    assert final_value("즉, $y=6x+13$ 또는\n$y=6x-19$", equation_answer=True) == "$y=6x+13$ 또는 $y=6x-19$"


def test_conditional_equations_and_unlabelled_multiple_forms_stay_unresolved():
    assert final_value("$a=0$일 때 $y=3x$\n$a=2$일 때 $y=-x+4$", equation_answer=True) is None
    assert final_value("$y=3x$ $y=4x$", equation_answer=True) is None
    assert final_value("$y=3x=4x$", equation_answer=True) is None
    assert derive_from_solution("⑴ $y=3x$\n⑵ 그림을 보고 그린다.", equation_answer=True) is None


def test_explicit_solved_variable_is_not_a_branch_or_intermediate_statement():
    # Source tb-68cd4a93b5c6bfa1-0-4 (x-intercept).
    assert final_value("$0=4x+5$에서 $x = - 5 over 4$") == "$- 5 over 4$"
    assert final_value("$0=4x+5$에서 $x=-1$ 또는 $x=2$") is None
    assert final_value("$0=4x+5$에서 $x=-1$이라고 가정한다.") is None


def test_numeric_conclusion_cues_do_not_drop_independent_assignments():
    assert final_value("$v=-6$\n따라서 $k=-6$") == "$-6$"
    assert final_value("따라서 $f(x)= 1 over 2 x^2 +3$이므로 $f(4)=8+3=11$") == "$11$"
    assert final_value("따라서 $a=3$, $b=0$") is None
    assert final_value("$D over 4 le0$, 즉\n$-6 le a le 6$") == "$-6 le a le 6$"
    assert final_value("이어야 하므로 구하는 실수 $k$의 값의 범위는\n$2<k<12$") == "$2<k<12$"
    assert final_value("$2<k<12$\n그림을 보고 답을 구하시오.") is None


def test_adjacent_inline_boundaries_do_not_become_display_delimiters():
    assert post_convert("$k$$(0<k<1)$가") == "$k$ $(0<k<1)$가"
    assert separate_inline_math("$a$ $b$") == "$a$ $b$"
    assert separate_inline_math("$$x$$") == "$$x$$"


def test_roman_unit_scope_survives_source_spacing_controls():
    assert pre_convert("$x rm`m$") == "$x `{rm m}$"
    assert pre_convert("$p rm``m/s^2$") == "$p ``{rm m}/{rm s}^2$"
    assert pre_convert("$rm ABC$") == "$rm ABC$"
