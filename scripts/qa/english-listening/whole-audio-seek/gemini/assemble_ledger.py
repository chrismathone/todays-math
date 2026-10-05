import json
import hashlib
import sys
import os
import struct
import math

class ReplayDummy:
    def __init__(self, actual, energy):
        self.actual = actual
        self.energy = energy

def get_file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def assemble(mapping_audit_path, output_path, inventory_path="C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json", verifier_root="C:/Creative/testautocreator/scripts/qa/english-listening/whole-audio-seek/codex"):
    with open(mapping_audit_path, "r", encoding="utf-8") as f:
        audit_data = json.load(f)
    
    with open(inventory_path, "r", encoding="utf-8") as f:
        inventory_data = json.load(f)
        
    inventory_map = {r["sourceRecordId"]: r for r in inventory_data["records"]}
        
    import sys
    if verifier_root not in sys.path:
        sys.path.append(verifier_root)
    import noise_floor
    
    records = []
    
    # Preload all native caches
    native_caches = {}
    native_dir = "C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/native"
    for nf in os.listdir(native_dir):
        if nf.endswith(".native.json"):
            nf_path = os.path.join(native_dir, nf).replace("\\", "/")
            with open(nf_path, "r", encoding="utf-8") as f:
                n_data = json.load(f)
            src_id = n_data["sourceRecordId"]
            
            # Read energy
            energy_fname = n_data["energy"]["file"]
            energy_path = os.path.join(native_dir, energy_fname).replace("\\", "/")
            with open(energy_path, "rb") as ef:
                energy_bytes = ef.read()
            energy_list = [struct.unpack("<d", energy_bytes[i:i+8])[0] for i in range(0, len(energy_bytes), 8)]
            
            replay = ReplayDummy(
                actual={
                    "windowFrames": n_data["energy"]["windowFrames"],
                    "sampleRate": n_data["pcm"]["sampleRate"],
                    "frameCount": n_data["pcm"]["frameCount"]
                },
                energy=energy_list
            )
            
            native_caches[src_id] = {
                "n_data": n_data,
                "nf_path": nf_path,
                "nf_sha256": get_file_sha256(nf_path),
                "energy_path": energy_path,
                "replay": replay
            }

    for r in audit_data.get("records", []):
        src_id = r["sourceRecordId"]
        
        # Build the base record
        rec = {
            "status": "candidate" if r["status"] == "mapped" and len(r.get("nativeSupport", [])) > 0 else "held",
            "sourceRecordId": src_id,
            "setId": r.get("setId"),
            "revision": r.get("revision"),
            "documentSha256": r.get("documentSha256"),
            "questionId": r.get("questionId"),
            "sourceNumber": r.get("generatedSourceNumber"),
            "sourceAudioSha256": inventory_map[src_id].get("sourceAudioSha256", ""),
            "playbackSha256": inventory_map[src_id].get("audio", {}).get("sha256", ""),
            "asrPath": inventory_map[src_id].get("asrPath", "").replace("\\", "/"),
            "asrSha256": inventory_map[src_id].get("asrSha256", ""),
            "kind": r.get("kind", ""),
            "cueNumber": r.get("cueNumber"),
            "cueSpokenNumbers": r.get("cueSpokenNumbers", []),
            "scopeQuestionNumbers": r.get("scopeQuestionNumbers", []),
            "cueSegmentIds": r.get("cueSegmentIds", []),
            "cueText": r.get("cueText", ""),
            "anchorSegmentIds": r.get("anchorSegmentIds", []),
            "anchorText": r.get("anchorText", ""),
            "mappingEvidence": r.get("mappingEvidence")
        }
        
        if r.get("status") == "mapped" and len(r.get("nativeSupport", [])) > 0:
            ns = r["nativeSupport"][0]
            rec["seekStartMs"] = ns["seekStartMs"]
            
            if src_id in native_caches:
                inv_duration = inventory_map[src_id].get("audio", {}).get("durationMs")
                native_duration = native_caches[src_id]["n_data"]["playback"]["durationMs"]
                if inv_duration != native_duration:
                    raise ValueError(f"Duration mismatch for {src_id}: inventory={inv_duration}, native={native_duration}")
                rec["seekEndMs"] = inv_duration
            
            # Now build nativeEvidence
            cache_info = native_caches.get(src_id)
            if cache_info:
                onset_method = ns.get("purpose", "noise_floor_contrast_v1")
                n_ev = {
                    "onsetMethod": onset_method,
                    "cachePath": cache_info["nf_path"],
                    "cacheSha256": cache_info["nf_sha256"],
                    "energyPath": cache_info["energy_path"],
                    "energySha256": cache_info["n_data"]["energy"]["sha256"],
                    "sampleRate": cache_info["n_data"]["pcm"]["sampleRate"],
                    "channels": cache_info["n_data"]["pcm"]["channels"],
                    "frameCount": cache_info["n_data"]["pcm"]["frameCount"],
                    "pcmSha256": cache_info["n_data"]["pcm"]["sha256"],
                    "startFrame": ns["startFrame"],
                    "onsetFrame": ns["onsetFrame"]
                }
                
                replay = cache_info["replay"]
                wf = replay.actual["windowFrames"]
                onsetFrame = ns["onsetFrame"]
                startFrame = ns["startFrame"]
                window = onsetFrame // wf
                
                if onset_method in ("noise_floor_contrast_v1", "noise_floor_contrast_1second_v1"):
                    windows = 50 if onset_method == "noise_floor_contrast_1second_v1" else 100
                    nf_ev, limit = noise_floor.measure(replay, onsetFrame, baseline_windows=windows)
                    n_ev["noiseFloorEvidence"] = nf_ev
                    threshold = limit
                else:
                    threshold = wf * 32768 ** 2 * 10 ** (-50 / 10)
                
                quiet = 0
                for i in range(window - 1, -1, -1):
                    if replay.energy[i] >= threshold:
                        break
                    quiet += 1
                
                n_ev["quietBeforeFrames"] = quiet * wf
                
                start_window = startFrame // wf
                max_energy = max(replay.energy[start_window:window]) if start_window < window else 0
                if max_energy > 0:
                    peak = 10 * math.log10(max_energy / wf / 32768 ** 2)
                    n_ev["leadPeakDbfs"] = peak
                else:
                    n_ev["leadPeakDbfs"] = None
                
                rec["nativeEvidence"] = n_ev
                
            # Build probeEvidence
            p_ev = {
                "path": ns["artifact"]["path"].replace("\\", "/"),
                "sha256": ns["artifact"]["sha256"],
                "probeId": ns["probeId"],
                "segmentIds": ns["segmentIds"],
                "text": ns["text"],
                "inputMonoFloat32Sha256": ns["inputMonoFloat32Sha256"]
            }
            rec["probeEvidence"] = p_ev
        else:
            # Held row logic
            reasons = []
            if r.get("status") == "held":
                if r.get("reason"):
                    reasons.append(r["reason"])
                else:
                    reasons.append("audit_held")
            
            if not r.get("nativeSupport"):
                reasons.append("missing_actual_probe")
            
            if reasons:
                rec["reasons"] = reasons
            
        records.append(rec)
    
    out_data = {
        "schemaVersion": 1,
        "evidenceContractVersion": 1,
        "provider": "grok",
        "inventorySha256": "beb63eeb348ea93a39fa87bcc594cb018104260b800c1b423bff378cb7f3c1ef",
        "compilerProvider": "antigravity",
        "compilerModel": "gemini-3.1-pro-high",
        "upstreamProducer": "grok",
        "upstreamArtifacts": [
             {
                 "path": mapping_audit_path.replace("\\", "/"),
                 "sha256": get_file_sha256(mapping_audit_path)
             }
        ],
        "records": records
    }
    
    with open(output_path, "x", encoding="utf-8") as f:
        json.dump(out_data, f, indent=2, ensure_ascii=False)
    
    noise_floor_path = os.path.join(verifier_root, "noise_floor.py")
    nf_hash = get_file_sha256(noise_floor_path) if os.path.exists(noise_floor_path) else None
    
    receipt = {
        "output_path": output_path,
        "mapping_audit_path": mapping_audit_path,
        "verifier_root": verifier_root,
        "noise_floor_sha256": nf_hash
    }
    
    receipt_path = output_path + ".receipt.json"
    with open(receipt_path, "x", encoding="utf-8") as f:
        json.dump(receipt, f, indent=2, ensure_ascii=False)
        
    print(f"Wrote {len(records)} records to {output_path}")
    print(f"Wrote receipt to {receipt_path}")
    cand = sum(1 for r in records if r["status"] == "candidate")
    held = sum(1 for r in records if r["status"] == "held")
    print(f"Candidates: {cand}, Held: {held}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--mapping-audit", required=True, help="Path to mapping audit JSON")
    parser.add_argument("--output", required=True, help="Path to output ledger JSON")
    parser.add_argument("--inventory", default="C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json", help="Path to inventory JSON")
    parser.add_argument("--verifier-root", default="C:/Creative/testautocreator/scripts/qa/english-listening/whole-audio-seek/codex", help="Path to codex helper root")
    args = parser.parse_args()
    
    assemble(args.mapping_audit, args.output, args.inventory, args.verifier_root)
