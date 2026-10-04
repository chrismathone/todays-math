"""Combine immutable ASR observations without changing text or model timestamps."""
import hashlib
import json
import os

from strict_stage_support import context

args = context(__doc__)
directory = args.asr_output
sources = [args.base / "official-asr-stage" / args.source_id / "asr-medium-english.json",
           directory / "asr-medium-english-localized.json",
           args.base / "official-asr-stage" / args.source_id / "asr-medium-multilingual.json"]
inputs = [(path, hashlib.sha256(path.read_bytes()).hexdigest(), json.loads(path.read_text("utf8"))) for path in sources]
identity = {(value["sourceAudioSha256"], value["durationSeconds"]) for _, _, value in inputs}
if len(identity) != 1:
    raise ValueError("Original audio source or decoded duration differs")
segments = []
for _, sha, original in inputs:
    if original.get("derivedFrom"):
        raise ValueError("Recursive evidence aggregation is prohibited")
    for segment in original["segments"]:
        segments.append({**segment, "origin": {"artifactSha256": sha, "segmentId": segment["id"]}})
segments.sort(key=lambda segment: (segment["estimatedStartSeconds"], segment["origin"]["artifactSha256"], segment["origin"]["segmentId"]))
for index, segment in enumerate(segments, 1):
    segment["id"] = index
source_sha, duration = next(iter(identity))
artifact = {"schemaVersion": 1, "sourceAudioSha256": source_sha, "durationSeconds": duration,
            "derivedFrom": [{"path": str(path), "sha256": sha} for path, sha, _ in inputs],
            "segments": segments, "humanReviewed": False, "apiCostUsd": 0,
            "provenance": "Read-only aggregate of three actual ASR observations, including the multilingual cache. Text, uncertainty, and timestamps are copied exactly; origin IDs bind raw immutable inputs."}
destination = directory / "asr-medium-english-evidence.json"
temporary = destination.with_suffix(".json.partial")
temporary.write_text(json.dumps(artifact, ensure_ascii=False, indent=2), "utf8")
os.replace(temporary, destination)
print(json.dumps({"path": str(destination), "inputs": len(inputs), "segments": len(segments), "rawSha256": hashlib.sha256(destination.read_bytes()).hexdigest()}))
