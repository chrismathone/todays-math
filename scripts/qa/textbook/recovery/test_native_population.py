"""Real-export negative controls for exact-once native writing population proof."""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

from native_population import ORACLE_SHA, sha, verify_population


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--witness", type=Path, required=True)
    parser.add_argument("--oracle", type=Path, required=True)
    parser.add_argument("--original-pdf", type=Path, required=True)
    parser.add_argument("--source-pages")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    assert sha(args.oracle) == ORACLE_SHA
    witness = json.loads(args.witness.read_text(encoding="utf-8"))
    oracle = json.loads(args.oracle.read_text(encoding="utf-8"))
    selected = [int(p) for p in args.source_pages.split(",")] if args.source_pages else None
    baseline = verify_population(args.pdf, witness, oracle, args.original_pdf, selected)
    assert baseline["status"] == "passed", baseline["issues"]
    page_index = next(i for i, page in enumerate(witness["pages"])
                      if len([w for w in page.get("writeBoxes", []) if w.get("sourceQuestionId")]) >= 2)
    indices = [i for i, writing in enumerate(witness["pages"][page_index]["writeBoxes"])
               if writing.get("sourceQuestionId")]
    evidence = []

    def check(name, changed, expected, changed_oracle=None):
        result = verify_population(args.pdf, changed, changed_oracle or oracle, args.original_pdf, selected)
        codes = sorted(set(i["code"] for i in result["issues"]))
        assert result["status"] == "failed" and expected in codes, (name, result)
        evidence.append({"name": name, "expectedCode": expected, "actualCodes": codes,
                         "checked": result["checked"]})

    missing = copy.deepcopy(witness)
    del missing["pages"][page_index]["writeBoxes"][indices[0]]
    # Keep the old six true coverage flags; even forged candidate counts cannot hide the loss.
    missing["pages"][page_index].setdefault("accounting", {})["writeCandidates"] -= 1
    check("missing-container-with-forged-local-accounting", missing, "NATIVE_POPULATION_MISSING_CONTAINER")

    duplicated = copy.deepcopy(witness)
    duplicate = copy.deepcopy(duplicated["pages"][page_index]["writeBoxes"][indices[0]])
    duplicate["id"] += ".duplicate"
    duplicated["pages"][page_index]["writeBoxes"].append(duplicate)
    duplicated["pages"][page_index]["accounting"]["writeCandidates"] += 1
    check("duplicate-container-with-new-local-id", duplicated, "NATIVE_POPULATION_DUPLICATE_CONTAINER")

    aliased = copy.deepcopy(witness)
    aliased["pages"][page_index]["writeBoxes"][indices[0]]["sourceQuestionId"] = \
        aliased["pages"][page_index]["writeBoxes"][indices[1]]["sourceQuestionId"]
    check("question-id-alias-cannot-substitute-another-container", aliased, "NATIVE_POPULATION_REFERENCE_IDENTITY")

    lines = copy.deepcopy(witness)
    lines["pages"][page_index]["writeBoxes"][indices[0]]["nativeLines"].pop()
    check("missing-actual-dom-line", lines, "NATIVE_POPULATION_VECTOR_COUNT")

    reference = copy.deepcopy(witness)
    del reference["pages"][page_index]["writeBoxes"][indices[0]]["nativeReference"]
    check("missing-bound-original-reference", reference, "NATIVE_POPULATION_REFERENCE_IDENTITY")

    missing_page = copy.deepcopy(witness)
    del missing_page["pages"][page_index]
    check("missing-source-page-with-unmodified-pdf", missing_page, "NATIVE_POPULATION_SOURCE_PAGES")

    duplicated_oracle = copy.deepcopy(oracle)
    source_page = witness["pages"][page_index]["sourcePage"]
    native_page = next(p for p in duplicated_oracle["pages"] if p["physicalPageIndex"] == source_page)
    native_page["nativeQuestionWritingAreas"].append(copy.deepcopy(native_page["nativeQuestionWritingAreas"][0]))
    check("duplicate-oracle-question-id-find-ambiguity", witness,
          "NATIVE_POPULATION_ORACLE_QUESTION_ID_DUPLICATE", duplicated_oracle)

    args.output.write_text(json.dumps({"status": "passed", "pdfSha256": sha(args.pdf),
        "witnessSha256": sha(args.witness), "oracleSha256": sha(args.oracle),
        "originalPdfSha256": sha(args.original_pdf), "baselineChecked": baseline["checked"],
        "negativeControls": evidence, "negativeControlCount": len(evidence)},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "negativeControlsRejected": len(evidence),
                      "baselineChecked": baseline["checked"]}))


if __name__ == "__main__":
    main()
