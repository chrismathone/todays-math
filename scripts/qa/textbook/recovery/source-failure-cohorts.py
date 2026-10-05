"""Map actual source PDF/DOM failures to immutable source kinds and rendered block IDs."""
import argparse
import collections
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    root = args.directory
    witness = json.loads((root / "new-u01-semantic-student-witness.json").read_text(encoding="utf-8"))
    geometry = json.loads((root / "new-u01-semantic-student-geometry.json").read_text(encoding="utf-8"))
    assert hashlib.sha256((root / "new-u01-semantic-student.pdf").read_bytes()).hexdigest() == witness["pdfSha256"]
    sections = {section["sectionKey"]: section for section in witness["projectedModel"]["sections"]}
    pages = {page["physicalPageIndex"]: page for page in witness["pages"]}
    cohorts = {}
    mapped = []
    for issue in geometry["issues"]:
        page = pages.get(issue.get("page"))
        if not page:
            mapped.append({**issue, "scope": "whole-witness"})
            continue
        section = sections[page["sectionKey"]]
        source_kinds = {block.get("semantic", {}).get("source", {}).get("kind") for block in section["blocks"]}
        source_kinds.discard(None)
        assert len(source_kinds) == 1, (page["sourcePage"], source_kinds)
        kind = next(iter(source_kinds))
        questions = [block for block in section["blocks"] if block["kind"] == "problem"]
        item = None
        if issue.get("nodeId", "").startswith((".q:", ".qhead:", ".qid:", ".prompt:", ".work:")):
            ordinal = int(issue["nodeId"].split(":")[-1])
            if ordinal < len(questions):
                item = {"renderBlockId": questions[ordinal]["id"], "itemId": questions[ordinal]["itemId"]}
        record = {**issue, "sourcePage": page["sourcePage"], "sourceKind": kind,
                  "sectionKey": section["sectionKey"], "sectionBlockIds": [block["id"] for block in section["blocks"]],
                  **(item or {})}
        mapped.append(record)
        cohort = cohorts.setdefault(kind, {"sourceKind": kind, "issueCodes": collections.Counter(),
                                          "sourcePages": collections.Counter(), "firstIssue": record,
                                          "firstCoordinateIssue": None})
        cohort["issueCodes"][issue["code"]] += 1
        cohort["sourcePages"][str(page["sourcePage"])] += 1
        if issue["code"] == "ANCHOR_COORDINATE" and cohort["firstCoordinateIssue"] is None:
            cohort["firstCoordinateIssue"] = record
    result = {"pdfSha256": witness["pdfSha256"], "sourceGeometrySha256": witness["sourceGeometrySha256"],
              "coverage": witness["coverage"], "issueCount": len(geometry["issues"]),
              "codes": collections.Counter(issue["code"] for issue in geometry["issues"]),
              "cohorts": list(cohorts.values()), "mappedIssues": mapped,
              "limits": ["Question ordinals are diagnostic joins to the actual rendered problem order; native question/head/work populations remain checked separately.",
                         "Missing anchors require stored-DOM inspection before assigning adapter loss or renderer loss."]}
    target = root / "source-failure-cohorts.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(target), "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                      "cohorts": [{key: value for key, value in cohort.items() if key != "firstIssue"}
                                  for cohort in result["cohorts"]]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
