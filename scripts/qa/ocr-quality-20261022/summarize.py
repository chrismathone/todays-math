"""Summarize existing immutable replay outcomes; never call a model or alter verdicts."""
import collections
import json
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
cohorts = sys.argv[2:]
report = {}
for cohort in cohorts:
    directory = root / cohort
    outcomes = json.loads((directory / "summary.json").read_text())["outcomes"]
    rows = []
    for outcome in outcomes:
        identifier = outcome["id"]
        expectation = json.loads((directory / "expectations" / (identifier + ".json")).read_text())
        parsed_file = directory / "parsed" / (identifier + ".json")
        parsed = json.loads(parsed_file.read_text()) if parsed_file.exists() else None
        pixels = outcome.get("pixels", [])
        total = sum(item["total"] for item in pixels)
        lost = sum(item["lost"] for item in pixels)
        foreign = sum(item["foreign"] for item in pixels)
        rows.append({
            "id": identifier,
            "status": outcome["status"],
            "issues": outcome.get("issues", []),
            "expectedProblems": len(expectation["regions"]) if expectation.get("count") is None else None,
            "actualProblems": len(parsed.get("problems", [])) if parsed and "problems" in parsed else None,
            "requiredInk": total,
            "lostInk": lost,
            "foreignInk": foreign,
            "lostFraction": lost / total if total else None,
            # Post-hoc descriptive bin only. Any lost pixel still fails the frozen checker.
            "lossBin": "major (>1%)" if total and lost / total > .01 else "minor (0..1%]" if lost else "none",
            "observedChoices": len(parsed["ocr"]["choiceGroups"]) if parsed and "ocr" in parsed else None,
            "sourceCountVerifiedByStorage": False if expectation.get("hold") else None,
            "choicesMissing": parsed["ocr"]["choicesMissing"] if parsed and "ocr" in parsed else None,
            "qualityWarningPresent": bool(parsed and any("크롭" in warning for warning in parsed.get("warnings", []))),
        })
    report[cohort] = {
        "counts": dict(collections.Counter(item["status"] for item in rows)),
        "issueCounts": dict(collections.Counter(issue for item in rows for issue in item["issues"])),
        "lossBins": dict(collections.Counter(item["lossBin"] for item in rows if item["requiredInk"])),
        "foreignInkCases": sum(item["foreignInk"] > 0 for item in rows),
        "rows": rows,
    }
print(json.dumps(report, ensure_ascii=False, indent=2))
