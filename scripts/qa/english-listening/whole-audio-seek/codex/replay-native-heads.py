"""Actual CPU replay of raw pilot numbered probes; independent diagnostic only."""
import argparse
import collections
import math
from pathlib import Path

import claude_adapter as a
import localized_adapter as l
import noise_floor as noise
import verifier as v


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "clock", "output"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--probes", action="append", required=True)
    args = parser.parse_args()
    inputs = {k: v.reference(getattr(args, k)) for k in ("inventory", "clock")}
    inventory, clocks = v.checked_ref(inputs["inventory"]), v.checked_ref(inputs["clock"])
    v.require(clocks["inventorySha256"] == inputs["inventory"]["sha256"], "clock_wrong_inventory")
    clock_index = {c["sourceRecordId"]: c for c in clocks["records"]}
    sources = {s["sourceRecordId"]: s for s in inventory["records"]}
    results, source_checks, references = [], [], list(inputs.values())
    implementation = [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    for path in args.probes:
        ref = v.reference(path)
        container = v.checked_ref(ref)
        source = sources[container["sourceRecordId"]]
        raw = [p for p in container["probes"] if p.get("requestedLanguage") == "ko"]
        rows = [{"status": "candidate", "probeEvidence": {**ref, "probeId": p["id"]}} for p in raw]
        replay = a.SourceReplay(inventory["root"], source, clock_index[source["sourceRecordId"]], rows)
        a.checked_full_pcm(container, replay.actual, "pilot_actual_full_pcm_mismatch")
        source_checks.append(replay.actual)
        references.extend([ref, {"path": container["requestPath"], "sha256": container["requestSha256"]}])
        for row, probe in zip(rows, raw):
            result = {"sourceRecordId": source["sourceRecordId"], "probe": row["probeEvidence"],
                      "rawProbe": probe, "admissionAuthority": False, "status": "held", "reasons": []}
            try:
                a.checked_probe(row, source)
                actual = replay.replay(probe)
                for key in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
                    v.require(probe.get(key) == actual[key], "pilot_actual_probe_hash:" + key)
                index = a.probe_segments(probe)
                first = next(iter(index.values()))
                v.require(not v.uncertain(first), "uncertain_raw_evidence")
                numbers, rest = l.literal_cue(first["text"])
                v.require(numbers and __import__("re").search(r"듣고|고르시오|고르세요|답하시오|선택하시오", rest), "pilot_not_numbered_instruction")
                rate, wf = replay.actual["sampleRate"], replay.actual["windowFrames"]
                onset = probe["onsetFrame"]
                method = probe.get("onsetMethod", "absolute_energy_v2")
                native = {"startFrame": probe["startFrame"], "onsetFrame": onset,
                          "quietBeforeFrames": probe["quietBeforeFrames"], "onsetMethod": method}
                if method in (noise.METHOD, noise.METHOD_ONE_SECOND):
                    evidence, _ = noise.measure(replay, onset, baseline_windows=50 if method == noise.METHOD_ONE_SECOND else 100)
                    native["noiseFloorEvidence"] = evidence
                bins = replay.energy[probe["startFrame"] // wf:onset // wf]
                native["leadPeakDbfs"] = 10 * math.log10(max(bins) / wf / 32768 ** 2) if bins and max(bins) > 0 else None
                a.measured_onset(native, replay)
                relative = (onset - probe["startFrame"]) / rate
                v.require(first["estimatedStartSeconds"] - .5 <= relative <= first["estimatedEndSeconds"], "pilot_onset_cue_correspondence_missing")
                result.update(status="native_heading_replayed", spokenNumbers=numbers, measuredNativeEvidence=native,
                              measuredStartMs=probe["startFrame"] * 1000 // rate, rawSegments=list(index.values()),
                              cpuRecognitionInputDiagnostics=actual["cpuVad"])
            except (v.InvalidEvidence, KeyError, ValueError, TypeError) as error:
                result["reasons"].append(str(error))
            results.append(result)
    for ref in references + implementation:
        v.require(v.sha(ref["path"]) == ref["sha256"], "pilot_raw_input_changed_during_replay")
    counts = dict(collections.Counter(r["status"] for r in results))
    v.immutable_write(args.output, {"schemaVersion": 1, "diagnosticOnly": True, "admissionAuthority": False,
        "writesDatabase": False, "writesStorage": False, "writesMedia": False, "humanReviewed": False,
        "inputs": references, "implementation": implementation, "counts": counts, "sourceChecks": source_checks, "records": results,
        "limitations": ["A replayed heading alone does not prove current question generation mapping or next passage.",
                        "ASR text is immutable model evidence, not human gold.", "No new recognition was run by this CPU replay."]})
    print({"sources": len(source_checks), "probes": len(results), "counts": counts, "output": args.output})


if __name__ == "__main__":
    main()
