"""Diagnostic routing of complete official queues for literal opening enrichment."""
import argparse
import collections
import re
from pathlib import Path
from unittest.mock import patch

import claude_adapter as a
import verifier as v


class LiteralOpeningSupported(Exception):
    pass


def route(row, source):
    _, probe = a.checked_probe(row, source)
    index = a.probe_segments(probe)
    selected = v.select_segments(index, row["probeEvidence"]["segmentIds"], allow_uncertain=True)
    text = " ".join(s["text"] for s in selected)
    spoken, rest = a.leading_cue(text)
    ambiguous = not spoken or any(v.uncertain(s) for s in selected)
    require_instruction = ambiguous
    kind = row.get("kind")
    needed = ambiguous
    reason = "ambiguous_or_bare_native_cue" if ambiguous else None
    if kind == "shared_instruction_member":
        member_needs = bool(row.get("dialogueProbeEvidence") and row.get("scriptEvidence")) or not any(re.search(r"[A-Za-z]{3}", s["text"]) for s in selected)
        if member_needs:
            needed, reason = True, reason or "member_first_dialogue_required"
    else:
        question = next(q for q in source["questions"] if q["id"] == row["questionId"])
        if kind == "single":
            instruction = a.own_instruction(question)
            if not instruction and (row.get("officialInstruction") or {}).get("source") == "official_transcript_section_head":
                instruction = a.instruction_head_from_transcript(source, question, row["officialInstruction"])
        elif kind == "shared_passage":
            instruction = next((q["instruction"] for q in source["questions"] if q["sourceNumber"] in row["scopeQuestionNumbers"] and q.get("instruction")), "")
        elif kind == "shared_instruction_head":
            next_question = next((q for q in source["questions"] if spoken and q["sourceNumber"] == spoken[-1]), {})
            instruction = question.get("instruction") or (next_question.get("instruction", "") if not a.own_instruction(question) else "")
        else:
            raise v.InvalidEvidence("unknown_original_question_kind")
        if (instruction or kind != "single") and (len(a.compact(instruction)) < 12 or a.coverage(instruction, rest) < .8):
            needed, require_instruction, reason = True, True, reason or "instruction_and_first_dialogue_required"
    if not needed:
        return {"requiresLiteralOpening": False, "status": "not_requested_by_alignment_rules"}
    # Stop before the separate native dialogue probe is read. This only replays
    # literal original-section/first-opening checks, never actual admission.
    with patch.object(a, "checked_probe", side_effect=LiteralOpeningSupported):
        try:
            a.first_dialogue_alignment(row, source, probe, None, require_instruction=require_instruction)
        except LiteralOpeningSupported:
            return {"requiresLiteralOpening": True, "status": "literal_opening_supported_native_replay_required", "routingReason": reason}
        except v.InvalidEvidence as e:
            return {"requiresLiteralOpening": True, "status": "held", "routingReason": reason, "reason": str(e)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "marks", "output"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--previous-required")
    args = parser.parse_args()
    refs = {"inventory": v.reference(args.inventory), "marks": v.reference(args.marks)}
    implementation = [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    inventory, queue = v.checked_ref(refs["inventory"]), v.checked_ref(refs["marks"])
    v.require(queue["inventorySha256"] == refs["inventory"]["sha256"] and queue["provider"] == "claude", "wrong_official_queue")
    sources = {s["sourceRecordId"]: s for s in inventory["records"] if not s["reconstructed"]}
    records = []
    for row in queue["records"]:
        if row["status"] != "candidate":
            continue
        record = {"sourceRecordId": row["sourceRecordId"], "questionId": row["questionId"], "sourceNumber": row["sourceNumber"]}
        try:
            source = sources[row["sourceRecordId"]]
            question = next(q for q in source["questions"] if q["id"] == row["questionId"])
            v.validate_identity(row, source, question)
            record.update(route(row, source))
        except (v.InvalidEvidence, OSError, ValueError, KeyError, TypeError) as e:
            record.update(status="held", reason=str(e))
        records.append(record)
    missing = [r["questionId"] for r in records if r.get("requiresLiteralOpening") and r["status"] == "held"]
    previous = set()
    if args.previous_required:
        refs["previousRequired"] = v.reference(args.previous_required)
        previous = set(v.checked_ref(refs["previousRequired"])["questionIds"])
    for ref in list(refs.values()) + implementation:
        v.require(v.sha(ref["path"]) == ref["sha256"], "english_routing_input_or_implementation_changed")
    report = {"schemaVersion": 1, "diagnosticOnly": True, "productionApplicationAuthorized": False,
              "inputs": refs, "implementation": implementation, "records": records, "questionIds": missing,
              "additionalQuestionIds": [qid for qid in missing if qid not in previous],
              "counts": {"candidates": len(records), "status": dict(collections.Counter(r["status"] for r in records)),
                         "requiresLiteralOpening": sum(r.get("requiresLiteralOpening", False) for r in records),
                         "missingLiteralOpening": len(missing), "additionalBeyondPrevious": len(set(missing) - previous),
                         "heldReasons": dict(collections.Counter(r.get("reason") for r in records if r["status"] == "held"))}}
    v.immutable_write(args.output, report)
    print(report["counts"])


if __name__ == "__main__":
    main()
