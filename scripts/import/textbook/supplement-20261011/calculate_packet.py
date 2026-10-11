"""Build a source- and content-bound calculation packet; never synthesize review logs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import re
import sympy as s
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application

from calculations import calculations
from build_candidates import jsonl
from inventory import new_output, sha256, write_json

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "review"))
from collect import fold  # noqa: E402


def answers_equal(calculated: str, publisher: str) -> bool:
    if fold(calculated) == fold(publisher):
        return True
    # Equivalent polynomial ordering (1-3x versus -3x+1) needs algebra, while
    # subpart labels, alternative count/order and full equation LHS stay exact.
    if fold(re.sub(r"\$[^$]*\$", "", calculated)) != fold(re.sub(r"\$[^$]*\$", "", publisher)):
        return False
    left, right = re.findall(r"\$([^$]*)\$", calculated), re.findall(r"\$([^$]*)\$", publisher)
    if len(left) != len(right):
        return False
    for first, second in zip(left, right):
        if first.count("=") != second.count("="):
            return False
        if "=" in first:
            head1, first = first.split("=", 1)
            head2, second = second.split("=", 1)
            if fold(head1) != fold(head2):
                return False
        values = []
        for expression in (first, second):
            expression = re.sub(r"\\frac\{(-?\d+)\}\{(\d+)\}", r"(\1)/(\2)", expression)
            expression = re.sub(r"\^\{(\d+)\}", r"**\1", expression)
            if not re.fullmatch(r"[\dx\s+*/().-]+", expression):
                return False
            values.append(parse_expr(expression, local_dict={"x": s.Symbol("x")},
                transformations=standard_transformations+(implicit_multiplication_application,)))
        if s.simplify(values[0]-values[1]) != 0:
            return False
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepared", type=Path, required=True)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--specs", type=Path, default=Path(__file__).with_name("math-specs.json"))
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    import hashlib
    rows = jsonl(args.prepared)
    specs = json.loads(args.specs.read_text(encoding="utf-8"))
    computed = calculations()
    if {r["id"] for r in rows} != set(computed) or set(specs) != set(computed):
        raise ValueError("calculation packet must contain exactly the 20 pinned source questions")
    snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
    loaded = {r["problem"].get("external_id") for r in snapshot["rows"]}
    units = {r["unit"]["section"]: r["unit"] for r in snapshot["rows"] if r["unit"]["grade"] == "미적분1"}
    output = []
    for row in rows:
        spec = specs[row["id"]]
        if hashlib.sha256(row["content"].encode("utf-8")).hexdigest() != spec["contentSha256"]:
            raise ValueError(f"question changed; re-transcribe calculation inputs: {row['id']}")
        if row["id"] in loaded or row["bad"] or row["solutionFigure"]:
            raise ValueError(f"candidate is already loaded or has preparation defects: {row['id']}")
        proof = computed[row["id"]]
        if not answers_equal(proof["calculatedAnswer"], row["answer"]):
            raise ValueError(f"calculated answer disagrees with publisher-derived answer: {row['id']}: {proof['calculatedAnswer']} / {row['answer']}")
        output.append({**row, "unit": units[spec["unitSection"]],
            "problemType": spec["type"], "difficulty": spec["level"], "questionType": "단답형",
            "classificationRationale": spec["rationale"],
            "calculation": {**proof, "contentSha256": spec["contentSha256"],
                "method": "deterministic_recalculation_after_source_acquisition_not_blind_review",
                "publisherAnswerMatches": True},
            "directUseAllowed": False, "humanReviewLogs": [], "reviewStatus": "pending",
            "remainingGates": ["blind review", "final page review", "fresh loaded-ID exclusion at coordinator load"]})
    new_output(args.out)
    write_json(args.out / "calculated-candidates.json", {
        "schemaVersion": 1, "preparedSha256": sha256(args.prepared), "specsSha256": sha256(args.specs),
        "snapshotSha256": sha256(args.snapshot), "snapshotCapturedAt": snapshot["capturedAt"],
        "entries": output, "count": len(output), "calculatedMatches": len(output),
        "blindReviewCompleted": False, "humanReviewApprovals": 0, "databaseWrites": 0,
    })
    print(json.dumps({"calculatedMatches": len(output), "blindReviewCompleted": False}))


if __name__ == "__main__":
    main()
