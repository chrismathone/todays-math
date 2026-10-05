import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probes/round-007/ebs-middle-1-2006-1.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for p in data.get("probes", []):
    if "noiseFloorEvidence" in p:
        print("Found noiseFloorEvidence in probe", p["id"])
        print(json.dumps(p["noiseFloorEvidence"], indent=2))
        break
    else:
        print("No noiseFloorEvidence in probe", p["id"])
