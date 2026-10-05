import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    matched = json.load(f)

for r in matched.get("records", []):
    if r.get("status") == "candidate":
        print(json.dumps(r["probeEvidence"], indent=2))
        break
