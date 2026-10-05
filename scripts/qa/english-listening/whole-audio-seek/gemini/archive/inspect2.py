import json
from collections import Counter

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    data = json.load(f)

c = Counter([r.get("status") for r in data.get("records", [])])
print("Statuses:", c)
