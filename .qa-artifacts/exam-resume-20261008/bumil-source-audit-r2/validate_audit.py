"""Meaningful audit checks: completeness, safe input boundary and preservation."""
import sys
sys.dont_write_bytecode = True
import json
import pathlib
import re
import subprocess

from audit_sources import OUT, ROOT, SELECTED, save, sha


def read(name):
    return json.loads((OUT / name).read_text(encoding="utf-8"))


def check_no_answer_keys(value):
    if isinstance(value, dict):
        assert not set(value).intersection({"answer", "solution", "correctAnswer", "correctChoice", "solutionText"})
        for child in value.values():
            check_no_answer_keys(child)
    elif isinstance(value, list):
        for child in value:
            check_no_answer_keys(child)


def main():
    report = read("source-review.json")
    assert report["scope"] == SELECTED
    assert report["counts"]["new_content_confirmed"] == report["counts"]["new_identity_confirmed"] == 17
    assert report["counts"]["new_content_held"] == 0
    assert sorted(q["question_number"] for q in report["question_reviews"]) == SELECTED
    assert len(set(SELECTED)) == 17 and not set(SELECTED).intersection({2, 3, 15, 21})
    assert report["pdf_page5_answer_page_loaded"] is False
    sources = read("source-files.json")
    for s in sources:
        p = pathlib.Path(s["current_path"])
        assert p.exists() and sha(p) == s["sha256"] and p.stat().st_size == s["bytes"]
        assert pathlib.Path(s["manifest_path"]).exists() == s["manifest_path_exists"]
    for ref in read("preservation-baseline.json"):
        assert sha(ref["path"]) == ref["sha256"], ref["path"]
    for q in report["question_reviews"]:
        p = OUT / q["evidence_file"]
        assert sha(p) == q["evidence_sha256"]
        d = json.loads(p.read_text(encoding="utf-8"))
        assert d["visual_comparison_status"] == "confirmed" and d["source_identity"]["status"] == "confirmed"
        checks = d["computed_hwp_vs_normalized_complete_content"]["checks"]
        assert checks == q["checks"] and all(checks.values())
        assert d["direct_visual_comparison"]["original_answer_or_solution_agreement_used"] is False
        normalized = read(q["normalized_question_file"])
        check_no_answer_keys(normalized)
        assert sha(OUT / q["normalized_question_file"]) == q["normalized_question_sha256"]
        n = q["question_number"]
        assert len(normalized["choices"]) == (5 if n <= 17 else 0)
        for h in d["hwp_sources"]:
            records = h["question_record"]["records"]
            assert h["question_record"]["all_inline_equation_slots_resolved"]
            assert records and max(r["offset"] for r in records) < 93300
            for r in records:
                assert r["tag"] in {67, 88}
            for pic in h["question_record"]["pictures"]:
                assert pic["tag"] == 85 and pic["offset"] < 93300
        assert d["original_scan"]["pdf_page_1based"] in (1, 2, 3, 4)
        assert d["original_scan"]["author_input_allowed"] is False
    inputs = read("author-input-manifest.json")
    assert len(inputs["files"]) == 90 and len({x["file"] for x in inputs["files"]}) == 90
    for x in inputs["files"]:
        assert re.fullmatch(r"question-only/q\d\d/(normalized-question\.json|(?:s4|s6)-printed-question\.png|(?:s4|s6)-embedded-figure\.png|hwp-figure-1\.png)", x["file"])
        assert "reviewer-only" not in x["file"] and "identity" not in x["file"] and "pages" not in x["file"]
        p = OUT / x["file"]
        assert p.resolve().is_relative_to(OUT.resolve()) and sha(p) == x["sha256"]
    assert inputs["original_solutions_in_inputs"] is False and inputs["original_scan_renders_allowed"] is False
    for rec in read("page-render-records.json") + read("identity-render-records.json") + read("question-crop-records.json"):
        assert rec.get("pdf_page_1based", rec.get("physical_pdf_page_1based")) in (1, 2, 3, 4)
        assert sha(OUT / rec["file"]) == rec["sha256"]
    hwp = read("hwp-question-only-records.json")
    a, b = hwp["sources"]
    assert a["questions"] == b["questions"]
    assert a["answer_or_solution_text_decoded"] is b["answer_or_solution_text_decoded"] is False
    assert a["stop_before_q21_block_offset"] == b["stop_before_q21_block_offset"] == 93300
    assert sum(len(p["equations"]) for q in b["questions"] for p in q["reconstructed_paragraphs"]) == 172
    assert sum(len(q["reconstructed_paragraphs"]) for q in b["questions"]) == 77
    assert sum(len(q["pictures"]) for q in b["questions"]) == 13
    ledger_count = sum(x["kind"] == "protected_82_three_ledgers" for x in read("preservation-baseline.json"))
    assert ledger_count == 9
    source_review_sha = sha(OUT / "source-review.json")
    report_path = ROOT / "docs/planning/tracks/reports/bumil-source-content-audit-r2-20261008.md"
    assert source_review_sha in report_path.read_text(encoding="utf-8")
    result = {"status": "passed", "new_questions": 17, "content_confirmed": 17, "identity_confirmed": 17,
              "content_held": 0, "author_whitelist_files": 90, "source_files_unchanged": len(sources),
              "preservation_baseline_files_unchanged": len(read("preservation-baseline.json")),
              "protected_ledger_copies_unchanged": ledger_count, "full_hwp_stems_and_ordered_choices_compared": True,
              "all_equation_slots_placed": 172, "main_paragraphs": 77, "question_figures": 13,
              "original_solutions_in_author_inputs": False, "pdf_page5_loaded": False,
              "source_review_sha256": source_review_sha, "doc_report_sha256": sha(report_path)}
    save("validation.json", result)
    files = [p for p in OUT.rglob("*") if p.is_file() and "__pycache__" not in p.parts
             and p.name != "artifact-inventory.json"]
    save("artifact-inventory.json", [{"file": str(p.relative_to(OUT)), "bytes": p.stat().st_size,
                                      "sha256": sha(p)} for p in sorted(files)])
    print(json.dumps({**result, "new_evidence_files_excluding_inventory": len(files)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
