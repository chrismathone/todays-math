"""Independent source CPU replay of actual immutable provider bounded probe batches."""
import argparse
import collections
import hashlib
from pathlib import Path

import claude_adapter as adapter
import verifier as v


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--inventory", required=True)
    p.add_argument("--clock", required=True)
    p.add_argument("--probes", action="append", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    implementation = [v.reference(path) for path in sorted(Path(__file__).parent.iterdir()) if path.suffix in (".py", ".mts", ".md")]
    inventory = v.read(args.inventory)
    sources = {s["sourceRecordId"]: s for s in inventory["records"]}
    clocks = {s["sourceRecordId"]: s for s in v.read(args.clock)["records"]}
    rows, inputs = collections.defaultdict(list), []
    for input_path in args.probes:
        container = v.read(input_path)
        ref = v.reference(input_path)
        inputs.append(ref)
        for probe in container["probes"]:
            rows[container["sourceRecordId"]].append({"status": "candidate", "probeEvidence": {**ref, "probeId": probe["id"]}})
    outcomes = []
    for sid, source_rows in rows.items():
        source = sources[sid]
        replay = adapter.SourceReplay(inventory["root"], source, clocks[sid], source_rows)
        for row in source_rows:
            container, probe = adapter.checked_probe(row, source)
            adapter.checked_full_pcm(container, replay.actual, "raw_container_full_native_pcm_mismatch")
            if replay.actual.get("convertedClockProof"):
                v.require(container.get("convertedClockProof") == replay.actual["convertedClockProof"], "converted_probe_clock_proof_mismatch")
                v.require(container.get("playbackSha256") == source["audio"]["sha256"] and Path(container.get("playbackAudioPath", "")).resolve() == Path(replay.actual["playbackAudioPath"]).resolve(), "converted_probe_actual_playback_mismatch")
            result = {"sourceRecordId": sid, "probe": row["probeEvidence"], "status": "passed"}
            actual = replay.replay(probe)
            for k in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
                v.require(actual[k] == probe[k], f"actual_probe_replay_mismatch:{sid}:{probe['id']}:{k}")
                result[k] = actual[k]
            try:
                adapter.probe_segments(probe)
                result["rawRecognitionBounds"] = "passed"
            except v.InvalidEvidence as e:
                result["rawRecognitionBounds"] = "held"
                result["reasons"] = [str(e)]
            outcomes.append(result)
        print({"sourceRecordId": sid, "probes": len(source_rows), "energySha256": replay.actual["energySha256"], "fullPcmSha256": replay.actual["pcmSha256"]}, flush=True)
    result = {"schemaVersion": 1, "inputs": inputs, "inventory": v.reference(args.inventory), "clock": v.reference(args.clock),
              "implementation": implementation,
              "counts": {"sources": len(rows), "probes": len(outcomes), "rawRecognitionBounds": dict(collections.Counter(r["rawRecognitionBounds"] for r in outcomes))},
              "records": outcomes, "writesMedia": False, "writesDatabase": False, "writesStorage": False}
    for ref in inputs + [result["inventory"], result["clock"]] + implementation:
        v.require(v.sha(ref["path"]) == ref["sha256"], "probe_replay_input_or_implementation_changed_during_run")
    v.immutable_write(args.output, result)


if __name__ == "__main__":
    main()
