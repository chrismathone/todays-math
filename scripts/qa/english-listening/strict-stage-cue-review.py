"""Exact raw decimal-form cue and original instruction spans; no cue approval."""

import json
import re

from strict_stage_support import atomic, context, read, ref

args = context(__doc__)
korean_path = args.asr_output / "asr-medium-korean-announcements.json"
script_path = args.output / f"{args.source_id}.strict-script.json"
korean, script = read(korean_path), read(script_path)
full = script["sourceTranscriptText"]
rows = []
for segment in korean["segments"]:
    match = re.match(r"^(\d{1,2})\.\s*(.+)", segment["text"])
    if not match:
        continue
    number = int(match[1])
    markers = [m for m in re.finditer(r"(?<!\d)(20|1[0-9]|[1-9])\s*번", full) if int(m[1]) == number]
    if len(markers) != 1:
        continue
    marker = markers[0]
    first_speaker = re.search(r"\b[MW]\s*:", full[marker.end():])
    if first_speaker is None:
        continue
    start = marker.start()
    raw = full[start:marker.end() + first_speaker.start()].rstrip()
    rows.append({"sourceNumber": number, "rawKoreanSegment": segment,
                 "probe": next(probe for probe in korean["probes"] if probe["id"] == segment["probeId"]),
                 "officialAnnouncement": {"startCharacter": len(full[:start].encode("utf-16-le")) // 2,
                                          "endCharacter": len(full[:start + len(raw)].encode("utf-16-le")) // 2, "text": raw},
                 "officialScript": ref(script_path), "koreanArtifact": ref(korean_path),
                 "sourceTranscriptFileSha256": script["sourceTranscriptFileSha256"]})
atomic(args.output / f"{args.source_id}.cue-format-review.json", {"sourceRecordId": args.source_id, "humanReviewed": False, "candidates": rows}, replace=True)
print(json.dumps({"sourceRecordId": args.source_id, "decimalCueCandidates": [row["sourceNumber"] for row in rows]}))
