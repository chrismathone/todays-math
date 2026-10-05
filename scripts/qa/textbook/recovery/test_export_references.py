"""Negative reference checks on actual frozen local-bank exports, without changing them."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import pymupdf as fitz

from verify_exports import answer_references


def check(folder):
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
    return {"key": folder.name, "actualBaselineReferences": baseline["referencesChecked"],
            "mutations": results, "passed": True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--only", default="초3-1,중2-1")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = [check(args.directory / key) for key in args.only.split(",")]
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"passed": True, "actualReferences": sum(r["actualBaselineReferences"] for r in result),
                      "rejectedMutations": sum(len(r["mutations"]) for r in result)}))


if __name__ == "__main__":
    main()
