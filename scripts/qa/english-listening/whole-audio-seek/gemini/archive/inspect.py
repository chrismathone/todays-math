import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Number of records: {len(data.get('records', []))}")
if data.get('records'):
    print(json.dumps(data['records'][0], indent=2, ensure_ascii=False))
