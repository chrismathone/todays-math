import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/reconstructed-mapping-audit-001.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for r in data["records"]:
    if r.get("status") == "mapped" and r.get("currentQuestionsInOriginalPassage", 0) > 1:
        if r.get("nativeSupport"):
            print(f"Question {r['questionId']} in shared passage with nativeSupport:")
            print(json.dumps(r["nativeSupport"], indent=2, ensure_ascii=False))
            break
