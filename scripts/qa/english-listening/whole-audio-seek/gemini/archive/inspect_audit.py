import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/reconstructed-mapping-audit-001.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Keys in audit file: {list(data.keys())}")
if "records" in data:
    print(f"Number of records: {len(data['records'])}")
    for r in data["records"]:
        if r.get("status") == "candidate":
            print(json.dumps(r, indent=2, ensure_ascii=False))
            break
