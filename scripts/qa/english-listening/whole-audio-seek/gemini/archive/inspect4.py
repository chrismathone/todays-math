import json
import glob
import os

probes = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probes/**/*.probe.json", recursive=True)
print(f"Found {len(probes)} probe json files.")

# print first 5 to see path structure
for p in probes[:5]:
    print(p)
