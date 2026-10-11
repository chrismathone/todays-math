"""Recovery must fail closed on unknown identities, changed bytes and answer loss."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

import pytest

sys.path.insert(0, str(Path(__file__).parent))
from inventory import parse_numbers, report_observations, new_output  # noqa: E402
from stage_archive import safe_member, stage  # noqa: E402
from build_candidates import compare, scope_audit  # noqa: E402
from calculate_packet import answers_equal  # noqa: E402
from source_input import source_key  # noqa: E402


def test_report_single_section_numbers_do_not_assert_section_zero(tmp_path):
    assert parse_numbers("2묶음 1, 4 / 3묶음 2") == [(1, 1), (1, 4), (2, 2)]
    assert parse_numbers("1, 4") == [(None, 1), (None, 4)]
    report = tmp_path / "unmapped.md"
    report.write_text("### 미적분1 · 책 — 못 붙임 2 / 4\n| `같은이름.hwp` | 풀이만 있음 | 1, 4 |\n", encoding="utf-8")
    rows = report_observations(report, "unmapped")
    assert all(row["externalId"] is None and row["section"] is None for row in rows)
    with pytest.raises(ValueError):
        parse_numbers("알 수 없는 번호")


@pytest.mark.parametrize("member", ["../source.hwp", "/source.hwp", "C:/source.hwp", "a\\..\\source.hwp"])
def test_archive_escape_is_rejected(member):
    with pytest.raises(ValueError):
        safe_member(member)


def test_staging_verifies_snapshot_identity_and_keeps_existing_outputs(tmp_path):
    root = r"G:\고등교과서\미적분1\출판사"
    source = root + r"\평가자료\test.hwp"
    archive = tmp_path / "source.zip"
    with zipfile.ZipFile(archive, "w") as zipped:
        zipped.writestr("평가자료/test.hwp", b"source bytes")
    snapshot = tmp_path / "snapshot.json"
    snapshot.write_text(json.dumps({"rows": [{"material": {"source_file": source,
        "external_key": "tb-"+source_key(source)}}]}), encoding="utf-8")
    out = tmp_path / "out"
    receipt = stage(archive, root, snapshot, out)
    row = json.loads((out / "triage.json").read_text(encoding="utf-8"))[0]
    assert receipt["verifiedLoadedSourcePaths"] == 1 and row["path"] == source
    assert row["key"] == source_key(source) and row["sha256"] == hashlib.sha256(b"source bytes").hexdigest()
    assert Path(row["localPath"]).read_bytes() == b"source bytes"
    with pytest.raises(ValueError, match="overwrite"):
        new_output(out)
    snapshot.write_text(json.dumps({"rows": [{"material": {"source_file": source, "external_key": "wrong"}}]}), encoding="utf-8")
    with pytest.raises(ValueError, match="disagrees"):
        stage(archive, root, snapshot, tmp_path / "bad")
    assert not (tmp_path / "bad").exists()


def row(number=1, section=0):
    return {"key": "test", "path": r"G:\高\test.hwp", "section": section, "number": number,
        "kind": "assessment", "isQuestion": True, "grade": "미적분1", "book": "책",
        "content": "값을 구하시오.", "answer": None, "answerFrom": "none", "solution": "$a=2$",
        "pictures": [], "shapes": 0, "tables": 0}


def test_candidates_exclude_loaded_ids_and_guard_order_and_content():
    before = row()
    after = dict(before, answer="$2$", answerFrom="solution-last")
    sources = {before["path"]: {"key": "test", "sha256": "test", "archiveMember": "test.hwp"}}
    candidates, changes = compare([before], [after], {"tb-test-0-1"}, sources)
    assert not candidates and changes[0]["status"] == "already_loaded_excluded_preserve_human_edits"
    with pytest.raises(ValueError, match="identity/order"):
        compare([before], [dict(after, number=2)], set(), sources)
    with pytest.raises(ValueError, match="content, solution"):
        compare([before], [dict(after, content="different")], set(), sources)
    audit = scope_audit([{"grade": "미적분1", "book": "책", "basename": "test.hwp", "number": 1,
                         "section": None, "externalId": None}], [before, row(section=1)], set())
    assert audit[0]["status"] == "source_identity_ambiguous" and audit[0]["externalId"] is None


def test_answer_equivalence_does_not_hide_missing_equations_or_alternatives():
    assert answers_equal("⑴ $y=1-3x$", "⑴ $y=-3x+1$")
    assert not answers_equal("⑴ $1-3x$", "⑴ $y=-3x+1$")
    assert not answers_equal("$y=3x+4$", "$y=3x+4$ 또는 $y=3x+4/9$")
    assert not answers_equal("$2$", "$3$")
