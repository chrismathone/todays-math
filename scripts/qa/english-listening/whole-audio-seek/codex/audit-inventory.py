"""Complete deterministic audit of the frozen 193-source/3699-question input queue."""
import argparse
import collections
import verifier as v


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--inventory", required=True)
    p.add_argument("--clock", required=True)
    p.add_argument("--frozen", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    inventory = v.read(args.inventory)
    clocks = {r["sourceRecordId"]: r for r in v.read(args.clock)["records"]}
    frozen = {r["sourceRecordId"]: r for r in v.read(args.frozen)["records"]}
    v.require(v.sha(inventory["liveSnapshotPath"]) == inventory["liveSnapshotSha256"], "frozen_snapshot_changed")
    records = []
    for s in inventory["records"]:
        r = {"sourceRecordId": s["sourceRecordId"], "questions": len(s["questions"]), "provider": s["assignedAgent"], "status": "passed"}
        try:
            for ref in frozen[s["sourceRecordId"]]["files"].values():
                v.require(v.sha(ref["path"]) == ref["sha256"], "frozen_source_input_changed")
            asr = v.read(s["asrPath"])
            duration = v.validate_clock(clocks[s["sourceRecordId"]], s, asr)
            segments = v.index_segments(asr, duration)
            r.update(segments=len(segments), uncertainSegments=sum(v.uncertain(x) for x in segments.values()), originalCues=sum(v.scope_from_text(x["text"]) is not None for x in segments.values()))
        except (v.InvalidEvidence, OSError, KeyError, TypeError, ValueError) as e:
            r.update(status="held", reason=str(e))
        records.append(r)
    v.require(len(records) == 193 and sum(r["questions"] for r in records) == 3699, "inventory_population_mismatch")
    proof = {"schemaVersion": 1, "inputs": {"inventory": v.reference(args.inventory), "clock": v.reference(args.clock), "frozen": v.reference(args.frozen)},
             "counts": {"sources": len(records), "questions": sum(r["questions"] for r in records), "status": dict(collections.Counter(r["status"] for r in records)),
                        "existingStarts": sum(bool(q.get("audioRange")) for s in inventory["records"] for q in s["questions"])},
             "records": records, "writesDatabase": False, "writesStorage": False, "writesMedia": False}
    v.immutable_write(args.output, proof)
    print(proof["counts"])


if __name__ == "__main__":
    main()
