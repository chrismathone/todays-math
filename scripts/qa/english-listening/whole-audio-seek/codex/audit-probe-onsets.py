"""Source-bound CPU speech-onset diagnostics; no GPU/recognition/media writes."""
import argparse
from pathlib import Path

import claude_adapter as a
import verifier as v


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--clock", required=True)
    parser.add_argument("--probe", action="append", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    inventory = v.read(args.inventory)
    sources = {s["sourceRecordId"]: s for s in inventory["records"]}
    clocks = {c["sourceRecordId"]: c for c in v.read(args.clock)["records"]}
    records = []
    for path in args.probe:
        container = v.read(path)
        sid = container["sourceRecordId"]
        source, clock = sources[sid], clocks[sid]
        ref = v.reference(path)
        rows = [{"status": "candidate", "dialogueProbeEvidence" if p.get("purpose") == "first_dialogue" else "probeEvidence": {**ref, "probeId": p["id"]}} for p in container["probes"]]
        replay = a.SourceReplay(inventory["root"], source, clock, rows)
        for p in container["probes"]:
            actual = replay.replay(p)
            for key in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
                v.require(actual[key] == p[key], "actual_probe_decode_mismatch:" + key)
            raw = p.get("segments", [])
            spoken = a.leading_cue(raw[0]["text"])[0] if raw else None
            onset = p.get("onsetFrame")
            if onset is None:
                wf = replay.actual["windowFrames"]
                threshold = wf * 32768 ** 2 * 10 ** (-50 / 10)
                first = next((i for i in range((p["startFrame"] + wf - 1) // wf, (p["startFrame"] + p["frameCount"]) // wf)
                              if replay.energy[i] >= threshold), None)
                onset = first * wf if first is not None else None
            lead = (onset - p["startFrame"]) / p["sampleRate"] if onset is not None else None
            starts = actual["cpuVad"]["estimatedSpeechStarts"]
            records.append({"sourceRecordId": sid, "probe": ref, "probeId": p["id"], "purpose": p.get("purpose"),
                            "startFrame": p["startFrame"], "onsetFrame": onset, "sampleRate": p["sampleRate"],
                            "existingStartMs": p.get("existingStartMs"), "originalQuestionNumber": p.get("questionNumber"),
                            "measuredSoundOnsetSeconds": lead, "spokenNumbers": spoken,
                            "rawFirstSegment": raw[0] if raw else None,
                            "firstCpuSpeechEstimateSeconds": starts[0] / 16000 if starts else None,
                            "cpuVad": actual["cpuVad"], "actualClipPcmSha256": actual["clipPcmSha256"],
                            "actualInputMonoFloat32Sha256": actual["inputMonoFloat32Sha256"]})
    proof = {"schemaVersion": 1, "diagnosticOnly": True, "writesDatabase": False, "writesStorage": False, "writesMedia": False,
             "inputs": {"inventory": v.reference(args.inventory), "clock": v.reference(args.clock)},
             "implementation": [v.reference(Path(__file__)), v.reference(Path(a.__file__))], "records": records}
    v.immutable_write(args.output, proof)
    numbered = [r for r in records if r["spokenNumbers"] and r["measuredSoundOnsetSeconds"] is not None]
    print({"probes": len(records), "numbered": len(numbered),
           "noCpuSpeech": sum(r["firstCpuSpeechEstimateSeconds"] is None for r in numbered),
           "cpuSpeechMoreThan250msAfterSound": sum(r["firstCpuSpeechEstimateSeconds"] is not None and r["firstCpuSpeechEstimateSeconds"] - r["measuredSoundOnsetSeconds"] > .25 for r in numbered)})


if __name__ == "__main__":
    main()
