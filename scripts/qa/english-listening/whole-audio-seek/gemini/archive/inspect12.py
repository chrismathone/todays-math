import json
import glob

requests = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probe-requests/*.json")
for req_path in requests:
    if req_path.endswith(".plan.json") or req_path.endswith(".hypothesis.json"): continue
    with open(req_path, "r", encoding="utf-8") as f:
        req_data = json.load(f)
    if "sources" not in req_data: continue
    
    for src in req_data["sources"]:
        for p in src.get("probes", []):
            if "noiseFloorEvidence" in p:
                print(f"Found in {req_path}: source {src['sourceRecordId']} probe {p['id']}")
