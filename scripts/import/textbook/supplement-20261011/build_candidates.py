"""Compare two extractions against source bytes and a captured loaded-ID census.

This produces preparation candidates and blockers, never review approvals or DB writes.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path, PureWindowsPath
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from prepare import ANSWER_SOURCES, eligible, external_id  # noqa: E402
from source_input import conversion_input  # noqa: E402
from inventory import new_output, report_observations, sha256, write_json  # noqa: E402


def jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def digest(row: dict) -> str:
    return hashlib.sha256(json.dumps(row, ensure_ascii=False, sort_keys=True,
                                    separators=(",", ":")).encode("utf-8")).hexdigest()


def write_rows(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")


def compare(baseline: list[dict], recovered: list[dict], loaded: set[str], sources: dict,
            decor: set[str] | None = None) -> tuple[list[dict], list[dict]]:
    decor = decor or set()
    before_ids = [external_id(row) for row in baseline]
    after_ids = [external_id(row) for row in recovered]
    if before_ids != after_ids or len(set(before_ids)) != len(before_ids):
        raise ValueError("extraction identity/order changed or duplicate IDs appeared; reconcile with source first")
    candidates, changes = [], []
    for before, after in zip(baseline, recovered):
        rid = external_id(after)
        immutable_before = {k: v for k, v in before.items() if k not in ("answer", "answerFrom")}
        immutable_after = {k: v for k, v in after.items() if k not in ("answer", "answerFrom")}
        if immutable_before != immutable_after:
            raise ValueError(f"content, solution or provenance changed: {rid}")
        if before["answer"] == after["answer"] and before["answerFrom"] == after["answerFrom"]:
            continue
        evidence = sources.get(after["path"])
        if evidence is None or evidence["key"] != after["key"]:
            raise ValueError(f"missing source-byte identity evidence: {rid}")
        if before.get("answer") and not after.get("answer"):
            status = "regressed_answer_requires_investigation"
        elif rid in loaded:
            status = "already_loaded_excluded_preserve_human_edits"
        elif before.get("answer"):
            status = "existing_answer_changed_requires_review"
        elif after.get("answerFrom") not in ANSWER_SOURCES or not after.get("answer"):
            status = "answer_still_unmapped"
        else:
            reason = eligible(after, decor=rid in decor)
            status = "ready_for_preparation" if reason is None else "answer_recovered_preparation_blocked"
            if reason is None:
                candidates.append(after)
        changes.append({"id": rid, "sourcePath": after["path"], "section": after["section"],
                        "number": after["number"], "status": status,
                        "beforeAnswer": before["answer"], "afterAnswer": after["answer"],
                        "answerFrom": after["answerFrom"], "preparationBlocker": eligible(after, decor=rid in decor),
                        "figureRoute": "text" if rid in decor else None,
                        "beforeRowSha256": digest(before), "afterRowSha256": digest(after),
                        "sourceSha256": evidence["sha256"], "archiveMember": evidence["archiveMember"],
                        "reviewApproved": False, "directUseAllowed": False})
    return candidates, changes


def scope_audit(observations: list[dict], rows: list[dict], loaded: set[str]) -> list[dict]:
    lookup = defaultdict(list)
    books = {(row["grade"], row["book"]) for row in rows}
    for row in rows:
        lookup[(row["grade"], row["book"], PureWindowsPath(row["path"]).name, row["number"])].append(row)
    result = []
    for observation in observations:
        if (observation["grade"], observation["book"]) not in books:
            continue
        found = lookup[(observation["grade"], observation["book"], observation["basename"], observation["number"])]
        if observation["section"] is not None:
            found = [row for row in found if row["section"] == observation["section"]]
        audit = dict(observation, matches=[external_id(row) for row in found])
        if len(found) != 1:
            audit["status"] = "source_identity_ambiguous" if found else "not_found_in_reacquired_extraction"
        else:
            row = found[0]
            audit.update(externalId=external_id(row), sourcePath=row["path"], section=row["section"],
                         identityStatus="verified_reacquired_source", answerFrom=row["answerFrom"])
            if external_id(row) in loaded:
                audit["status"] = "already_loaded_excluded"
            else:
                audit["status"] = "answered_unimported" if row.get("answer") else "still_unmapped"
        result.append(audit)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--recovered", type=Path, required=True)
    parser.add_argument("--staged", type=Path, required=True)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--reports", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--figures", type=Path, help="Generated figures.py meta.jsonl; only text routes permit decoration")
    args = parser.parse_args()
    baseline = jsonl(args.baseline / "problems.jsonl")
    recovered = jsonl(args.recovered / "problems.jsonl")
    snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
    loaded = {row["problem"]["external_id"] for row in snapshot["rows"] if row["problem"].get("external_id")}
    staged = json.loads((args.staged / "triage.json").read_text(encoding="utf-8"))
    for row in staged:
        conversion_input(row)  # Verify exact legacy key and actual staged bytes.
    sources = {row["path"]: row for row in staged}
    metas = {row["id"]: row for row in jsonl(args.figures)} if args.figures else {}
    decor = {rid for rid, meta in metas.items() if meta["route"] == "text"}
    candidates, changes = compare(baseline, recovered, loaded, sources, decor)
    for change in changes:
        meta = metas.get(change["id"])
        if meta:
            change["figureRoute"] = meta["route"]
            change["figureEvidence"] = meta
            if change["status"] == "answer_recovered_preparation_blocked":
                change["preparationBlocker"] = {"table": "자료 표", "group": "한글 도형",
                    "figure": "그림"}.get(meta["route"], change["preparationBlocker"])
    observations = report_observations(args.reports / "unmapped.md", "unmapped")
    observations += report_observations(args.reports / "not-loaded.md", "review_skipped")
    audit = scope_audit(observations, recovered, loaded)
    new_output(args.out)
    write_rows(args.out / "problems.jsonl", candidates)
    write_rows(args.out / "answer-changes.jsonl", changes)
    write_rows(args.out / "scope-audit.jsonl", audit)
    summary = {
        "schemaVersion": 1, "sourceManifest": json.loads((args.staged / "source-manifest.json").read_text(encoding="utf-8")),
        "baselineSha256": sha256(args.baseline / "problems.jsonl"),
        "recoveredSha256": sha256(args.recovered / "problems.jsonl"), "snapshotSha256": sha256(args.snapshot),
        "extractedRows": len(recovered), "questionRows": sum(row.get("isQuestion", False) for row in recovered),
        "baselineAnsweredQuestions": sum(bool(row.get("answer")) for row in baseline if row.get("isQuestion")),
        "recoveredAnsweredQuestions": sum(bool(row.get("answer")) for row in recovered if row.get("isQuestion")),
        "identityAndOrderPreserved": True, "contentAndSolutionsPreserved": True,
        "changes": dict(Counter(row["status"] for row in changes)), "preparationCandidates": len(candidates),
        "reportObservationsInAcquiredBook": len(audit), "scopeStatus": dict(Counter(row["status"] for row in audit)),
        "unimportedIdentityCountInAcquiredBook": len({row["externalId"] for row in audit if row["externalId"] and row["status"] != "already_loaded_excluded"}),
        "loadReadyCandidates": 0, "databaseWrites": 0, "reviewApprovals": 0,
        "figureMetaSha256": sha256(args.figures) if args.figures else None,
        "remaining": ["Prepare and check renderer output", "Blind solve and compare against publisher solution",
                      "Final page review with content/figure digest", "Coordinator refreshes loaded-ID census before loading"],
    }
    write_json(args.out / "summary.json", summary)
    print(json.dumps({"preparationCandidates": len(candidates), "changes": summary["changes"],
                      "scopeStatus": summary["scopeStatus"]}, ensure_ascii=True))


if __name__ == "__main__":
    main()
