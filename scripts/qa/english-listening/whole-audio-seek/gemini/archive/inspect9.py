import json
import glob
import os

# 1. Load native cache info
native_cache = {}
native_files = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/native/*.native.json")
for nf in native_files:
    with open(nf, "r", encoding="utf-8") as f:
        data = json.load(f)
    source_id = data["sourceRecordId"]
    native_cache[source_id] = data

# 2. Load noise floor evidence from probe requests
noise_floor = {}
req_files = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probe-requests/*.json")
for req in req_files:
    if req.endswith(".plan.json") or req.endswith(".hypothesis.json"): continue
    with open(req, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "sources" not in data: continue
    
    for src in data["sources"]:
        source_id = src["sourceRecordId"]
        for p in src.get("probes", []):
            asr_id = p.get("asrSegmentId")
            if asr_id is not None and "noiseFloorEvidence" in p:
                key = f"{source_id}_{asr_id}"
                noise_floor[key] = {
                    "startFrame": p["startFrame"],
                    "onsetFrame": p["onsetFrame"],
                    "quietBeforeFrames": p["quietBeforeFrames"],
                    "leadPeakDbfs": p.get("leadPeakDbfs"),
                    "noiseFloorEvidence": p["noiseFloorEvidence"],
                    "onsetMethod": data.get("mode")
                }

# 3. Load probe evidence from probe outputs
probe_evidence = {}
probe_files = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probes/**/*.probe.json", recursive=True)

import hashlib

for pf in probe_files:
    with open(pf, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # We need to know which source and asr_id this corresponds to.
    # The filename might be ebs-middle-1-2006-1-c16.probe.json
    filename = os.path.basename(pf)
    if not filename.endswith(".probe.json"): continue
    
    parts = filename[:-11].split("-c")
    if len(parts) == 2:
        source_id = parts[0]
        asr_id = int(parts[1])
        key = f"{source_id}_{asr_id}"
        
        # Calculate SHA256 of the probe file (wait, grok candidate used the round-007 json from probes folder! Wait, probeEvidence path in candidate is `grok/probes/round-007/ebs-middle-1-2006-1.json`, NOT the `.probe.json`!)
        # Let's just collect the segments here first.
        probe_evidence[key] = {
            "segments": data.get("segments", []),
            "path": pf,
            "pcm_sha256": data.get("pcm", {}).get("sha256")
        }

print(f"Loaded {len(native_cache)} native caches, {len(noise_floor)} noise floors, {len(probe_evidence)} probe outputs.")

# Wait, let's look at a candidate's probeEvidence to see its structure.
with open("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/ledgers/anchor-matched-1282.json", "r", encoding="utf-8") as f:
    matched = json.load(f)

for r in matched.get("records", []):
    if r.get("status") == "candidate":
        print(json.dumps(r["probeEvidence"], indent=2))
        break
