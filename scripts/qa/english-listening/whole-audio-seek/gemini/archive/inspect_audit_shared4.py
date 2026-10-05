import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probes/round-008/ebs-middle-1-2007-1.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for p in data.get("probes", []):
    if p["id"] == 9:
        print(json.dumps(p, indent=2))
        break
