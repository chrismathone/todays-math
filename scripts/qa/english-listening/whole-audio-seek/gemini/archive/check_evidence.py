import json
import glob
import os

requests = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probe-requests/*.json")
evidence_dict = {}

for req_path in requests:
    if req_path.endswith(".plan.json") or req_path.endswith(".hypothesis.json"):
        continue
    with open(req_path, "r", encoding="utf-8") as f:
        req_data = json.load(f)
    if "sources" not in req_data:
        continue
    for source in req_data["sources"]:
        source_id = source["sourceRecordId"]
        for p in source.get("probes", []):
            asr_id = p.get("asrSegmentId")
            if asr_id is not None:
                key = f"{source_id}_{asr_id}"
                evidence_dict[key] = {
                    "request_path": req_path,
                    "probe": p,
                    "source": source,
                    "round": req_data.get("round")
                }

print(f"Loaded {len(evidence_dict)} unique probes from requests.")

# Now let's see how many of the 1282 questions we can resolve.
with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    matched = json.load(f)

missing = 0
found = 0
for r in matched.get("records", []):
    source_id = r["sourceRecordId"]
    cue_ids = r.get("cueSegmentIds", [])
    if not cue_ids:
        continue
    key = f"{source_id}_{cue_ids[0]}"
    if key in evidence_dict:
        found += 1
    else:
        missing += 1

print(f"Found evidence for {found} questions, missing for {missing} questions.")
