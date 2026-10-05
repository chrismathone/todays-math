"""Replay one real proposal for producer diagnostics; never an admission certificate."""
import argparse
from pathlib import Path

import claude_adapter as a
import verifier as v


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "clock", "frozen", "marks", "source-record-id", "question-id", "output"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    inventory = v.read(args.inventory)
    sources = [s for s in inventory["records"] if s["sourceRecordId"] == args.source_record_id]
    v.require(len(sources) == 1, "unknown_or_duplicate_source")
    source = sources[0]
    questions = [q for q in source["questions"] if q["id"] == args.question_id]
    v.require(len(questions) == 1, "unknown_or_duplicate_current_question")
    question = questions[0]
    marks = v.read(args.marks)
    v.require(marks.get("provider") == source["assignedAgent"] and marks.get("schemaVersion") == marks.get("evidenceContractVersion") == 1 and marks.get("inventorySha256") == v.sha(args.inventory), "queue_contract_or_inventory_mismatch")
    rows = [r for r in marks["records"] if r["sourceRecordId"] == args.source_record_id and r["questionId"] == args.question_id]
    v.require(len(rows) == 1, "unknown_or_duplicate_proposal")
    row = rows[0]
    v.validate_identity(row, source, question)
    v.require(row["status"] == "candidate" and question.get("audioRange") is None, "diagnostic_requires_new_candidate")
    frozen = [s for s in v.read(args.frozen)["records"] if s["sourceRecordId"] == args.source_record_id]
    v.require(len(frozen) == 1, "unknown_or_duplicate_frozen_source")
    v.validate_frozen_source(source, frozen[0])
    clocks = v.read(args.clock)
    v.require(clocks.get("inventorySha256") == v.sha(args.inventory), "clock_wrong_inventory")
    matches = [c for c in clocks["records"] if c["sourceRecordId"] == args.source_record_id]
    v.require(len(matches) == 1, "unknown_or_duplicate_source_clock")
    clock = matches[0]
    asr = v.read(source["asrPath"])
    index = v.index_segments(asr, v.validate_clock(clock, source, asr))
    replay = a.SourceReplay(inventory["root"], source, clock, [row])
    trusted = {}
    v.verified_ancestor_rows(inventory, clocks, v.checked_ref({"path": inventory["liveSnapshotPath"],
                            "sha256": inventory["liveSnapshotSha256"]})["snapshots"], trusted)
    replay.trusted_boundaries = {qid: evidence for (sid, qid), evidence in trusted.items() if sid == source["sourceRecordId"]}
    proof = {"schemaVersion": 1, "diagnosticOnly": True, "admissionRequiresCompleteQueueOrderAndPreservation": True,
             "writesDatabase": False, "writesStorage": False, "writesMedia": False, "humanReviewed": False,
             "sourceRecordId": source["sourceRecordId"], "questionId": question["id"], "sourceNumber": question["sourceNumber"],
             "inputs": {k: v.reference(getattr(args, k)) for k in ("inventory", "clock", "frozen", "marks")},
             "implementation": [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]}
    try:
        if row.get("evidenceAdapter") == "native-localized-generation-v2":
            from localized_adapter import validate
            key, segments, grade, identity = validate(row, source, question, clock, replay, index)
        elif row.get("evidenceAdapter") == "official-catalogued-native-v1":
            from official_catalog_adapter import validate
            key, segments, grade, identity = validate(row, source, question, clock, replay, index)
        else:
            key, segments, grade, identity = a.validate(row, source, question, clock, replay, index)
            v.validate_mapping(row, source, question, index)
        v.require(0 <= row["seekStartMs"] < source["audio"]["durationMs"] and row.get("seekEndMs", source["audio"]["durationMs"]) == source["audio"]["durationMs"], "invalid_full_original_continuation")
        proof.update(startProofStatus="passed", reasons=[], proofKey=key, rawNativeSegments=segments, evidenceGrade=grade,
                     originalQuestionIdentity=identity, scopeQuestionNumbers=row["scopeQuestionNumbers"], cueNumber=row["cueNumber"],
                     proposedRange={"startMs": row["seekStartMs"], "endMs": source["audio"]["durationMs"]})
    except (v.InvalidEvidence, KeyError, TypeError, ValueError, OSError) as error:
        proof.update(startProofStatus="held", reasons=[str(error)])
    for ref in list(proof["inputs"].values()) + proof["implementation"]:
        v.require(v.sha(ref["path"]) == ref["sha256"], "diagnostic_input_or_implementation_changed_during_run")
    v.immutable_write(args.output, proof)
    print({"startProofStatus": proof["startProofStatus"], "reasons": proof["reasons"], "diagnosticOnly": True})


if __name__ == "__main__":
    main()
