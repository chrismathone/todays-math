"""CPU original PCM regression controls and pilot search coverage; never admission."""
import argparse
import collections
import math
import sys
from pathlib import Path

import claude_adapter as a
import verifier as v


def certificates(initial):
    pending, seen, rows, refs = [initial], set(), {}, []
    while pending:
        ref = pending.pop()
        key = (str(Path(ref["path"]).resolve()), ref["sha256"])
        if key in seen:
            continue
        seen.add(key)
        doc = v.checked_ref(ref)
        v.require(doc.get("completeReplay") is True and doc.get("errors") == [], "incomplete_control_certificate")
        refs.append(ref)
        for row in doc["records"]:
            if row.get("status") == "admitted":
                rows.setdefault((row["sourceRecordId"], row["questionId"]), row)
            scope = row.get("originalScopeEvidence", {})
            if scope.get("certificate"):
                pending.append(scope["certificate"])
        for key, upstream in doc.get("inputs", {}).items():
            if key == "ancestorCertificate" or key.startswith("ancestorScope:"):
                pending.append(upstream)
    return rows, refs


def acoustic_events(replay):
    actual, energy = replay.actual, replay.energy
    wf = actual["windowFrames"]
    threshold = wf * 32768 ** 2 * 10 ** (-50 / 10)
    quiet, events = 0, []
    for window, level in enumerate(energy):
        if level < threshold:
            quiet += 1
        else:
            if quiet >= 5:
                events.append({"onsetFrame": window * wf, "startFrame": (window - min(20, quiet)) * wf,
                               "quietBeforeFrames": quiet * wf})
            quiet = 0
    return events


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "clock", "plan", "controls", "output"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    inputs = {key: v.reference(getattr(args, key)) for key in ("inventory", "clock", "plan", "controls")}
    inventory, clocks, plan, grouped = [v.checked_ref(inputs[key]) for key in ("inventory", "clock", "plan", "controls")]
    v.require(clocks["inventorySha256"] == inputs["inventory"]["sha256"], "clock_wrong_inventory")
    v.require(grouped["inputs"]["inventory"]["sha256"] == inputs["inventory"]["sha256"], "controls_wrong_inventory")
    origin, refs = certificates(plan["inputs"]["certificate"])
    partitions = {}
    for name, partition in grouped["partitions"].items():
        for row in partition:
            for qid in row["questionIds"]:
                key = row["sourceRecordId"], qid
                v.require(key not in partitions, "duplicate_control_question")
                partitions[key] = (name, row)
    clock_index = {r["sourceRecordId"]: r for r in clocks["records"]}
    counts, controls, pilots, source_checks = collections.Counter(), [], [], []
    windows = collections.defaultdict(list)
    for window in plan["originalSearchWindows"]:
        windows[window["sourceRecordId"]].append(window)
    for source in inventory["records"]:
        sid = source["sourceRecordId"]
        replay = a.SourceReplay(inventory["root"], source, clock_index[sid], [])
        source_checks.append({"sourceRecordId": sid, "status": "passed", **replay.actual})
        events = acoustic_events(replay)
        rate = replay.actual["sampleRate"]
        for question in source["questions"]:
            key = sid, question["id"]
            if key not in partitions:
                continue
            name, reference = partitions[key]
            v.require(question.get("audioRange", {}).get("startMs") == reference["referenceStartMs"], "control_reference_start_changed")
            v.require(source["sourceAudioSha256"] == reference["sourceAudioSha256"], "control_reference_source_changed")
            row = {"sourceRecordId": sid, "questionId": question["id"], "partition": name,
                   "referenceStartMs": reference["referenceStartMs"], "referenceIsHumanGold": False,
                   "sourceAudioSha256": source["sourceAudioSha256"], "familyId": reference["familyId"]}
            old = origin.get(key)
            if old and old.get("nativeEvidence", {}).get("onsetFrame") is not None:
                native = old["nativeEvidence"]
                try:
                    for field in ("sampleRate", "channels", "frameCount", "pcmSha256"):
                        v.require(native.get(field) == replay.actual[field], "control_actual_native_identity:" + field)
                    a.measured_onset(native, replay)
                    predicted = native["startFrame"] * 1000 // rate
                    delta = predicted - row["referenceStartMs"]
                    row.update(status="physical_onset_replayed", originalScopeNumbers=old.get("scopeQuestionNumbers"),
                               replayStartMs=predicted, deltaMs=delta, exactReference=(delta == 0),
                               lateToReference=(delta > 0), onsetFrame=native["onsetFrame"])
                except (v.InvalidEvidence, KeyError, TypeError, ValueError) as error:
                    row.update(status="physical_onset_held", reason=str(error))
            else:
                row.update(status="no_native_onset_in_original_certificate")
            counts[name + ":" + row["status"]] += 1
            controls.append(row)
        for window in windows[sid]:
            band = window["estimatedSearchWindowMs"]
            found = [event for event in events if band["fromMs"] <= event["onsetFrame"] * 1000 / rate <= band["toMs"]]
            pilots.append({**window, "sourceAudioSha256": source["sourceAudioSha256"], "sampleRate": rate,
                           "acousticCandidates": found, "acousticCandidateCount": len(found),
                           "recognitionRun": False, "admissionAuthority": False})
        print({"processedSources": len(source_checks), "totalSources": len(inventory["records"]),
               "controls": len(controls), "pilotWindows": len(pilots)}, file=sys.stderr, flush=True)
    implementation = [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    for ref in list(inputs.values()) + refs + implementation:
        v.require(v.sha(ref["path"]) == ref["sha256"], "evaluation_input_changed")
    v.require(len(controls) == len(partitions) == 2727 and len(source_checks) == 193 and len(pilots) == 29,
              "incomplete_control_or_pilot_population")
    groups = {}
    for row in controls:
        key = row["sourceRecordId"], row["referenceStartMs"]
        if key not in groups:
            groups[key] = {**row, "questionIds": []}
            groups[key].pop("questionId")
        groups[key]["questionIds"].append(row["questionId"])
        v.require(groups[key]["status"] == row["status"], "shared_control_proof_disagreement")
    v.require(len(groups) == 2615, "incomplete_deduplicated_control_groups")
    v.immutable_write(args.output, {"schemaVersion": 1, "diagnosticOnly": True, "admissionAuthority": False,
        "writesDatabase": False, "writesStorage": False, "writesMedia": False, "humanReviewed": False,
        "inputs": inputs, "originCertificates": refs, "implementation": implementation,
        "counts": dict(counts), "groupCounts": dict(collections.Counter(g["partition"] + ":" + g["status"] for g in groups.values())),
        "controlGroups": list(groups.values()), "controls": controls, "pilotWindows": pilots, "sourceChecks": source_checks,
        "limitations": ["Existing machine-certified starts are regression references, not human gold.",
                        "Physical onset replay does not independently recognize or prove question identity.",
                        "Research already inspected control distributions; source split is not pristine external validation.",
                        "Pilot acoustic events are search candidates, never admitted timestamps."]})
    print({"controls": len(controls), "pilotWindows": len(pilots), "counts": dict(counts), "output": args.output})


if __name__ == "__main__":
    main()
