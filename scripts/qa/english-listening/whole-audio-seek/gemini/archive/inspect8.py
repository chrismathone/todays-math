import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    matched = json.load(f)

# Group by cueSegmentIds
probe_dict = {}
for r in matched.get("records", []):
    if r.get("status") == "candidate":
        source_id = r["sourceRecordId"]
        cue_ids = r.get("cueSegmentIds", [])
        if not cue_ids: continue
        key = f"{source_id}_{cue_ids[0]}"
        probe_dict[key] = {
            "nativeEvidence": r.get("nativeEvidence"),
            "probeEvidence": r.get("probeEvidence")
        }

print(f"Found {len(probe_dict)} distinct probes from candidates.")

# How many held records can be resolved using these candidates?
resolved = 0
for r in matched.get("records", []):
    if r.get("status") == "held":
        source_id = r["sourceRecordId"]
        cue_ids = r.get("cueSegmentIds", [])
        if not cue_ids: continue
        key = f"{source_id}_{cue_ids[0]}"
        if key in probe_dict:
            resolved += 1

print(f"Can resolve {resolved} held records from candidates.")
