"""Negative reference checks on actual frozen local-bank exports, without changing them."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import pymupdf as fitz

from verify_exports import answer_references
from page_references import reference_labels, reference_phase_evidence, INDEX_ACTIVITIES


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--only", default="초3-1,중2-1")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--answers-only", action="store_true", help="Historical problem-reference scope only; never complete index acceptance")
    args = parser.parse_args()
    result = [check(args.directory / key, args.answers_only) for key in args.only.split(",")]
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"passed": True, "actualReferences": sum(r["actualBaselineReferences"] for r in result),
                      "rejectedMutations": sum(len(r["mutations"]) + sum(len(i["mutations"]) for i in r["indexes"]) for r in result),
                      "actualIndexReferences": sum(i["actualReferences"] for r in result for i in r["indexes"])}))


if __name__ == "__main__":
    main()
