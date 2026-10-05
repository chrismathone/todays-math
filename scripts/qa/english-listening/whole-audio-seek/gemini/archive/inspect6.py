import json
import glob

requests = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probe-requests/*.json")

for req_path in requests:
    if req_path.endswith(".plan.json") or req_path.endswith(".hypothesis.json"): continue
    with open(req_path, "r", encoding="utf-8") as f:
        req_data = json.load(f)
    if "sources" not in req_data: continue
    
    # print one probe to see schema
    source = req_data["sources"][0]
    probe = source["probes"][0]
    
    print(f"Mode: {req_data.get('mode')}")
    print(f"Source keys: {list(source.keys())}")
    print(f"Probe keys: {list(probe.keys())}")
    break
