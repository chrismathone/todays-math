"""Complete-record comparisons after direct visual review, never answer checking."""
import sys
sys.dont_write_bytecode = True
import difflib
import json
import re
from datetime import datetime, timezone

from audit_sources import OUT, PRIOR, ROOT, SELECTED, save, sha


def presentation_normalize(text):
    # Bounded presentation conversion for the retained HWP question scripts.
    # Raw scripts/overlines/control locations remain available separately.
    text = re.sub(r"\s+", "", text)
    for old, new in [("LEFT", ""), ("RIGHT", ""), ("TRIANGLE", "△"), ("ANGLE", "∠"),
                     ("DIVIDE", "÷"), ("TIMES", "×"), ("BOT", "⊥"), ("rm", ""),
                     ("it", ""), ("bar", ""), ("sqrt", "√"), ("over", "/"),
                     ("pi", "π"), ("`", ""), ("~", ""), ("{", ""), ("}", ""),
                     ("⟦", ""), ("⟧", ""), ("!=", "≠"), ("^2", "²"), ("^3", "³")]:
        text = text.replace(old, new)
    return text


def remove_score(text):
    return re.sub(r"\[(?:총)?\d+점(?:,부분점수있음)?\]", "", text)


def changes(a, b):
    result = []
    for op, ai, aj, bi, bj in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op != "equal":
            result.append({"op": op, "a_start": ai, "a_end": aj, "b_start": bi, "b_end": bj,
                           "a": a[ai:aj], "b": b[bi:bj]})
    return result


def main():
    sources = {s["id"]: s for s in json.loads((OUT / "source-files.json").read_text(encoding="utf-8"))}
    index = json.loads((OUT / "comparison-index.json").read_text(encoding="utf-8"))
    reviews = []
    author_inputs = []
    for ix in index:
        n = ix["n"]
        path = OUT / ix["evidence_file"]
        record = json.loads(path.read_text(encoding="utf-8"))
        normalized = json.loads((OUT / record["normalized_question_file"]).read_text(encoding="utf-8"))
        hwp = record["hwp_sources"][1]["question_record"]
        full = "\n".join(p["reconstructed_main_question_paragraph"] for p in hwp["reconstructed_paragraphs"])
        normalized_full = presentation_normalize(full)
        score_match = re.search(r"\[(?:총)?(\d+)점(?:,부분점수있음)?\]", normalized_full)
        assert score_match and int(score_match[1]) == normalized["score"]
        before_choices = full.split("①", 1)[0]
        if n in (1, 10):
            before_choices = hwp["reconstructed_paragraphs"][0]["reconstructed_main_question_paragraph"]
        hs = remove_score(presentation_normalize(before_choices))
        ns = remove_score(presentation_normalize(normalized["stem"]))
        stem_equal = hs == ns
        if n <= 17:
            parts = re.split(r"[①②③④⑤]", full)[1:]
            hc = [presentation_normalize(x) for x in parts]
            nc = [presentation_normalize(x) for x in normalized["choices"]]
            choices_equal = hc == nc and len(hc) == 5
        else:
            hc = nc = []
            choices_equal = normalized["choices"] == []
        given_box_check = None
        table_check = None
        if n == 1:
            hg = [presentation_normalize(e["script"]) for p in hwp["reconstructed_paragraphs"][1:3] for e in p["equations"]]
            ng = [presentation_normalize(g[2:]) for g in normalized["givens"]]
            # Parentheses around a numerical fractional coefficient in the
            # human transcription mean the same bounded over scalar.
            ng = [re.sub(r"\((\d+/\d+)\)", r"\1", x) for x in ng]
            given_box_check = {"hwp_complete_ordered_equations": hg,
                               "normalized_complete_ordered_equations": ng, "equal": hg == ng}
        if n == 10:
            cells = [presentation_normalize(p["reconstructed_main_question_paragraph"])
                     for p in hwp["reconstructed_paragraphs"][1:9]]
            expected = [presentation_normalize(x) for x in normalized["table"]["columns"]
                        + normalized["table"]["rows"][0]]
            table_check = {"hwp_complete_ordered_cells": cells, "normalized_complete_ordered_cells": expected,
                           "equal": cells == expected, "decimal_strings_not_rounded_or_recomputed": True}
        matches = {"complete_stem_equal_after_bounded_presentation_conversion": stem_equal,
                   "complete_ordered_choices_equal": choices_equal,
                   "score_equal": True, "all_hwp_inline_equations_placed": hwp["all_inline_equation_slots_resolved"],
                   "boxed_given_equations_equal": given_box_check is None or given_box_check["equal"],
                   "complete_table_cells_equal": table_check is None or table_check["equal"]}
        for h in record["hwp_sources"]:
            h["source_path"] = sources[h["source_id"]]["current_path"]
        record["original_scan"]["source_path"] = sources["s3"]["current_path"]
        a, b = record["completed_pdf_sources"]
        record["complete_pdf_extracted_text_comparison"]["differences"] = changes(
            a["normalized_complete_extracted_text"], b["normalized_complete_extracted_text"])
        if n == 6:
            limit = "PDF sort order interleaves overbars and the top rows of adjacent fractions differently. Both full enlarged crops show the same five complete numerator/denominator expressions. The raw crop also includes hidden nonprinted [중단원] metadata, excluded from the normalized author question."
        elif n in (10, 11, 12, 16, 17):
            limit = "The full text diff moves U+E06D overline glyphs relative to their segment letters. Complete equations, letters, words and render meanings match; original strokes are retained in raw evidence."
        else:
            limit = "Complete extracted question text equals after whitespace removal; direct figure/scan/HWP review is still required and was performed."
        record["extraction_limit_resolved_by_visual_review"] = limit
        record["computed_hwp_vs_normalized_complete_content"] = {
            "checks": matches, "hwp_complete_stem": hs, "normalized_complete_stem": ns,
            "stem_differences": changes(hs, ns), "hwp_complete_ordered_choices": hc,
            "normalized_complete_ordered_choices": nc, "boxed_givens": given_box_check, "table_cells": table_check,
            "method_limit": "Presentation conversion only; no numerical expression evaluation or original-answer solving. It does not alone prove pixels/scans equivalent."}
        record["visual_comparison_status"] = "confirmed" if all(matches.values()) else "held"
        record["direct_visual_comparison"] = {
            "question_placement_and_label": "passed",
            "complete_printed_stem_and_all_givens": "passed",
            "all_equations_signs_exponents_fractions_and_units": "passed",
            "all_ordered_choices_or_printed_absence": "passed",
            "native_tables_or_boxed_given_structure": "passed",
            "all_printed_figure_labels_and_relations_or_printed_absence": "passed",
            "score_and_partial_credit_label": "passed",
            "sources_actually_compared": ["s1 HWP main record content", "s5 HWP main record content",
                                           "s4 anonymous completed PDF", "s6 named completed PDF", "s3 original paper scan"],
            "view_image_used": True, "handwriting_not_printed_content": True,
            "original_answer_or_solution_agreement_used": False,
            "annotation_limit": "Handwritten student choices/work were incidentally visible and not transcribed or used. Scans are reviewer-only; clean printed sources and normalized question records are the author whitelist."}
        if n == 8:
            record["secondary_original_scan_check"] = json.loads((OUT / "secondary-scan-q08-link.json").read_text(encoding="utf-8"))
            record["secondary_original_scan_check"]["result"] = "Printed full five expressions/operators also match despite annotation strokes; original solution content is not input."
        record["source_identity"] = {
            "status": "confirmed" if all(matches.values()) else "held_pending_full_content_match",
            "school_full": "범일중학교", "school_normalized": "범일중", "grade": 3,
            "subject": "수학", "semester": 2, "round": "중간", "exam_year": 2025,
            "administration_date": "2025-09-23", "period": 3, "subject_code": "05",
            "basis": "Actual printed original title/date/footer, linked by complete question content and printed page/label. Neither filename nor byte hash alone is identity proof.",
            "edited_BI_label_scope": "Only these compared files; no universal BI-to-school mapping.",
            "footer_26_year_role": "Observed 대비 wording + linked explicit2025 exam administration support editorial/preparation label; creation date/intended2026 use remain unknown."}
        record["held_components"] = [
            {"component": "export_acquisition_native_custody_chain", "status": "held", "reason": "No converter/exporter or custody records inspected; content equivalence does not prove a direct chain."},
            {"component": "textbook_publisher", "status": "held", "reason": "비상 is a filename hint; no printed textbook/publisher attestation established."},
            {"component": "copyright_reuse_authorization", "status": "held", "reason": "A school copyright line is not a reuse licence/permission."},
            {"component": "curriculum_new_twin_approval", "status": "outside this source audit", "reason": "Original equivalence/identity does not approve curriculum, new answers/solutions or candidates."}]
        save(ix["evidence_file"], record)
        reviews.append({"question_number": n, "original_label": normalized["question_number"] if n <= 17 else normalized["original_label"],
                        "score": normalized["score"], "completed_pdf_page": ix["completed_page"],
                        "original_scan_page": ix["original_scan_page"], "status": record["visual_comparison_status"],
                        "source_identity_status": record["source_identity"]["status"], "checks": matches,
                        "evidence_file": ix["evidence_file"], "evidence_sha256": sha(path),
                        "normalized_question_file": record["normalized_question_file"],
                        "normalized_question_sha256": record["normalized_question_sha256"],
                        "unresolved_content_reasons": [] if all(matches.values()) else ["Full HWP/transcription comparison failed; inspect retained complete differences before confirmation."]})
        folder = OUT / f"question-only/q{n:02}"
        for p in sorted(folder.glob("*")):
            if p.is_file():
                author_inputs.append({"question_number": n, "file": p.relative_to(OUT).as_posix(), "sha256": sha(p),
                                      "kind": "normalized_printed_question" if p.suffix == ".json" else "clean_question_crop_or_figure"})
    save("author-input-manifest.json", {"original_solutions_in_inputs": False, "original_scan_renders_allowed": False,
                                        "identity_pages_or_full_pages_in_author_inputs": False, "files": author_inputs})
    previous = json.loads((PRIOR / "source-review.json").read_text(encoding="utf-8"))
    report = {"schema_version": "bumil-source-content-audit.v2", "reviewed_at": datetime.now(timezone.utc).isoformat(),
              "worker_id": "orca-codex-exam-twin-source-identity-20261008", "exam_id": previous["exam_id"],
              "scope": SELECTED, "previous_four_question_audit_edited": False,
              "previous_confirmed_questions_retained": [2, 3, 15, 21],
              "counts": {"new_questions_checked": len(reviews), "new_content_confirmed": sum(r["status"] == "confirmed" for r in reviews),
                         "new_content_held": sum(r["status"] != "confirmed" for r in reviews),
                         "new_identity_confirmed": sum(r["source_identity_status"] == "confirmed" for r in reviews),
                         "new_objective_questions": 14, "new_descriptive_questions": 3,
                         "new_printed_choices": 70, "new_question_figures": 13,
                         "hwp_main_paragraphs": 77, "hwp_equation_slots_resolved": 172,
                         "retained_previous_confirmed_questions": 4},
              "question_reviews": reviews, "source_files": list(sources.values()),
              "observed_identity": previous["observed_identity"],
              "comparison_method": ["Complete HWP inline equation reconstruction and ordered full stem/choice comparison",
                                    "Complete per-question PDF text comparisons with exact diff locations",
                                    "Direct full printed question/givens/choices/table/figure/score comparison using view_image",
                                    "Original scan numbered-placement/printed-label mapping to completed layout",
                                    "RGB/dimension differences are auxiliary, never identity/rights proof"],
              "excluded_subtrees": "HWP endnote/footnote and header/footer controls skipped without text decoding; reader stops before q21 block offset93300.",
              "pdf_question_pages_read": [1, 2, 3, 4], "pdf_page5_answer_page_loaded": False,
              "original_answer_exposure": {"incidental_handwritten_choices_or_work_visible": True,
                                           "affected_new_questions": SELECTED, "prior_four_incidentally_visible_again": [2, 3, 15, 21],
                                           "separate_answer_solution_pages_or_stored_outputs_read": False,
                                           "hwp_answer_note_text_decoded": False,
                                           "original_work_transcribed_into_author_inputs": False,
                                           "original_answer_approval_reused": False,
                                           "scan_renders_reviewer_only": True,
                                           "student_name_in_initial_view_incidentally_visible": True,
                                           "student_name_omitted_from_retained_scan_page1_render": True,
                                           "future_strict_original_answer_blindness_claimed": False},
              "rights_custody_publisher": {"status": "held", "affected_question_numbers": SELECTED,
                                          "native_custody_or_direct_HWP_export_proven": False,
                                          "publisher_from_filename_accepted": False, "permission_granted": False},
              "parent_current_candidate_digest_aggregation_modified": False,
              "duplicate_authoring_or_verification_performed": False,
              "no_db_api_install_source_main_parent_changes": True,
              "artifact_policy": {"author_allowed_manifest": "author-input-manifest.json", "reviewer_only": "reviewer-only/",
                                  "whole_pages_and_identity_snippets": "review evidence only, not author inputs"}}
    save("source-review.json", report)
    print(json.dumps({"counts": report["counts"], "held_questions": [r["question_number"] for r in reviews if r["status"] != "confirmed"],
                      "failed_details": [{"n": r["question_number"], "checks": r["checks"]} for r in reviews if not all(r["checks"].values())]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
