"""Serialize manually observed component verdicts and verify bounded evidence."""
import datetime
import json
import pathlib
import subprocess
import sys

from inspect_sources import OUT, ORIGINAL, EXAM_ID, digest, save_json

sys.stdout.reconfigure(encoding="utf-8")
QUESTIONS = [2, 3, 15, 21]
sources = json.loads((OUT / "source-files.json").read_text(encoding="utf-8"))
snippets = json.loads((OUT / "snippet-records.json").read_text(encoding="utf-8"))
figures = json.loads((OUT / "selected-figure-linkage.json").read_text(encoding="utf-8"))
hwp = json.loads((OUT / "hwp-question-only-evidence.json").read_text(encoding="utf-8"))
prior = json.loads((OUT / "prior-reports-integrity.json").read_text(encoding="utf-8"))
manifests = json.loads((OUT / "manifest-question-source-excerpts.json").read_text(encoding="utf-8"))
parent = pathlib.Path("C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008")
instructions = [parent / "AGENTS.md", parent / "docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-1.md",
                parent / "docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-2.md"]


def component(name, status, basis, reasons=None, affected=QUESTIONS, evidence=None):
    return {"component": name, "status": status, "affected_question_numbers": affected,
            "basis": basis, "unresolved_reasons": reasons or [], "evidence_files": evidence or []}


components = [
    component("actual_exam_date_and_year", "confirmed", "Observed printed scan title and explicit administration line; corroborated by s2/s7.", evidence=["original-exam-header.png", "second-scan-exam-header.png", "third-scan-exam-header.png"]),
    component("school_grade_subject_semester_round", "confirmed", "Observed full school footer and named completed PDF/HWP header, linked to selected printed questions.", evidence=["original-school-footer.png", "original-copyright-school.png", "named-pdf-header.png", "s5-hwp-first-page-preview.png"]),
    component("footer_year_role", "confirmed", "Strong inference from explicit 대비 label plus linked original exam administration date: preparation/editorial label, not exam year.", ["Exact preparation/publication date and intended 2026 use are unknown."], evidence=["named-pdf-footer.png", "anonymous-pdf-footer.png", "original-exam-header.png"]),
    component("anonymous_BI_label_content_linkage", "confirmed", "Selected content matches named PDF/HWP and printed Bumil original; file-specific linkage only.", ["Actor, date and reason for changed school label are unknown."], evidence=["anonymous-pdf-header.png", "snippet-records.json", "hwp-question-only-evidence.json"]),
    component("selected_HWP_PDF_scan_content_linkage", "confirmed", "Direct visual comparison of four printed stems/conditions/options/scores and three diagrams, plus bounded HWP main text/equations/picture references.", evidence=["hwp-question-only-evidence.json", "selected-figure-linkage.json", "snippet-records.json"]),
    component("current_path_association", "confirmed", "Old work196 paths are missing; present previous-batch paths retain recorded completed-file hashes/sizes and matching selected content.", ["Mover and move date are unknown."], evidence=["source-files.json", "prior-reports-integrity.json"]),
    component("direct_export_and_acquisition_chain", "held", "Content correspondence is established; a specific export/custody sequence is not.", ["No exporter logs or acquisition/custody record inspected; filenames and byte hashes cannot establish this chain."]),
    component("textbook_publisher", "held", "비상 appears in filenames only.", ["No printed textbook/publisher identification found within reviewed question evidence."]),
    component("applicable_curriculum_approval", "held", "Grade/date are observed; curriculum approval is outside this review.", ["Official applicable curriculum/achievement-standard review remains necessary; this worker did not perform it."]),
    component("reuse_rights", "held", "Copyright line is observed, but does not grant reuse permission.", ["No permission/license evidence reviewed; do not change rights gate from this identity report."]),
    component("unselected_question_content_equivalence", "held", "Not reviewed to the same standard in this four-question task.", ["Prior all-21 comparison is historical only; no wholesale claim from selected questions."], affected=[q for q in range(1, 22) if q not in QUESTIONS]),
]

question_data = [
    {"question_number": 2, "original_label": "2", "score": 4, "scan_page": 1, "completed_pdf_page": 1,
     "conditions": ["y=2x² translated in y direction", "(-1,k)", "diagram vertex y=-4"], "choices": ["-6", "-4", "-2", "2", "4"],
     "printed_diagram": True, "figure_labels": ["x", "y", "O", "-4"], "source_identity_status": "confirmed"},
    {"question_number": 3, "original_label": "3", "score": 4, "scan_page": 1, "completed_pdf_page": 1,
     "conditions": ["vertex on x-axis", "axis x=-2", "passes (-3,3)", "asks for y-intercept coordinate"],
     "choices": ["(0,-18)", "(0,-12)", "(0,12/25)", "(0,12)", "(0,18)"], "printed_diagram": False,
     "annotation_note": "Handwritten sketch is not a printed question diagram.", "source_identity_status": "confirmed"},
    {"question_number": 15, "original_label": "15", "score": 4, "scan_page": 3, "completed_pdf_page": 3,
     "conditions": ["broken circular plate", "asks for original circumference", "preserve measurement markings as printed"],
     "choices": ["6π cm", "8π cm", "10π cm", "12π cm", "16π cm"], "printed_diagram": True,
     "figure_labels": ["8cm", "2cm", "equal-length marks", "perpendicular marker"], "source_identity_status": "confirmed"},
    {"question_number": 21, "original_label": "서술형 4", "score": 8, "partial_credit_printed": True, "scan_page": 4, "completed_pdf_page": 4,
     "conditions": ["AD, BC, CD tangent to semicircle O", "tangent points A, B, E", "AD=10cm", "AB=12cm", "asks for CB"],
     "printed_diagram": True, "figure_labels": ["A", "B", "C", "D", "E", "O", "10cm", "12cm"], "source_identity_status": "confirmed"},
]
text_comparison = []
for q in QUESTIONS:
    pair = [r for r in snippets if r["source_id"] in {"s4", "s6"} and r["question_numbers"] == [q]]
    hashes = {r["source_id"]: r["whitespace_normalized_text_sha256"] for r in pair}
    text_comparison.append({"question_number": q, "crop_text_hashes": hashes, "equal": len(set(hashes.values())) == 1,
                           "decision_basis": "visual printed text + bounded HWP equations; crop text hashes are auxiliary",
                           "extraction_limit": "q2/q3 unequal crop extraction contains clipped edge characters/nearby text; not a rendered content discrepancy" if q in {2, 3} else None})

retained = ["SOURCE-REVIEW.md", "source-files.json", "manifest-question-source-excerpts.json", "prior-reports-integrity.json",
            "snippet-records.json", "selected-figure-linkage.json", "hwp-question-only-evidence.json", "s5-hwp-first-page-preview.png",
            "inspect_sources.py", "hwp_question_only.py", "make_snippets.py", "build_report.py"]
retained += [r["file"] for r in snippets]
retained += [p["file"] for q in figures for p in [q["hwp"]] + q["pdf_figures"]]
retained = sorted(set(retained))
for source in sources:
    assert source["current_path_exists"]
    assert digest(pathlib.Path(source["current_path"])) == source["sha256"], source["id"]
for record in prior + manifests:
    assert digest(pathlib.Path(record["path"])) == record["sha256"], record["path"]
for snippet in snippets:
    assert digest(OUT / snippet["file"]) == snippet["sha256"]
    assert snippet["source_id"] not in {"s4", "s6"} or snippet["page"] in {1, 3, 4}
assert hwp["question_anchor_count"] == 21 and not hwp["answer_or_solution_records_decoded"]
assert {q["question_number"] for q in hwp["questions"]} == set(QUESTIONS)
assert all(p["offset"] <= 99382 for q in hwp["questions"] for key in ["paragraphs", "equations", "pictures"] for p in q[key])

report = {
    "schema_version": "bumil-source-identity-review.v1", "reviewed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "exam_id": EXAM_ID, "nominal_canonical_key": "범일중|중3|중3|2025-2-중간",
    "worktree": str(OUT.parents[3]), "branch": subprocess.check_output(["git", "branch", "--show-current"], text=True).strip(),
    "base_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
    "authorization_sources": [{"path": str(p), "sha256": digest(p)} for p in instructions],
    "identity_verdict": "confirmed_for_selected_questions", "affected_question_numbers": QUESTIONS,
    "scope": {"read_only_original_artifact_root": str(ORIGINAL), "selected_question_numbers": QUESTIONS,
              "completed_pdf_pages_inspected": [1, 3, 4], "completed_pdf_pages_not_content_read": [2, 5],
              "scan_primary": "s3", "scan_primary_pages_content_compared": [1, 3, 4],
              "corroborating_scans": {"s2": "date/school and printed q2/q3/q15", "s7": "date and printed q15"},
              "scan_page_identification": "leading strips of all scan pages show printed numbered questions; no separate answer page inspected",
              "hwp": "Selected main text/equations/pictures only; note subtrees excluded; final reader stops at q21 picture.",
              "no_further_workers": True, "bounded_inspection_complete": True},
    "observed_identity": {"school_full_name": "범일중학교", "school_normalized": "범일중", "grade": 3,
                          "subject": "수학", "year": 2025, "semester": 2, "round": "중간",
                          "administration_date": "2025-09-23", "period": 3, "subject_code": "05",
                          "printed_header": "2025학년도 3학년 2학기 중간고사 수학과",
                          "printed_administration": "시행일: 2025년 9월 23일 3교시 과목코드: 05",
                          "named_completed_label": "범일중 3학년 수학", "edited_completed_label": "BI중 3학년 수학",
                          "named_footer": "범일중 26년 2학기 중간고사 대비 (수학)",
                          "edited_footer": "BI중 26년 2학기 중간고사 대비 (수학)"},
    "inferences": [{"claim": "Footer year is an editorial/preparation label, not the actual exam year.",
                    "reason": "Printed 대비 wording + explicit linked 2025-09-23 administration date + selected-question content correspondence.",
                    "confidence": "high", "not_claimed": ["creation/publication date", "specific intended 2026 use", "identity of editor"]}],
    "components": components, "question_reviews": question_data, "sources": sources,
    "original_scan_page_mapping": {"s2": [1, 2, 3, 4], "s3": [1, 2, 3, 4], "s7": [3, 4, 2, 1]},
    "historical_manifest_states": [{"path": r["path"], "sha256": r["sha256"], "status": r["selected_job"]["status"],
                                   "selected_pair": r["selected_job"].get("selectedPair"), "hold_reasons": r["selected_job"]["holdReasons"]} for r in manifests],
    "content_linkage_method": ["visual printed question conditions/options/scores", "visual diagram labels/relations",
                               "bounded main-body HWP equations and selected picture references", "hashes preserve file identity, not exam identity alone"],
    "crop_text_comparisons": text_comparison,
    "figure_pixel_equality_claimed": False, "direct_HWP_to_PDF_export_claimed": False,
    "blind_review_exposure": {"separate_answer_pages_read": False, "stored_answer_solution_outputs_read": False,
                             "hwp_note_contents_decoded": False, "new_author_candidates_read": False, "new_candidate_answer_fields_read": False,
                             "original_scan_handwriting_incidentally_visible": True, "original_handwritten_work_transcribed_or_used_as_answer_evidence": False,
                             "initial_hwp_traversal_note": "Reached only answer-section heading and staff credits after q21; no answer values or note contents decoded. Retained reader/output stops at q21 picture.",
                             "candidate_answer_blindness": True, "fully_blind_to_original_student_answer_markings": False},
    "recommended_reference": {"completed_pdf_source_id": "s6", "hwp_source_id": "s5", "original_scan_source_id": "s3",
                              "status": "source_identity_evidence_only", "automatic_apply_or_hold_release": False},
    "held_resume_requirements": ["Export/custody records for any direct chain claim", "Printed publisher evidence for 비상 claim",
                                "Separate applicable curriculum/achievement-standard review", "Separate reuse-permission evidence"],
    "prohibited_actions_performed": [],
    "validation": {"all_seven_current_source_hashes_rechecked": True, "all_three_original_manifest_hashes_rechecked": True,
                   "both_prior_source_report_hashes_rechecked": True, "snippet_hashes_rechecked": True,
                   "selected_HWP_stop_boundary_checked": True, "visual_snippets_reviewed": True},
    "evidence_files": [{"file": n, "bytes": (OUT / n).stat().st_size, "sha256": digest(OUT / n)} for n in retained],
}
save_json("source-review.json", report)
save_json("commit-files.json", retained + ["source-review.json", "commit-files.json"])
print(json.dumps({"identity": report["identity_verdict"], "questions": QUESTIONS, "commit_file_count": len(retained) + 2,
                  "report_sha256": digest(OUT / "source-review.json"), "held_components": [c["component"] for c in components if c["status"] == "held"]}))
