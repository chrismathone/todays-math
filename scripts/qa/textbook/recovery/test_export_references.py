"""Negative reference checks on actual frozen local-bank exports, without changing them."""
import argparse
import copy
import hashlib
import json
import unittest
from pathlib import Path

import pymupdf as fitz

from verify_exports import answer_references
from page_references import (reference_labels, reference_phase_evidence, INDEX_ACTIVITIES,
                             compact, visible_label, printed_label,
                             _label_notation, _printed_label_evidence)


class MathLabelControls(unittest.TestCase):
    def test_frozen_upright_letters_and_trigonometric_tokens(self):
        for letters in ("R", "H", "A", "S", "RHA", "RHS"):
            self.assertEqual(visible_label(r"$\mathrm{" + letters + "}$ 합동"), letters + " 합동")
        self.assertEqual(visible_label(r"$\sin$ · $\cos$ · $\tan$"), "sin · cos · tan")

    def test_all_six_frozen_quadratics_keep_every_glyph_and_exponent_position(self):
        for source, visible in (("y=x^2", "y=x2"), ("y=-x^2", "y=−x2"),
                                ("y=ax^2", "y=ax2"), ("y=ax^2+q", "y=ax2+q"),
                                ("y=a(x-p)^2", "y=a(x−p)2"), ("y=a(x-p)^2+q", "y=a(x−p)2+q")):
            text, raised = _label_notation("이차함수 $" + source + "$의 그래프")
            self.assertEqual(text, "이차함수 " + visible + "의 그래프")
            self.assertEqual(raised, [4 + source.index("^")])

    def test_unknown_or_malformed_notation_fails_closed(self):
        for source in (r"$\sqrt{x}$", r"$\mathrm{B}$", r"$\mathrm{RH}$", r"$\sinh$",
                       r"$\sin x$", "$x^3$", "$y=x^{2}$", "$x_2$", "$y=x^2+1$",
                       "$y=x^2", "$y=x^2$$", "$y={x}$", r"\cos"):
            with self.subTest(source=source), self.assertRaises(ValueError):
                visible_label(source)

    def test_existing_numbers_variables_and_operators_remain_sensitive(self):
        for source, expected in (("$10$", "10"), ("$n$", "n"), (r"$\times$", "×"),
                                 (r"$\div$", "÷"), (r"$\cdot$", "⋅")):
            self.assertEqual(visible_label(source), expected)
        for changed in ("y=x", "y=x3", "y=−x2", "y=2", "y=x2+q"):
            self.assertNotEqual(visible_label("$y=x^2$"), changed)
        self.assertNotEqual(_label_notation("$y=x^2$"), _label_notation("$y=x2$"))

    @staticmethod
    def page(wrapped=False, raised=True, duplicate=False):
        # Deliberately reversed text-object order, with font boxes overlapping
        # vertically just as actual baseline and superscript PDF spans do.
        spans = []
        for char, x, baseline, size, font in (("B", 40, 50, 10, "Prose"),
                                             ("2", 34, 46.25 if raised else 50, 7, "KaTeX_Main-Regular"),
                                             ("A", 10, 50, 10, "Prose"),
                                             ("x", 28, 50, 10, "KaTeX_Math-Italic")):
            spans.append({"size": size, "font": font,
                          "chars": [{"c": char, "origin": [x, baseline],
                                     "bbox": [x, baseline-size, x+6 if size == 10 else x+3.5, baseline+2]}]})
        if duplicate:
            spans.append(copy.deepcopy(spans[1]))
        if wrapped:
            spans.append({"size": 10, "font": "Prose", "chars": [
                {"c": "C", "origin": [10, 64], "bbox": [10, 54, 16, 66]}]})
        class Page:
            def get_text(self, *_args, **_kwargs):
                return {"blocks": [{"lines": [{"spans": spans}]}]}
        return Page()

    def test_superscript_and_baseline_glyphs_follow_true_x_order(self):
        self.assertEqual(_printed_label_evidence(self.page(), [0, 0, 100, 100]), ("Ax2B", [2]))

    def test_wrapped_lines_remain_in_line_order(self):
        self.assertEqual(printed_label(self.page(wrapped=True), [0, 0, 100, 100]), "Ax2B\nC")

    def test_baseline_digit_is_distinct_from_raised_exponent(self):
        self.assertEqual(_printed_label_evidence(self.page(raised=False), [0, 0, 100, 100]), ("Ax2B", []))

    def test_duplicate_raised_glyph_is_preserved_and_rejected(self):
        self.assertEqual(_printed_label_evidence(self.page(duplicate=True), [0, 0, 100, 100]), ("Ax22B", [2, 3]))


def check_math_label_controls(folder, variant):
    """Read frozen exchanges and actual boxes; mutate only in-memory evidence."""
    witness_file, pdf = folder / f"{variant}-witness.json", folder / f"{variant}.pdf"
    exchange_file = folder / "exchange.private.json"
    witness = json.loads(witness_file.read_text(encoding="utf-8"))
    exchange = json.loads(exchange_file.read_text(encoding="utf-8"))
    assert hashlib.sha256(pdf.read_bytes()).hexdigest() == witness["pdfSha256"]
    assert hashlib.sha256(exchange_file.read_bytes()).hexdigest() == witness["fixtureSha256"]
    evidence, controls = [], []
    with fitz.open(pdf) as document:
        baseline = reference_labels(witness, document, exchange)
        assert not baseline["issues"], baseline["issues"]
        entries = [(b, e) for u in exchange["units"] for s in u["sections"] for b in s["blocks"]
                   if (b.get("semantic") or {}).get("node", {}).get("kind") == "references"
                   for e in b["semantic"]["node"]["entries"]
                   if any(token in e["label"] for token in (r"\mathrm", r"\sin", "^2"))]
        assert entries, "No supported frozen math labels in requested pair"
        for block, entry in entries:
            identity = (block["blockId"], entry["key"])
            page, row = next((p, r) for p in witness["pages"] for r in p["references"]
                             if (r["blockId"], r["key"]) == identity)
            expected, exponents = _label_notation(entry["label"])
            actual, raised = _printed_label_evidence(document[page["pdfPageIndex"] - 1], row["labelBoxMm"])
            assert compact(expected) == compact(row["label"]) == compact(actual) and exponents == raised
            evidence.append({"blockId": identity[0], "key": identity[1], "sourceLabel": entry["label"],
                             "expectedVisibleLabel": expected, "actualDomLabel": row["label"],
                             "actualPrintedLabel": actual, "superscriptPositions": raised,
                             "pdfPageIndex": page["pdfPageIndex"], "labelBoxMm": row["labelBoxMm"]})

            def rejected(changed, ink, name, code):
                result = reference_labels(changed, ink, exchange)
                assert any(i["code"] == code and (code == "INDEX_REFERENCE_POPULATION"
                           or (i.get("blockId"), i.get("key")) == identity) for i in result["issues"]), name
                controls.append({"key": identity[1], "control": name, "expectedFailure": code, "rejected": True})

            def changed_row(changed):
                return next(r for p in changed["pages"] for r in p["references"]
                            if (r["blockId"], r["key"]) == identity)

            cases = []
            if "^2" in entry["label"]:
                cases.extend((("missing exponent", expected.replace("2", "", 1), "2"),
                              ("changed exponent", expected.replace("2", "3", 1), None),
                              ("missing variable", expected.replace("x", "", 1), "x")))
                if "−" in expected:
                    cases.append(("changed sign", expected.replace("−", "+", 1), "−"))
            elif r"\mathrm" in entry["label"]:
                cases.append(("missing mathrm letter", expected.replace("R", "", 1), "R"))
            else:
                cases.append(("wrong trigonometric token", expected.replace("sin", "cos", 1), "n"))
            bounds = fitz.Rect([v * 72 / 25.4 for v in row["labelBoxMm"]])
            glyphs = [(span, char) for b in document[page["pdfPageIndex"] - 1].get_text("rawdict", clip=bounds)["blocks"]
                      for line in b.get("lines", []) for span in line["spans"] for char in span["chars"]]
            for name, wrong, removed in cases:
                changed = copy.deepcopy(witness)
                changed_row(changed)["label"] = wrong
                rejected(changed, document, name + " in actual DOM label", "INDEX_DOM_LABEL")
                if removed is None:
                    continue
                span, char = next((s, c) for s, c in glyphs if s["font"].startswith("KaTeX") and c["c"] == removed)
                with fitz.open(stream=document.tobytes(), filetype="pdf") as ink:
                    ink_page = ink[page["pdfPageIndex"] - 1]
                    rect = fitz.Rect(char["bbox"])
                    ink_page.add_redact_annot(fitz.Rect(rect.x0 + .05, rect.y0 + .05, rect.x1 - .05, rect.y1 - .05))
                    ink_page.apply_redactions()
                    rejected(witness, ink, "missing actual PDF glyph " + removed, "INDEX_PRINTED_LABEL")
                    if removed == "2":
                        math_baseline = next(c["origin"][1] for s, c in glyphs
                                             if s["font"].startswith("KaTeX") and c["c"] == "x")
                        ink_page.insert_text((char["origin"][0], math_baseline), "2", fontsize=span["size"])
                        flat, positions = _printed_label_evidence(ink_page, row["labelBoxMm"])
                        assert compact(flat) == compact(expected) and positions == []
                        rejected(witness, ink, "exponent moved to baseline with identical glyph sequence", "INDEX_PRINTED_LABEL")
            changed = copy.deepcopy(witness)
            changed_row(changed)["pageLabel"] = "999999"
            rejected(changed, document, "wrong destination", "INDEX_DOM_PAGE_REFERENCE")
            changed = copy.deepcopy(witness)
            changed_page = next(p for p in changed["pages"] if p["pdfPageIndex"] == page["pdfPageIndex"])
            changed_page["references"].append(copy.deepcopy(changed_row(changed)))
            rejected(changed, document, "duplicate reference population", "INDEX_REFERENCE_POPULATION")
    return {"key": folder.name, "variant": variant, "labelOnlyEvidence": True,
            "pdfSha256": witness["pdfSha256"], "fixtureSha256": witness["fixtureSha256"],
            "witnessSha256": hashlib.sha256(witness_file.read_bytes()).hexdigest(),
            "baseline": baseline, "mathEvidence": evidence, "controls": controls, "controlsPassed": True}


def check_indexes(folder, variant, witness, exchange):
    document = fitz.open(folder / f"{variant}.pdf")
    baseline = reference_labels(witness, document, exchange)
    assert baseline["expectedReferences"] > 0 and not baseline["issues"], baseline["issues"]
    assert baseline["printedNumbersChecked"] == baseline["expectedReferences"]
    assert baseline["printedLabelsChecked"] == baseline["expectedReferences"]
    phases = reference_phase_evidence(folder, variant)
    assert phases["chunksChecked"] > 0 and not phases["issues"]
    mutations = []
    recorded = json.loads((folder / f"{variant}-reference-phases.json").read_text(encoding="utf-8"))
    phase_cases = []
    changed = copy.deepcopy(recorded)
    changed["phases"] = changed["phases"][1:]
    phase_cases.append(("missing reservation", changed, "REFERENCE_PHASE_POPULATION"))
    changed = copy.deepcopy(recorded)
    next(p for p in changed["phases"] if p["referencePhase"] == "final" and p["pages"][0]["blocks"])["pages"][0]["blocks"][0]["yMm"] += 1
    phase_cases.append(("filled references moved actual block", changed, "REFERENCE_PHASE_REFLOW"))
    changed = copy.deepcopy(recorded)
    changed["phases"][0]["pdfSha256"] = "0" * 64
    phase_cases.append(("wrong reserved PDF hash", changed, "REFERENCE_PHASE_PDF_HASH"))
    changed = copy.deepcopy(recorded)
    changed["mode"] = "draft"
    phase_cases.append(("draft instead of final publisher mode", changed, "REFERENCE_PHASE_MODE"))
    for name, changed, code in phase_cases:
        result = reference_phase_evidence(folder, variant, changed)
        assert any(i["code"] == code for i in result["issues"]), name
        mutations.append({"activity": "all-reference-phases", "mutation": name, "expectedFailure": code, "rejected": True})
    for activity in sorted(INDEX_ACTIVITIES):
        ids = {b["id"] for s in witness["projectedModel"]["sections"] for b in s["blocks"]
               if (b.get("semantic") or {}).get("activity") == activity
               and (b.get("semantic") or {}).get("node", {}).get("kind") == "references"}
        row = next(r for p in witness["pages"] for r in p["references"] if r["blockId"] in ids)
        identity = (row["blockId"], row["key"])
        def changed_row(changed):
            return next(r for p in changed["pages"] for r in p["references"] if (r["blockId"], r["key"]) == identity)
        cases = []
        for field, value, name, code in (
            ("pageLabel", "999999", "wrong DOM number", "INDEX_DOM_PAGE_REFERENCE"),
            ("pageLabel", "", "missing DOM number", "INDEX_DOM_PAGE_REFERENCE"),
            ("pageBoxMm", [0, 0, 1, 1], "missing printed number", "INDEX_PRINTED_PAGE_REFERENCE"),
            ("label", "wrong reference title", "wrong DOM title", "INDEX_DOM_LABEL"),
            ("labelBoxMm", [0, 0, 1, 1], "missing printed title", "INDEX_PRINTED_LABEL")):
            changed = copy.deepcopy(witness)
            changed_row(changed)[field] = value
            cases.append((name, changed, code))
        changed = copy.deepcopy(witness)
        for page in changed["pages"]:
            page["references"] = [r for r in page["references"] if (r["blockId"], r["key"]) != identity]
        cases.append(("missing row", changed, "INDEX_REFERENCE_POPULATION"))
        changed = copy.deepcopy(witness)
        page = next(p for p in changed["pages"] if any((r["blockId"], r["key"]) == identity for r in p["references"]))
        page["references"].append(copy.deepcopy(changed_row(changed)))
        cases.append(("duplicate row", changed, "INDEX_REFERENCE_POPULATION"))
        changed = copy.deepcopy(witness)
        entry = next(e for s in changed["projectedModel"]["sections"] for b in s["blocks"] if b["id"] == row["blockId"]
                     for e in b["semantic"]["node"]["entries"] if e["key"] == row["key"])
        entry["pageLabel"] = "999999"
        cases.append(("wrong final model number", changed, "INDEX_MODEL_PAGE_REFERENCE"))
        for name, changed, code in cases:
            result = reference_labels(changed, document, exchange)
            assert any(i["code"] == code for i in result["issues"]), (activity, name)
            mutations.append({"activity": activity, "mutation": name, "expectedFailure": code, "rejected": True})
        wrong_ink = fitz.open(stream=document.tobytes(), filetype="pdf")
        page = next(p for p in witness["pages"] if any((r["blockId"], r["key"]) == identity for r in p["references"]))
        ink_page = wrong_ink[page["pdfPageIndex"] - 1]
        rect = fitz.Rect([v * 72 / 25.4 for v in row["pageBoxMm"]])
        ink_page.add_redact_annot(rect, fill=(1, 1, 1))
        ink_page.apply_redactions()
        ink_page.insert_text((rect.x0 + 1, rect.y0 + 10), "999999", fontsize=8)
        result = reference_labels(witness, wrong_ink, exchange)
        assert any(i["code"] == "INDEX_PRINTED_PAGE_REFERENCE" and i.get("key") == row["key"] for i in result["issues"])
        mutations.append({"activity": activity, "mutation": "wrong actual PDF number ink", "expectedFailure": "INDEX_PRINTED_PAGE_REFERENCE", "rejected": True})
        wrong_ink.close()
    document.close()
    return {"variant": variant, "actualReferences": baseline["expectedReferences"],
            "phaseChunks": phases["chunksChecked"], "mutations": mutations}


def check(folder, answers_only=False):
    student = json.loads((folder / "student-witness.json").read_text(encoding="utf-8"))
    answers = json.loads((folder / "answers-witness.json").read_text(encoding="utf-8"))
    for variant, witness in (("student", student), ("answers", answers)):
        assert hashlib.sha256((folder / f"{variant}.pdf").read_bytes()).hexdigest() == witness["pdfSha256"]
    document = fitz.open(folder / "answers.pdf")
    baseline = answer_references(student, answers, document)
    assert baseline["referencesChecked"] > 0 and not baseline["issues"]
    assert baseline["printedLabelsChecked"] == baseline["referencesChecked"]
    block = next(block for section in answers["projectedModel"]["sections"]
                 for block in section["blocks"] if block.get("kind") == "problem")
    item_id = block["itemId"]
    cases = []

    changed = copy.deepcopy(answers)
    changed_block = next(b for s in changed["projectedModel"]["sections"] for b in s["blocks"] if b["id"] == block["id"])
    changed_block["sourcePageLabel"] = str(int(block["sourcePageLabel"]) + 100)
    cases.append(("wrong model reference", student, changed, "ANSWER_STUDENT_PAGE_REFERENCE"))

    changed = copy.deepcopy(student)
    page = next(p for p in changed["pages"] if any(n.get("itemId") == item_id and n.get("role") == "content" for n in p["nodes"]))
    page["physicalPageIndex"] += 100
    cases.append(("wrong actual student placement", changed, answers, "ANSWER_STUDENT_PAGE_REFERENCE"))

    changed = copy.deepcopy(answers)
    node = next(n for p in changed["pages"] for n in p["nodes"] if n.get("itemId") == item_id and n.get("role") == "answer")
    node["boxMm"] = [0, 0, 1, 1]
    cases.append(("printed reference unavailable in its actual box", student, changed, "ANSWER_PRINTED_PAGE_REFERENCE"))

    changed = copy.deepcopy(answers)
    for page in changed["pages"]:
        page["nodes"] = [n for n in page["nodes"] if not (n.get("itemId") == item_id and n.get("role") == "answer")]
    cases.append(("missing answer label node", student, changed, "ANSWER_REFERENCE_LABEL_POPULATION"))

    changed = copy.deepcopy(student)
    for page in changed["pages"]:
        page["nodes"] = [n for n in page["nodes"] if n.get("itemId") != item_id]
    cases.append(("missing student item", changed, answers, "ANSWER_REFERENCE_ITEM_POPULATION"))

    results = []
    for name, s, a, code in cases:
        result = answer_references(s, a, document)
        assert any(issue["code"] == code for issue in result["issues"]), name
        results.append({"mutation": name, "expectedFailure": code, "rejected": True})
    document.close()
    indexes = []
    if not answers_only:
        exchange_file = folder / "exchange.private.json"
        assert hashlib.sha256(exchange_file.read_bytes()).hexdigest() == student["fixtureSha256"] == answers["fixtureSha256"]
        exchange = json.loads(exchange_file.read_text(encoding="utf-8"))
        indexes = [check_indexes(folder, variant, witness, exchange) for variant, witness in (("student", student), ("answers", answers))]
    return {"key": folder.name, "actualBaselineReferences": baseline["referencesChecked"],
            "mutations": results, "indexes": indexes, "passed": True}


def check_frozen_controls(folder, variant="student"):
    """Small real-evidence controls; known frozen target defects must stay failed."""
    witness_file = folder / f"{variant}-witness.json"
    witness = json.loads(witness_file.read_text(encoding="utf-8"))
    exchange = json.loads((folder / "exchange.private.json").read_text(encoding="utf-8"))
    assert hashlib.sha256((folder / f"{variant}.pdf").read_bytes()).hexdigest() == witness["pdfSha256"]
    with fitz.open(folder / f"{variant}.pdf") as document:
        baseline = reference_labels(witness, document, exchange)
        target_codes = {"INDEX_DOM_PAGE_REFERENCE", "INDEX_PRINTED_PAGE_REFERENCE", "INDEX_MODEL_PAGE_REFERENCE"}
        assert baseline["printedLabelsChecked"] == baseline["expectedReferences"]
        assert baseline["issues"] and all(i["code"] in target_codes and i["activity"] == "conceptIndex"
                                          for i in baseline["issues"]), baseline["issues"]
        controls, math_evidence = [], []
        entries = [(b, e) for u in exchange["units"] for s in u["sections"] for b in s["blocks"]
                   if (b.get("semantic") or {}).get("activity") == "conceptIndex"
                   for e in b["semantic"]["node"]["entries"]]
        for block, entry in entries:
            if "$" not in entry["label"]:
                continue
            page, row = next((p, r) for p in witness["pages"] for r in p["references"]
                             if r["blockId"] == block["blockId"] and r["key"] == entry["key"])
            expected = visible_label(entry["label"])
            actual = printed_label(document[page["pdfPageIndex"] - 1], row["labelBoxMm"])
            math_evidence.append({"key": entry["key"], "sourceLabel": entry["label"],
                                  "expectedVisibleLabel": expected, "actualDomLabel": row["label"],
                                  "actualPrintedLabel": actual, "labelBoxMm": row["labelBoxMm"],
                                  "pdfPageIndex": page["pdfPageIndex"]})
        if math_evidence:
            proof = math_evidence[0]
            wrong = proof["expectedVisibleLabel"]
            for token, replacement in (("10", "11"), ("×", "÷"), ("÷", "×"), ("0", "1"), ("n", "m")):
                if token in wrong:
                    wrong = wrong.replace(token, replacement, 1)
                    break
            assert wrong != proof["expectedVisibleLabel"]
            changed = copy.deepcopy(witness)
            next(r for p in changed["pages"] for r in p["references"] if r["key"] == proof["key"])["label"] = wrong
            checked = reference_labels(changed, document, exchange)
            assert any(i["code"] == "INDEX_DOM_LABEL" and i.get("key") == proof["key"] for i in checked["issues"])
            controls.append({"control": "changed meaningful inline math in actual DOM label", "expectedFailure": "INDEX_DOM_LABEL", "rejected": True})
            # In-memory PDF only: remove the actual math glyph run while keeping prose.
            ink = fitz.open(stream=document.tobytes(), filetype="pdf")
            ink_page = ink[proof["pdfPageIndex"] - 1]
            bounds = fitz.Rect([v * 72 / 25.4 for v in proof["labelBoxMm"]])
            math_span = next(span for b in ink_page.get_text("dict", clip=bounds)["blocks"]
                             for line in b.get("lines", []) for span in line["spans"]
                             if "KaTeX" in span["font"])
            ink_page.add_redact_annot(fitz.Rect(math_span["bbox"]), fill=(1, 1, 1))
            ink_page.apply_redactions()
            checked = reference_labels(witness, ink, exchange)
            assert any(i["code"] == "INDEX_PRINTED_LABEL" and i.get("key") == proof["key"] for i in checked["issues"])
            controls.append({"control": "missing actual inline math ink inside original label box", "expectedFailure": "INDEX_PRINTED_LABEL", "rejected": True})
            ink.close()
        sample = next(s for s in baseline["samples"] if s.get("targetResolution") == "semantic-concepts-activity")
        assert any(i["code"] == "INDEX_PRINTED_PAGE_REFERENCE" and i.get("key") == sample["key"]
                   for i in baseline["issues"])
        controls.append({"control": "unchanged frozen section pointer misses actual definition card",
                         "expectedFailure": "INDEX_PRINTED_PAGE_REFERENCE", "rejected": True})
        competing = copy.deepcopy(witness)
        canonical = next(b for s in competing["projectedModel"]["sections"] for b in s["blocks"]
                         if b["id"] == sample["targetPlacement"]["blockId"])
        earlier = next(b for s in competing["projectedModel"]["sections"] for b in s["blocks"]
                       if b["unitKey"] == canonical["unitKey"] and (b.get("semantic") or {}).get("activity") == "errorCheck"
                       and any(p["physicalPageIndex"] < sample["targetPlacement"]["pdfPageIndex"]
                               and any(n["id"] == b["id"] for n in p["nodes"]) for p in competing["pages"]))
        earlier["semantic"]["node"] = copy.deepcopy(canonical["semantic"]["node"])
        preferred = reference_labels(competing, document, exchange)
        preferred_sample = next(s for s in preferred["samples"] if s["key"] == sample["key"] and s["blockId"] == sample["blockId"])
        assert preferred_sample["firstPlacedConcept"]["blockId"] == earlier["id"]
        assert preferred_sample["targetPlacement"]["blockId"] == canonical["id"]
        controls.append({"control": "canonical definition preferred over earlier observed errorCheck concept",
                         "supported": True, "evidence": preferred_sample})
        legacy = copy.deepcopy(witness)
        canonical = next(b for s in legacy["projectedModel"]["sections"] for b in s["blocks"]
                         if b["id"] == sample["targetPlacement"]["blockId"])
        canonical["semantic"]["activity"] = "explainActivity"
        fallback = reference_labels(legacy, document, exchange)
        fallback_sample = next(s for s in fallback["samples"] if s["key"] == sample["key"] and s["blockId"] == sample["blockId"])
        assert fallback_sample["targetResolution"] == "legacy-first-placed-concept"
        assert fallback_sample["targetPlacement"]["blockId"] == canonical["id"]
        controls.append({"control": "legacy no concepts-activity target retains placed semantic fallback",
                         "supported": True, "evidence": fallback_sample})
    return {"key": folder.name, "variant": variant, "controlsPassed": True,
            "productAccepted": False, "pdfSha256": witness["pdfSha256"],
            "witnessSha256": hashlib.sha256(witness_file.read_bytes()).hexdigest(),
            "baseline": baseline, "mathEvidence": math_evidence, "controls": controls}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--only", default="초3-1,중2-1")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--answers-only", action="store_true", help="Historical problem-reference scope only; never complete index acceptance")
    parser.add_argument("--frozen-qa-controls", action="store_true", help="Narrow real-evidence controls with known target defects preserved")
    parser.add_argument("--math-label-controls", action="store_true", help="Frozen math labels and in-memory DOM/PDF sensitivity controls only")
    args = parser.parse_args()
    if args.math_label_controls:
        units = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(MathLabelControls))
        assert units.wasSuccessful(), "Focused math-label unit controls failed"
        result = [check_math_label_controls(args.directory / key, variant)
                  for key in args.only.split(",") for variant in ("student", "answers")]
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps({"labelOnlyEvidence": True, "unitTests": units.testsRun, "pairs": result},
                                         ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"labelOnlyEvidence": True, "unitTests": units.testsRun,
                          "actualMathLabels": sum(len(r["mathEvidence"]) for r in result),
                          "rejectedControls": sum(len(r["controls"]) for r in result)}))
        return
    if args.frozen_qa_controls:
        result = [check_frozen_controls(args.directory / key, variant)
                  for key in args.only.split(",") for variant in ("student", "answers")]
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"controlsPassed": True, "productAccepted": False,
                          "knownTargetIssues": sum(len(r["baseline"]["issues"]) for r in result),
                          "controls": sum(len(r["controls"]) for r in result)}))
        return
    result = [check(args.directory / key, args.answers_only) for key in args.only.split(",")]
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"passed": True, "actualReferences": sum(r["actualBaselineReferences"] for r in result),
                      "rejectedMutations": sum(len(r["mutations"]) + sum(len(i["mutations"]) for i in r["indexes"]) for r in result),
                      "actualIndexReferences": sum(i["actualReferences"] for r in result for i in r["indexes"])}))


if __name__ == "__main__":
    main()
