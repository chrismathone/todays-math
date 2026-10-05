import json

with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probes/ebs-middle-1-2006-1-c16.probe.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Probe segments: {data.get('segments', [])[0]}")
