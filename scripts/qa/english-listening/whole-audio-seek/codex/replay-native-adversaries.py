"""CPU replay of actual truncated pilot ASR; negative diagnostics, never admission."""
import argparse
import collections
import sys
from pathlib import Path

import claude_adapter as a
import localized_adapter as l
import verifier as v


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "clock", "controls", "output"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--probes", action="append", required=True)
    args = parser.parse_args()
    refs = [v.reference(getattr(args, k)) for k in ("inventory", "clock", "controls")]
    inventory, clocks, controls = [v.checked_ref(r) for r in refs]
    v.require(controls.get("diagnosticOnly") is True and controls.get("admissionAuthority") is False,
              "adversarial_controls_not_explicit_diagnostics")
    refs.extend(controls["inputs"] + controls["implementation"])
    v.require(clocks["inventorySha256"] == refs[0]["sha256"], "clock_wrong_inventory")
    sources = {s["sourceRecordId"]: s for s in inventory["records"]}
    clock_index = {c["sourceRecordId"]: c for c in clocks["records"]}
    physical = {s["sourceRecordId"]: s for s in controls["sourceChecks"]}
    heads = {(r["sourceRecordId"], r["measuredNativeEvidence"]["onsetFrame"]): r for r in controls["records"]
             if r["status"] == "native_heading_replayed"}
    implementation = [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    results, source_checks = [], []
    for path in args.probes:
        ref = v.reference(path)
        container = v.checked_ref(ref)
        source = sources[container["sourceRecordId"]]
        rows = [{"status": "candidate", "evidenceAdapter": l.ADAPTER, "probeEvidence": {**ref, "probeId": p["id"]}} for p in container["probes"]]
        replay = a.SourceReplay(inventory["root"], source, clock_index[source["sourceRecordId"]], rows)
        a.checked_full_pcm(container, replay.actual, "adversarial_full_pcm_mismatch")
        v.require(replay.actual == physical[source["sourceRecordId"]], "adversarial_original_changed_from_heading_controls")
        source_checks.append(replay.actual)
        refs.extend([ref, {"path": container["requestPath"], "sha256": container["requestSha256"]}])
        refs.extend(l.upstream_refs(container, source))
        for row, probe in zip(rows, container["probes"]):
            a.checked_probe(row, source)
            actual = replay.replay(probe)
            for key in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
                v.require(probe.get(key) == actual[key], "adversarial_actual_probe_hash:" + key)
            record = {"sourceRecordId": source["sourceRecordId"], "probe": row["probeEvidence"], "rawProbe": probe,
                      "physicalInputReplayed": True, "admissionAuthority": False, "status": "unmatched_control",
                      "expectedNumbersAuthority": False, "reasons": ["no_independently_replayed_complete_heading_at_this_native_onset"]}
            head = heads.get((source["sourceRecordId"], probe.get("onsetFrame")))
            if head:
                native = head["measuredNativeEvidence"]
                a.measured_onset(native, replay)
                record["control"] = {"probe": head["probe"], "nativeEvidence": native,
                                     "spokenNumbers": head["spokenNumbers"]}
                record["controlFamily"] = head.get("controlFamily")
                record["reasons"] = []
                index = {}
                try:
                    index = a.probe_segments(probe)
                    first = next(iter(index.values()))
                    spoken, rest = l.literal_cue(first["text"])
                    # A confident numeral cannot replace the omitted physical
                    # first syllable or borrow an instruction after dialogue.
                    if spoken and not v.uncertain(first):
                        l.complete_instruction_prefix(index, [first])
                        record["recognizerReportsCompleteReliableHeading"] = True
                    else:
                        record["recognizerReportsCompleteReliableHeading"] = False
                except (v.InvalidEvidence, KeyError, ValueError, TypeError) as error:
                    record["recognitionDiagnostics"] = [str(error)]
                    record["recognizerReportsCompleteReliableHeading"] = False
                if probe["startFrame"] > native["onsetFrame"]:
                    claimed_native = {**native, "startFrame": probe["startFrame"]}
                    try:
                        a.measured_onset(claimed_native, replay)
                        raise v.InvalidEvidence("adversarial_late_start_unexpectedly_passed_native_gate")
                    except v.InvalidEvidence as error:
                        v.require(str(error) == "native_start_or_onset_overflow", "adversarial_unexpected_native_failure:" + str(error))
                        record["unchangedNativeGateReason"] = str(error)
                    record.update(status="negative_control_held", reasons=["actual_clip_begins_after_independently_measured_original_onset"],
                                  omittedBeginningFrames=probe["startFrame"] - native["onsetFrame"])
                elif probe["startFrame"] + probe["frameCount"] <= native["onsetFrame"] + replay.actual["sampleRate"] // 2:
                    record["speechFramesAfterOnset"] = probe["startFrame"] + probe["frameCount"] - native["onsetFrame"]
                    if not record.get("recognizerReportsCompleteReliableHeading"):
                        record.update(status="negative_control_held", reasons=["short_prefix_clip_has_no_complete_reliable_instruction"])
                    else:
                        record["reasons"].append("short_clip_reports_instruction_requires_complete_candidate_evidence")
                else:
                    record["reasons"].append("adversarial_cut_effect_not_independently_established")
            results.append(record)
        print({"processedSources": len(source_checks), "probes": len(results),
               "counts": dict(collections.Counter(r["status"] for r in results))}, file=sys.stderr, flush=True)
    for ref in refs + implementation:
        v.require(v.sha(ref["path"]) == ref["sha256"], "adversarial_input_or_implementation_changed")
    counts = dict(collections.Counter(r["status"] for r in results))
    v.immutable_write(args.output, {"schemaVersion": 1, "diagnosticOnly": True, "admissionAuthority": False,
        "writesDatabase": False, "writesStorage": False, "writesMedia": False, "humanReviewed": False,
        "inputs": refs, "implementation": implementation, "sourceChecks": source_checks, "counts": counts, "records": results,
        "limitations": ["Recognition text/confidence cannot recover omitted physical beginning frames.",
                        "Heading controls are model evidence and waveform references, not human gold or question mapping.",
                        "Expected numbers and purpose labels are diagnostics and supply no source identity.",
                        "This replay ran no new recognition and admits no questions."]})
    print({"sources": len(source_checks), "probes": len(results), "counts": counts, "output": args.output})


if __name__ == "__main__":
    main()
