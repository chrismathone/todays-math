import json
import glob

# Build a lookup table from (source_id, asrSegmentId) to nativeEvidence and probeEvidence pieces
evidence_db = {}

# 1. Native Cache info
native_files = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/native/*.native.json")
for nf in native_files:
    with open(nf, "r", encoding="utf-8") as f:
        data = json.load(f)
    evidence_db[data["sourceRecordId"]] = {
        "cachePath": nf,
        "cacheSha256": data.get("cacheSha256"), # wait, native.json doesn't have its own sha inside it.
        # Wait, the native.json has: pcm, energy, etc.
        "energyPath": data.get("energy", {}).get("file"),
        "energySha256": data.get("energy", {}).get("sha256"),
        "sampleRate": data.get("pcm", {}).get("sampleRate"),
        "channels": data.get("pcm", {}).get("channels"),
        "frameCount": data.get("pcm", {}).get("frameCount"),
        "pcmSha256": data.get("pcm", {}).get("sha256")
    }

# 2. Probe requests for noise floor
probe_requests = glob.glob("C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/probe-requests/*.json")
nf_db = {}
for req in probe_requests:
    if req.endswith(".plan.json") or req.endswith(".hypothesis.json"): continue
    with open(req, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "sources" not in data: continue
    
    mode = data.get("mode")
    for src in data["sources"]:
        source_id = src["sourceRecordId"]
        for p in src.get("probes", []):
            asr_id = p.get("asrSegmentId")
            if asr_id is not None:
                key = f"{source_id}_{asr_id}"
                nf_db[key] = {
                    "startFrame": p.get("startFrame"),
                    "onsetFrame": p.get("onsetFrame"),
                    "quietBeforeFrames": p.get("quietBeforeFrames"),
                    "leadPeakDbfs": p.get("leadPeakDbfs"),
                    "noiseFloorEvidence": p.get("noiseFloorEvidence"),
                    "onsetMethod": mode,
                    "nativeCachePath": src.get("nativeCachePath"),
                    "nativeCacheSha256": src.get("nativeCacheSha256")
                }

# Now see if we have nf_db for the shared question we found: ebs-middle-1-2007-1 and cueSegmentId 72
print(nf_db.get("ebs-middle-1-2007-1_72"))
