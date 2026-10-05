"""Mutation proof for the independent guards, with no original private content."""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import pymupdf as fitz
from geometry import MM, verify


def fixture(pdf, thickness=0.25, pitch=7, length=100, grey_band=False, raster=False, font_size=10):
    doc = fitz.open()
    for page_index in range(3):
        p = doc.new_page(width=210 * MM, height=297 * MM)
        p.insert_text((20 * MM, 25 * MM), "ordinary answer words; choices 1, 2, 3",
                      fontsize=font_size[page_index] if isinstance(font_size, tuple) else font_size)
        if not raster:
            for y in [57, 57 + pitch, 57 + 2 * pitch]:
                p.draw_line((20 * MM, y * MM), ((20 + length) * MM, y * MM),
                            color=(0.65, 0.65, 0.65), width=thickness * MM)
        if grey_band:
            p.draw_rect(fitz.Rect(20 * MM, 77 * MM, 120 * MM, 79 * MM),
                        color=None, fill=(0.6, 0.6, 0.6), width=0)
    doc.save(pdf)
    doc.close()
    pages = []
    for i, phase in enumerate(["study", "keywords", "sentences"]):
        pages.append({"physicalPageIndex": i+1, "widthMm": 210, "heightMm": 297,
                      "anchors": [{"id": "title", "boxMm": [20, 20, 120, 30],
                                   "referenceBoxMm": [20, 20, 120, 30]}],
                      "rows": [{"conceptId": "C01", "rowKey": "U01.C01.r1", "phase": phase,
                                "relativePageIndex": 0, "boxMm": [20, 40, 120, 48]}],
                      "writeBoxes": [{"id": "w1", "boxMm": [20, 50, 120, 80],
                                      "columnWidthMm": 100, "written": True}],
                      "qrs": [{"id": "q1", "boxMm": [150, 50, 175, 75]}],
                      "clips": [{"id": "formula", "boxMm": [20, 35, 50, 40],
                                 "clipBoxMm": [20, 30, 120, 45]}],
                      "nodes": [{"id": "normal", "role": "content", "activity": "practice",
                                 "itemId": "Q1", "displayNumber": "1", "expectedDisplayNumber": "1"},
                                {"id": "example-solution", "role": "solution", "activity": "workedExamples",
                                 "itemId": "E1"}]})
    return {"pdfSha256": hashlib.sha256(pdf.read_bytes()).hexdigest(), "variant": "student",
            "coverage": {k: True for k in ["anchors", "rows", "writeBoxes", "qrs", "nodes", "clips"]},
            "disabledActivities": ["errorCheck"], "publicExampleItemIds": ["E1"],
            "projectedModel": {"blocks": [{"kind": "problem", "id": "normal", "itemId": "Q1",
                                           "content": "ordinary answer words; choices 1, 2, 3"},
                                          {"kind": "problem", "id": "example", "itemId": "E1",
                                           "publicWorkedExample": {"answer": "1", "solution": "visible example"}}]},
            "expectedRows": {p: [["C01", "U01.C01.r1"]] for p in ["study", "keywords", "sentences"]},
            "pages": pages}


class Guards(unittest.TestCase):
    evidence = []
    output = None

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.pdf = Path(self.temp.name) / "fixture.pdf"
        self.witness = fixture(self.pdf)

    def tearDown(self):
        self.temp.cleanup()

    def check(self, expected, witness=None):
        result = verify(self.pdf, witness or self.witness)
        codes = {x["code"] for x in result["issues"]}
        self.evidence.append({"test": self.id().split(".")[-1], "expected": expected, "codes": sorted(codes),
                              "checked": result["checked"]})
        if expected is None:
            self.assertEqual(result["status"], "passed", result["issues"])
        else:
            self.assertIn(expected, codes)

    def test_valid_no_false_positive_words_choices_and_public_example(self):
        self.check(None)

    def v2(self):
        self.witness["version"] = 2
        self.witness["coverageEvidence"] = {"pdfSha256": self.witness["pdfSha256"],
            "expectedPages": 3, "observedPages": 3, "expectedPlacedBlocks": 6, "observedBlocks": 6}
        for page in self.witness["pages"]:
            page["fontsLoaded"] = True
            page["accounting"] = {"placementFound": True, "expectedBlocks": 2, "actualBlocks": 2,
                "missingBlocks": [], "unexpectedBlocks": [], "duplicateBlocks": [],
                "clipCandidates": 1, "writeCandidates": 1, "qrCandidates": 1}

    def test_v2_complete_accounting(self):
        self.v2()
        self.check(None)

    def test_v2_forged_true_flags_without_accounting(self):
        self.witness["version"] = 2
        self.check("COVERAGE_BLOCK_ACCOUNTING")

    def test_v2_missing_final_block(self):
        self.v2()
        self.witness["pages"][0]["accounting"]["missingBlocks"] = ["missing"]
        self.check("DOM_BLOCK_POPULATION")

    def test_v2_unloaded_font(self):
        self.v2()
        self.witness["pages"][0]["fontsLoaded"] = False
        self.check("DOM_FONT_LOADING")

    def test_v2_missing_clip_candidate(self):
        self.v2()
        self.witness["pages"][0]["accounting"]["clipCandidates"] = 2
        self.check("DOM_POPULATION_ACCOUNTING")

    def test_v2_missing_writing_block(self):
        self.v2()
        self.witness["pages"][0]["accounting"]["missingWritingIds"] = ["writing"]
        self.check("DOM_WRITING_POPULATION")

    def test_v2_missing_qr_block(self):
        self.v2()
        self.witness["pages"][0]["accounting"]["missingQrIds"] = ["qr"]
        self.check("DOM_QR_POPULATION")

    def test_v2_missing_activity_block(self):
        self.v2()
        self.witness["pages"][0]["accounting"]["missingActivityIds"] = ["activity"]
        self.check("DOM_ACTIVITY_POPULATION")

    def test_v2_missing_display_number(self):
        self.v2()
        self.witness["pages"][0]["accounting"]["missingNumberIds"] = ["problem"]
        self.check("DISPLAY_NUMBER")

    def test_v2_missing_original_anchor(self):
        self.v2()
        self.witness["pages"][0]["anchorAccounting"] = [{"id": "missing", "found": False, "expectedCount": 1, "actualCount": 0}]
        self.check("ANCHOR_POPULATION")

    def source_oracle(self):
        self.v2()
        self.witness["sourceComparisonRequired"] = True
        self.witness["sourceGeometrySha256"] = "a" * 64
        for page in self.witness["pages"]:
            page["sourceReferenceFound"] = True
            page["anchorAccounting"] = [{"id": "title", "found": True, "expectedCount": 1, "actualCount": 1}]

    def test_v2_source_oracle_complete(self):
        self.source_oracle()
        self.check(None)

    def test_v2_source_oracle_missing_sheet(self):
        self.source_oracle()
        self.witness["pages"][1]["sourceReferenceFound"] = False
        self.check("SOURCE_ORACLE_PAGE_REQUIRED")

    def test_v2_source_oracle_empty_anchor_population(self):
        self.source_oracle()
        self.witness["pages"][1]["anchorAccounting"] = []
        self.check("SOURCE_ORACLE_PAGE_REQUIRED")

    def test_v2_source_oracle_missing_hash(self):
        self.source_oracle()
        del self.witness["sourceGeometrySha256"]
        self.check("SOURCE_ORACLE_HASH_REQUIRED")

    def test_pdf_hash_mismatch(self):
        self.witness["pdfSha256"] = "0" * 64
        self.check("WITNESS_PDF_HASH")

    def test_broken_thickness(self):
        self.witness = fixture(self.pdf, thickness=0.8)
        self.check("WRITE_THICKNESS")

    def test_broken_pitch(self):
        self.witness = fixture(self.pdf, pitch=9)
        self.check("WRITE_PITCH")

    def native_writing(self, reference_required=True):
        self.witness = fixture(self.pdf, pitch=8)
        for page in self.witness["pages"]:
            write = page["writeBoxes"][0]
            lines = [{"boxMm": [20, y - 6, 120, y + .125], "thicknessMm": .25}
                     for y in [57, 65, 73]]
            write.update({"writingSpace": "native-source", "nativeLines": lines,
                          "nativeExpectedLineCount": 3, "nativeReferenceRequired": reference_required,
                          "nativeReferencePdfSha256": "6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0",
                          "nativeReferenceDomSha256": "a" * 64,
                          "nativeReference": {"boxMm": list(write["boxMm"]), "lines": copy.deepcopy(lines),
                            "referencePdfVectors": [{"x0": 20, "x1": 120, "y": y, "thicknessMm": .25}
                                                    for y in [57, 65, 73]]}})
        return self.witness["pages"][0]["writeBoxes"][0]

    def test_native_original_pitch_population_and_pdf_vectors(self):
        self.native_writing()
        self.check(None)

    def test_bank_pitch_still_seven(self):
        self.witness = fixture(self.pdf, pitch=8)
        self.check("WRITE_PITCH")

    def test_native_missing_dom_rule(self):
        self.native_writing()["nativeLines"].pop()
        self.check("NATIVE_WRITE_VECTOR_POPULATION")

    def test_native_extra_expected_rule(self):
        self.native_writing()["nativeExpectedLineCount"] = 4
        self.check("NATIVE_WRITE_VECTOR_POPULATION")

    def test_native_dom_pdf_rule_shift(self):
        self.native_writing()["nativeLines"][0]["boxMm"][3] += .6
        self.check("NATIVE_WRITE_DOM_PDF_COORDINATE")

    def test_native_dom_pdf_rule_thickness(self):
        self.native_writing()["nativeLines"][0]["thicknessMm"] = .3
        self.check("NATIVE_WRITE_DOM_PDF_THICKNESS")

    def test_native_original_container_shift(self):
        self.native_writing()["nativeReference"]["boxMm"][1] += .6
        self.check("NATIVE_WRITE_BOUNDS")

    def test_native_original_pdf_rule_shift(self):
        self.native_writing()["nativeReference"]["referencePdfVectors"][0]["y"] += .6
        self.check("NATIVE_WRITE_PDF_COORDINATE")

    def test_native_original_pdf_rule_thickness(self):
        self.native_writing()["nativeReference"]["referencePdfVectors"][0]["thicknessMm"] = .3
        self.check("NATIVE_WRITE_PDF_THICKNESS")

    def test_native_wrong_original_pdf_hash(self):
        self.native_writing()["nativeReferencePdfSha256"] = "0" * 64
        self.check("NATIVE_WRITE_REFERENCE_REQUIRED")

    def test_native_malformed_original_line_population(self):
        self.native_writing()["nativeReference"]["lines"] = None
        self.check("NATIVE_WRITE_REFERENCE_REQUIRED")

    def test_native_malformed_original_vector(self):
        self.native_writing()["nativeReference"]["referencePdfVectors"][0] = {"y": 57}
        self.check("NATIVE_WRITE_REFERENCE_REQUIRED")

    def test_native_invalid_actual_dom_rule(self):
        self.native_writing()["nativeLines"][0] = None
        self.check("NATIVE_WRITE_DOM_INVALID")

    def test_native_answer_checks_actual_rules_without_original_answer_position_claim(self):
        self.native_writing(reference_required=False)
        self.witness["variant"] = "answers"
        self.check(None)

    def test_broken_line_length(self):
        self.witness = fixture(self.pdf, length=90)
        self.check("WRITE_LENGTH")

    def test_grey_band(self):
        self.witness = fixture(self.pdf, grey_band=True)
        self.check("WRITE_GREY_BAND")

    def test_missing_vector(self):
        self.witness = fixture(self.pdf, raster=True)
        self.check("WRITE_VECTOR_MISSING")

    def test_row_position(self):
        self.witness["pages"][1]["rows"][0]["boxMm"][1] += 0.7
        self.check("ROW_COORDINATE")

    def test_row_page_split(self):
        self.witness["pages"][1]["rows"][0]["relativePageIndex"] = 1
        self.check("ROW_PAGE_SPLIT")

    def test_row_key(self):
        self.witness["pages"][1]["rows"][0]["rowKey"] = "broken"
        self.check("ROW_KEYS")

    def test_disabled_semantic_node(self):
        self.witness["pages"][0]["nodes"][0]["activity"] = "errorCheck"
        self.check("DISABLED_ACTIVITY_NODE")

    def test_disabled_reference(self):
        self.witness["pages"][0]["nodes"][0]["references"] = ["errorCheck"]
        self.check("DISABLED_ACTIVITY_NODE")

    def test_answer_node(self):
        self.witness["pages"][0]["nodes"][0]["role"] = "answer"
        self.check("STUDENT_ANSWER_NODE")

    def test_answer_dto(self):
        self.witness["projectedModel"]["blocks"][0]["answer"] = "1"
        self.check("STUDENT_ANSWER_FIELD")

    def test_teacher_answer(self):
        self.witness["projectedModel"]["teacherAnswer"] = "private"
        self.check("STUDENT_TEACHER_ANSWER")

    def test_number(self):
        self.witness["pages"][0]["nodes"][0]["displayNumber"] = "06"
        self.check("DISPLAY_NUMBER")

    def test_clipping(self):
        self.witness["pages"][0]["clips"][0]["boxMm"][2] = 130
        self.check("DOM_CLIPPING")

    def test_qr_inside(self):
        self.witness["pages"][0]["qrs"][0]["boxMm"] = [90, 55, 115, 80]
        self.check("QR_INSIDE_WRITEBOX")

    def test_half_mm_anchor(self):
        self.witness["pages"][0]["anchors"][0]["boxMm"][1] += 0.6
        self.check("ANCHOR_COORDINATE")

    def test_page_dimension(self):
        self.witness["pages"][0]["widthMm"] = 211
        self.check("PAGE_DIMENSION")

    def test_all_page_requirement(self):
        self.witness["pages"].pop()
        self.check("ALL_PAGE_COVERAGE")

    def test_missing_coverage(self):
        self.witness["coverage"]["rows"] = False
        self.check("WITNESS_COVERAGE_REQUIRED")

    def test_font_missing(self):
        self.witness["requiredFonts"] = ["NanumMyeongjo"]
        self.check("FONT_MISSING")

    def test_font_not_embedded(self):
        self.witness["requiredFonts"] = ["Helvetica"]
        self.check("FONT_NOT_EMBEDDED")

    def test_continuation(self):
        self.witness["pages"][0]["nodes"][0]["continuation"] = True
        self.check("CONTINUATION_LABEL")

    def dialogue(self):
        for page in self.witness["pages"]:
            page["dialogueBoxes"] = [{"id": "speech", "unitId": "U01", "boxMm": [20, 20, 170, 30], "fontNameRegex": "Helvetica"}]

    def test_dialogue_font_size(self):
        self.witness = fixture(self.pdf, font_size=11)
        self.dialogue()
        self.check("DIALOGUE_FONT_SIZE")

    def test_dialogue_font_step(self):
        self.witness = fixture(self.pdf, font_size=10.45)
        self.dialogue()
        self.check("DIALOGUE_FONT_STEP")

    def test_dialogue_common_font(self):
        self.witness = fixture(self.pdf, font_size=(10, 10.1, 10))
        self.dialogue()
        self.check("DIALOGUE_FONT_COMMON")

    def test_pdf_figure_clipping(self):
        document = fitz.open(self.pdf)
        bitmap = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 8, 8), False)
        bitmap.clear_with(200)
        document[0].insert_image(fitz.Rect(205 * MM, 100 * MM, 220 * MM, 115 * MM), stream=bitmap.tobytes("png"))
        changed = Path(self.temp.name) / "clipped.pdf"
        document.save(changed)
        document.close()
        self.pdf = changed
        self.witness["pdfSha256"] = hashlib.sha256(changed.read_bytes()).hexdigest()
        self.check("PDF_FIGURE_OUTSIDE_PAGE")


def check_frozen_rows(folder, derived_folder, variant="student"):
    """Three controls on real authored slots, preserving the frozen PDF/witness."""
    pdf = folder / f"{variant}.pdf"
    witness_file = derived_folder / f"{variant}-witness.json"
    witness = json.loads(witness_file.read_text(encoding="utf-8"))
    baseline = verify(pdf, witness)
    assert baseline["status"] == "passed", baseline["issues"]
    selected_page = next(p for p in witness["pages"]
                         if any(r.get("activity") == "explainActivity" for r in p["rows"]))
    selected = next(r for r in selected_page["rows"] if r.get("activity") == "explainActivity")
    controls = []
    for name, code in (("missing authored explanation slot", "ROW_KEYS"),
                       ("duplicate same authored explanation slot", "ROW_DUPLICATE"),
                       ("wrong authored owner with unchanged row key", "ROW_KEYS")):
        changed = copy.deepcopy(witness)
        page = next(p for p in changed["pages"] if p["pdfPageIndex"] == selected_page["pdfPageIndex"])
        row = next(r for r in page["rows"] if r["rowKey"] == selected["rowKey"])
        if name.startswith("missing"):
            page["rows"].remove(row)
        elif name.startswith("duplicate"):
            page["rows"].append(copy.deepcopy(row))
        else:
            row["blockId"] = "wrong-authored-owner"
        result = verify(pdf, changed)
        assert any(i["code"] == code for i in result["issues"]), name
        controls.append({"control": name, "expectedFailure": code, "rejected": True})
    return {"key": folder.name, "variant": variant, "pdfSha256": witness["pdfSha256"],
            "witnessSha256": hashlib.sha256(witness_file.read_bytes()).hexdigest(),
            "baseline": baseline, "realEvidenceControls": controls}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frozen-directory", type=Path)
    parser.add_argument("--derived-directory", type=Path)
    args = parser.parse_args()
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Guards))
    real = []
    if args.frozen_directory:
        assert args.derived_directory, "Fresh derived witness directory required"
        real = [check_frozen_rows(args.frozen_directory / key, args.derived_directory / key)
                for key in ("초3-1", "중2-1")]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"passed": result.wasSuccessful(), "tests": result.testsRun,
                                      "syntheticOnly": not real, "mutations": Guards.evidence,
                                      "realEvidence": real}, indent=2), encoding="utf-8")
    raise SystemExit(0 if result.wasSuccessful() else 1)
