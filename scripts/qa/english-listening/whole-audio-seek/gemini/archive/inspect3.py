import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for r in data.get("records", []):
    if r.get("status") == "held":
        print(json.dumps(r, indent=2, ensure_ascii=False))
        break
