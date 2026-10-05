import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    matched = json.load(f)

probe_dict = {}
for r in matched.get("records", []):
    if r.get("status") == "candidate":
        source_id = r["sourceRecordId"]
        cue_ids = r.get("cueSegmentIds", [])
        if cue_ids:
            key = f"{source_id}_{cue_ids[0]}"
            probe_dict[key] = {
                "nativeEvidence": r["nativeEvidence"],
                "probeEvidence": r["probeEvidence"]
            }

print(f"Found {len(probe_dict)} distinct probes from candidates.")
