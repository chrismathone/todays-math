import json
import glob

requests = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probe-requests/*.json")

found_nf = 0
for req_path in requests:
    if req_path.endswith(".plan.json") or req_path.endswith(".hypothesis.json"): continue
    with open(req_path, "r", encoding="utf-8") as f:
        req_data = json.load(f)
    if "sources" not in req_data: continue
    
    for source in req_data["sources"]:
        for p in source.get("probes", []):
            if "noiseFloorEvidence" in p:
                found_nf += 1

print(f"Found {found_nf} probes with noiseFloorEvidence in requests.")
