"""Actual CPU replay of raw pilot numbered probes; independent diagnostic only."""
import argparse
import collections
import math
import sys
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
    parser.add_argument("--grouped-controls")
    args = parser.parse_args()
    inputs = {k: v.reference(getattr(args, k)) for k in ("inventory", "clock")}
    inventory, clocks = v.checked_ref(inputs["inventory"]), v.checked_ref(inputs["clock"])
    v.require(clocks["inventorySha256"] == inputs["inventory"]["sha256"], "clock_wrong_inventory")
    clock_index = {c["sourceRecordId"]: c for c in clocks["records"]}
    sources = {s["sourceRecordId"]: s for s in inventory["records"]}
    families = {}
    if args.grouped_controls:
        inputs["groupedControls"] = v.reference(args.grouped_controls)
        grouped = v.checked_ref(inputs["groupedControls"])
        control_inventory = grouped["inputs"]["inventory"]
        v.checked_ref(control_inventory, inputs["inventory"]["path"])
        v.require(control_inventory["sha256"] == inputs["inventory"]["sha256"], "heading_controls_wrong_inventory")
        for partition, groups in grouped["partitions"].items():
            for group in groups:
                identity = {"partition": partition, "familyId": group["familyId"]}
                sid = group["sourceRecordId"]
                v.require(sid not in families or families[sid] == identity, "heading_source_split_between_control_families")
                families[sid] = identity
    results, source_checks, references = [], [], list(inputs.values())
    implementation = [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    for path in args.probes:
        ref = v.reference(path)
        container = v.checked_ref(ref)
        source = sources[container["sourceRecordId"]]
        raw = [p for p in container["probes"] if p.get("requestedLanguage") == "ko"]
        rows = [{"status": "candidate", "evidenceAdapter": l.ADAPTER, "probeEvidence": {**ref, "probeId": p["id"]}} for p in raw]
        replay = a.SourceReplay(inventory["root"], source, clock_index[source["sourceRecordId"]], rows)
        a.checked_full_pcm(container, replay.actual, "pilot_actual_full_pcm_mismatch")
        source_checks.append(replay.actual)
        references.extend([ref, {"path": container["requestPath"], "sha256": container["requestSha256"]}])
        references.extend(l.upstream_refs(container, source))
        for row, probe in zip(rows, raw):
            result = {"sourceRecordId": source["sourceRecordId"], "probe": row["probeEvidence"],
                      "rawProbe": probe, "admissionAuthority": False, "status": "held", "reasons": [],
                      "controlFamily": families.get(source["sourceRecordId"])}
            try:
                a.checked_probe(row, source)
                actual = replay.replay(probe)
                for key in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
                    v.require(probe.get(key) == actual[key], "pilot_actual_probe_hash:" + key)
                index = a.probe_segments(probe)
                first = next(iter(index.values()))
                v.require(not v.uncertain(first), "uncertain_raw_evidence")
                v.require(first["estimatedStartSeconds"] <= 2, "localized_probe_missing_first_syllable")
                numbers, rest = l.literal_cue(first["text"])
                v.require(numbers, "pilot_not_numbered_instruction")
                selected, rest = l.complete_instruction_prefix(index, [first])
                rate, wf = replay.actual["sampleRate"], replay.actual["windowFrames"]
                onset = probe["onsetFrame"]
                method = probe.get("onsetMethod", "absolute_energy_v2")
                native = {"startFrame": probe["startFrame"], "onsetFrame": onset,
                          "quietBeforeFrames": probe["quietBeforeFrames"], "onsetMethod": method}
                if method in (noise.METHOD, noise.METHOD_ONE_SECOND):
                    evidence, threshold = noise.measure(replay, onset, baseline_windows=50 if method == noise.METHOD_ONE_SECOND else 100)
                    native["noiseFloorEvidence"] = evidence
                    quiet = 0
                    for window in range(onset // wf - 1, -1, -1):
                        if replay.energy[window] >= threshold:
                            break
                        quiet += 1
                    full_quiet = quiet * wf
                    if full_quiet != probe["quietBeforeFrames"]:
                        native.update(quietBeforeFrames=full_quiet, rawProbeQuietBeforeFrames=probe["quietBeforeFrames"],
                            quietEvidenceMethod="independent_full_source_quiet_v1", quietDiscoveryEvidence={
                                "method": "noise_baseline_capped_discovery_v1", "contextStartFrame": evidence["baselineStartFrame"],
                                "contextFrameCount": evidence["baselineFrameCount"], "contextEnergySha256": evidence["baselineEnergySha256"],
                                "request": {"path": container["requestPath"], "sha256": container["requestSha256"]}, "probeId": probe["id"]})
                bins = replay.energy[probe["startFrame"] // wf:onset // wf]
                native["leadPeakDbfs"] = 10 * math.log10(max(bins) / wf / 32768 ** 2) if bins and max(bins) > 0 else None
                l.measure_probe_onset({"nativeEvidence": native, "probeEvidence": row["probeEvidence"]}, source, replay, "probeEvidence", probe)
                relative = (onset - probe["startFrame"]) / rate
                v.require(first["estimatedStartSeconds"] - .5 <= relative <= first["estimatedEndSeconds"], "pilot_onset_cue_correspondence_missing")
                result.update(status="native_heading_replayed", spokenNumbers=numbers, measuredNativeEvidence=native,
                              measuredStartMs=probe["startFrame"] * 1000 // rate, rawSegments=list(index.values()),
                              cpuRecognitionInputDiagnostics=actual["cpuVad"])
            except (v.InvalidEvidence, KeyError, ValueError, TypeError) as error:
                result["reasons"].append(str(error))
            results.append(result)
        print({"processedSources": len(source_checks), "probes": len(results),
               "counts": dict(collections.Counter(r["status"] for r in results))}, file=sys.stderr, flush=True)
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
