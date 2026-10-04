"""Finalize source-bound evidence, preserving every uncertainty and actual raw hash."""

import argparse
import json
from datetime import datetime, timezone

from strict_stage_support import (
    MODEL_REVISION,
    PRIORITY_SOURCES,
    PROTECTED_SOURCE,
    atomic,
    read,
    ref,
    sha256,
)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base", required=True)
args = parser.parse_args()
from pathlib import Path

base = Path(args.base).resolve()
output = base / "strict-stage-20261004"
fixed = base / "question-alignment" / f"{PROTECTED_SOURCE}.strict-alignment.json"
if sha256(fixed) != "95b92ef64d6c931dfd7a6c6708c4abcf34f9e545fedce5b39a3fa8ada3298bf7":
    raise ValueError("The already applied proof changed")
rows = []
for source_id in PRIORITY_SOURCES:
    activity_path = output / f"{source_id}.audio-activity.json"
    raw = read(activity_path)
    if sha256(raw["sourceAudioPath"]) != raw["sourceAudioSha256"]:
        raise ValueError("Actual original audio bytes differ")
    asr = output / "asr" / source_id
    korean_path, english_path = asr / "asr-medium-korean-announcements.json", asr / "asr-medium-english-localized.json"
    korean, english = read(korean_path), read(english_path)
    for cache in [korean, english]:
        if cache["sourceAudioSha256"] != raw["sourceAudioSha256"] or cache["modelSnapshotRevision"] != MODEL_REVISION or cache["activitySha256"] != sha256(activity_path) or cache["apiCostUsd"] != 0 or cache["humanReviewed"]:
            raise ValueError("Bounded ASR source/model/review binding differs")
    review_path, summary_path, result_path = [output / f"{source_id}.{suffix}.json" for suffix in ["boundary-review", "review-summary", "strict-verification"]]
    summary, result = read(summary_path), read(result_path)
    rows.append({**summary, "strictResult": result, "activity": ref(activity_path), "korean": ref(korean_path), "localizedEnglish": ref(english_path),
                 "derivedObservations": ref(asr / "asr-medium-english-evidence.json"), "review": ref(review_path),
                 "koreanSegmentsBeyondActualProbe": [{"segmentId": segment["id"], "sourceEventId": segment["sourceEventId"], "localEndSeconds": segment["localEndSeconds"]} for segment in korean["segments"] if segment["localEndSeconds"] > 12],
                 "emptyEnglishRecognitionWindowIds": [window["id"] for window in english["windows"] if not window["segmentIds"]],
                 "localTranscriptionSeconds": korean["transcriptionSeconds"] + english["transcriptionSeconds"]})
manifest = {"schemaVersion": 1, "checkedAt": datetime.now(timezone.utc).isoformat(), "sourceRecords": len(rows),
            "questions": sum(row["sourceQuestionCount"] for row in rows), "candidateChecksPassed": sum(row["candidateChecksPassed"] for row in rows),
            "candidateUncertain": sum(row["uncertain"] for row in rows), "strictWholeRoundsPassed": sum(row["strictResult"]["status"] == "passed" for row in rows),
            "humanReviewed": False, "writesDatabase": False, "writesStorage": False, "actualApiCostUsd": 0,
            "actualNativePcmQuietMeasured": False, "acousticRefinementRequired": True,
            "fixedPreviousSource": ref(fixed), "records": rows,
            "policy": "Candidate qualification is not final application. Original raw times/text/uncertainty remain unchanged; 400 ms VAD padding is not measured native PCM quiet. Latest complete-source/acoustic/repetition/anchor guards must be recomputed before any operational application."}
atomic(output / "manifest.json", manifest, replace=True)
print(json.dumps({key: value for key, value in manifest.items() if key not in ["records", "fixedPreviousSource"]}))
