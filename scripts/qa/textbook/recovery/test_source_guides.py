"""Actual-export negative controls for source guides, populations and painted answer panels."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path

from source_guides import verify_source_guides


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--witness", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    witness = json.loads(args.witness.read_text(encoding="utf-8"))
    baseline = verify_source_guides(args.pdf, witness)
    assert baseline["status"] == "passed", baseline["issues"]
    at = next(i for i, p in enumerate(witness["pages"])
              if p["sourceGuideBands"] and p["sourceQuestionRegions"])
    panel_at = next(i for i, r in enumerate(witness["pages"][at]["sourceQuestionRegions"])
                    if r["role"] == "answer-panel")
    records = []

    def check(name, changed, expected):
        result = verify_source_guides(args.pdf, changed)
        codes = sorted(set(i["code"] for i in result["issues"]))
        assert result["status"] == "failed" and expected in codes, (name, result)
        records.append({"name": name, "expectedCode": expected, "actualCodes": codes})

    changed = copy.deepcopy(witness)
    changed["pages"][at]["sourceGuideBands"] = []
    changed["pages"][at]["accounting"]["sourceGuideCandidates"] = 0
    check("missing-guide-with-forged-candidate-count", changed, "SOURCE_GUIDE_OWNER_POPULATION")

    changed = copy.deepcopy(witness)
    regions = changed["pages"][at]["sourceQuestionRegions"]
    del regions[next(i for i, r in enumerate(regions) if r["role"] == "container")]
    changed["pages"][at]["accounting"]["sourceQuestionCandidates"] -= 1
    check("missing-question-container-with-forged-candidate-count", changed, "SOURCE_GUIDE_QUESTION_POPULATION")

    changed = copy.deepcopy(witness)
    del changed["pages"][at]["sourceQuestionRegions"][panel_at]
    changed["pages"][at]["accounting"]["sourceAnswerCandidates"] -= 1
    check("missing-panel-with-forged-candidate-count", changed, "SOURCE_GUIDE_ANSWER_PANEL_POPULATION")

    changed = copy.deepcopy(witness)
    box = changed["pages"][at]["sourceQuestionRegions"][panel_at]["boxMm"]
    band = changed["pages"][at]["sourceGuideBands"][0]["boxMm"]
    band[1], band[3] = box[3] - 1, box[3] + 7
    check("guide-intrudes-actual-painted-answer-panel", changed, "SOURCE_ANSWER_GUIDE_INTRUSION")

    changed = copy.deepcopy(witness)
    box = changed["pages"][at]["sourceQuestionRegions"][panel_at]["boxMm"]
    box[1], box[3] = box[1] - 2, box[3] - 2
    check("panel-geometry-does-not-match-actual-pdf-paint", changed, "SOURCE_GUIDE_ANSWER_BACKGROUND_PAINT")

    changed = copy.deepcopy(witness)
    changed["pages"][at]["sourceQuestionRegions"].append(copy.deepcopy(changed["pages"][at]["sourceQuestionRegions"][panel_at]))
    changed["pages"][at]["accounting"]["sourceAnswerCandidates"] += 1
    check("duplicate-panel-region", changed, "SOURCE_GUIDE_DUPLICATE_REGION")

    changed = copy.deepcopy(witness)
    changed["pdfSha256"] = "0" * 64
    check("witness-hash-unbound-from-pdf", changed, "SOURCE_GUIDE_PDF_HASH")

    changed = copy.deepcopy(witness)
    del changed["pages"][at]
    check("missing-actual-pdf-page", changed, "SOURCE_GUIDE_PAGE_COVERAGE")

    changed = copy.deepcopy(witness)
    for page in changed["pages"]:
        page["sourceGuideBands"], page["sourceQuestionRegions"] = [], []
        page["sourceGuideOwnerIds"], page["expectedSourceQuestionIds"] = [], []
        for key in ("sourceGuideCandidates", "sourceQuestionCandidates", "sourceAnswerCandidates"):
            page["accounting"][key] = 0
    check("empty-source-populations-with-forged-local-accounting", changed, "SOURCE_GUIDE_NONEMPTY_REQUIRED")

    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    args.output.write_text(json.dumps({"status": "passed", "pdfSha256": sha(args.pdf),
        "witnessSha256": sha(args.witness), "baselineChecked": baseline["checked"],
        "negativeControlCount": len(records), "negativeControls": records}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "negativeControlCount": len(records)}))


if __name__ == "__main__":
    main()
