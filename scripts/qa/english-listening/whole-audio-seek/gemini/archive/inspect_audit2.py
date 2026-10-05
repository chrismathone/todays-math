import json
from collections import Counter

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/reconstructed-mapping-audit-001.json", "r", encoding="utf-8") as f:
    data = json.load(f)

c = Counter([r.get("status") for r in data["records"]])
print("Statuses:", c)
if data["records"]:
    print(json.dumps(data["records"][0], indent=2, ensure_ascii=False))
