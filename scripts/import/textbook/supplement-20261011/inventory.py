"""Turn retained reports into observations, without inventing missing source IDs."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

REPO = Path(__file__).resolve().parents[4]
REPORTS = REPO / "docs/planning/tracks/reports/textbook-import-20261007"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def new_output(path: Path) -> None:
    if path.exists() and any(path.iterdir()):
        raise ValueError(f"refusing to overwrite previous outputs: {path}")
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_numbers(value: str) -> list[tuple[int | None, int]]:
    result = []
    for chunk in value.split(" / "):
        match = re.fullmatch(r"(?:(\d+)묶음 )?(\d+(?:, \d+)*)", chunk.strip())
        if not match:
            raise ValueError(f"unrecognized report numbering: {value}")
        section = int(match[1]) - 1 if match[1] else None
        if section is not None and section < 0:
            raise ValueError(f"invalid report section: {value}")
        result.extend((section, int(number)) for number in match[2].split(", "))
    return result


def report_observations(path: Path, category: str) -> list[dict]:
    rows = []
    grade = book = None
    in_listing = category == "unmapped"
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if category == "review_skipped" and line.startswith("## "):
            in_listing = line.startswith("## 2.")
        if not in_listing:
            continue
        heading = re.match(r"^### (.*?) · (.*?) — ", line)
        if heading:
            grade, book = heading.groups()
        match = re.fullmatch(r"\| `([^`]+)` \| ([^|]+) \| ([^|]+) \|", line)
        if not match or grade is None:
            continue
        basename, reason, numbering = match.groups()
        for section, number in parse_numbers(numbering.strip()):
            rows.append({
                "category": category, "grade": grade, "book": book,
                "basename": basename, "section": section, "number": number,
                "reason": reason.strip(), "sourceLine": line_no,
                "externalId": None, "sourcePath": None,
                "identityStatus": "report_omits_path_and_key" if section is not None
                                  else "report_omits_path_key_and_single_section_number",
            })
    return rows


def build_inventory(reports: Path = REPORTS) -> tuple[dict, list[dict]]:
    unmapped = report_observations(reports / "unmapped.md", "unmapped")
    skipped = report_observations(reports / "not-loaded.md", "review_skipped")
    counters = {name: dict(Counter(row["reason"] for row in rows))
                for name, rows in (("unmapped", unmapped), ("reviewSkipped", skipped))}
    # These are retained report claims, not a fresh DB census. In particular,
    # the summary subtraction does not reconcile with its recorded loaded count.
    summary = {
        "schemaVersion": 1, "basis": "retained_reports_2026-10-08",
        "currentDatabaseCensus": False,
        "reports": [{"path": str(path.relative_to(REPO)) if path.is_relative_to(REPO) else str(path),
                     "sha256": sha256(path)}
                    for path in (reports / "unmapped.md", reports / "not-loaded.md")],
        "observations": {"unmapped": len(unmapped), "reviewSkipped": len(skipped)},
        "byReason": counters,
        "unresolvedExternalIds": len(unmapped) + len(skipped),
        "omittedSectionObservations": sum(row["section"] is None for row in unmapped + skipped),
        "reportedAggregatesWithoutIdentities": {
            "deferred": 677, "renderFailed": 90, "textbookBodyChunks": 2605,
            "deferredByReason": {"그림": 56, "한글 도형": 246, "자료 표": 12,
                                 "그림을 가리키는 말": 98, "붙은 문항": 132,
                                 "본문이 너무 길다": 2, "답이 «풀이 참조»": 131},
        },
        "excludedAlreadyLoadedHeld": {"reported": 475, "laterRecoveryReport":
            "docs/planning/tracks/reports/textbook-recovery-applied-20261009/result.txt"},
        "blockers": [
            {"code": "EXTRACTION_BASELINE_MISSING", "required":
             ["extract6/problems.jsonl", "extract6/files.jsonl", "manifest*.jsonl", "triage.json"],
             "action": "Restore the old import workspace, or acquire originals with verified legacy paths."},
            {"code": "DEFERRED_AND_RENDER_FAILURE_IDS_MISSING", "reportedCount": 767,
             "required": ["figures8/meta.jsonl", "prepared*/prepared.jsonl", "load/plan.json"],
             "action": "Reconstruct row-level reasons before claiming these aggregates are recoverable identities."},
            {"code": "RETAINED_SUMMARY_DOES_NOT_RECONCILE", "reportedLoaded": 12281,
             "subtraction": "13771 - 677 - 90 - 997", "subtractionResult": 12007,
             "difference": 274, "action": "Use a single extraction/prepared/plan snapshot to resolve scope or overlap."},
        ],
        "loadReadyCandidates": 0,
    }
    if len(unmapped) != 6528 or len(skipped) != 997:
        summary["blockers"].append({"code": "REPORT_COUNTS_CHANGED_OR_INCOMPLETE_PARSE",
                                    "expected": {"unmapped": 6528, "reviewSkipped": 997}})
    return summary, unmapped + skipped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reports", type=Path, default=REPORTS)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    summary, rows = build_inventory(args.reports)
    new_output(args.out)
    write_json(args.out / "inventory.json", summary)
    with (args.out / "report-observations.jsonl").open("w", encoding="utf-8") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(json.dumps(summary["observations"]))


if __name__ == "__main__":
    main()
