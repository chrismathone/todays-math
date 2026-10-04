"""Bounded Korean cue or localized English evidence; same frozen medium/int8 model."""

import faulthandler
import hashlib
import json
import os
import sysconfig
import time
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

from strict_stage_support import (
    MODEL_REVISION,
    atomic,
    context,
    read,
    recognition_windows,
    ref,
)

faulthandler.enable()
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("CT2_CUDA_ALLOCATOR", "cub_caching")
args = context(__doc__, ["korean", "english"])
activity_path = args.output / f"{args.source_id}.audio-activity.json"
activity = read(activity_path)
if activity["sourceAudioSha256"] != args.audio_sha:
    raise ValueError("Actual activity source differs")
destination = args.asr_output / ("asr-medium-korean-announcements.json" if args.mode == "korean" else "asr-medium-english-localized.json")
if destination.exists():
    cached = read(destination)
    if cached["sourceAudioSha256"] != args.audio_sha or cached["activitySha256"] != ref(activity_path)["sha256"]:
        raise ValueError("Existing bounded ASR cache binding differs")
    print(json.dumps({"stage": "strict-asr-cache-reused", "path": str(destination)}))
    raise SystemExit(0)

dll_handles = []
for component in ["cublas", "cudnn", "cuda_nvrtc"]:
    directory = Path(sysconfig.get_path("purelib")) / "nvidia" / component / "bin"
    if directory.is_dir():
        dll_handles.append(os.add_dll_directory(str(directory)))
        os.environ["PATH"] = str(directory) + os.pathsep + os.environ.get("PATH", "")

from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

rate = 16000
audio = decode_audio(str(args.audio), sampling_rate=rate)
if len(audio) != activity["decodedSampleCount"] or hashlib.sha256(audio.tobytes()).hexdigest() != activity["decodedMonoFloat32Sha256"]:
    raise ValueError("Actual decoded waveform differs from VAD source")
snapshot = args.base / "reconstruction/model-cache/models--Systran--faster-whisper-medium/snapshots" / MODEL_REVISION
if not (snapshot / "model.bin").is_file():
    raise ValueError("Frozen cached medium snapshot is missing; do not download another model")
model = WhisperModel(str(snapshot), device="cuda", compute_type="int8", cpu_threads=1, num_workers=1)
started = time.monotonic()
segments, probes, windows = [], [], []

if args.mode == "korean":
    inputs = [{"id": index + 1, "sourceEventId": index + 1,
               "startSample": event["startSample"], "endSample": min(event["startSample"] + 12 * rate, len(audio))}
              for index, event in enumerate(activity["chunks"]) if event["startSample"] >= 30 * rate]
else:
    korean_path = args.asr_output / "asr-medium-korean-announcements.json"
    korean = read(korean_path)
    if korean["sourceAudioSha256"] != args.audio_sha or korean["activitySha256"] != ref(activity_path)["sha256"]:
        raise ValueError("Actual Korean cue binding differs")
    inputs = recognition_windows(activity, korean, args.prepared['verification']['questionCount'])
    if not inputs:
        raise ValueError("No actual source-number windows; keep this source unresolved")

for window in inputs:
    start, end = window["startSample"], window["endSample"]
    clip = audio[start:end]
    detected, _ = model.transcribe(clip, beam_size=5, language="ko" if args.mode == "korean" else "en", task="transcribe",
                                  vad_filter=False, condition_on_previous_text=False, word_timestamps=False, multilingual=False)
    ids = []
    for segment in detected:
        if not segment.text.strip():
            continue
        item = {"id": len(segments) + 1, "text": segment.text.strip(),
                "estimatedStartSeconds": start / rate + segment.start, "estimatedEndSeconds": start / rate + segment.end,
                "uncertain": segment.avg_logprob < -1 or segment.compression_ratio > 2.4 or (segment.no_speech_prob > .6 and segment.avg_logprob < -.6),
                "avgLogProbability": segment.avg_logprob, "noSpeechProbability": segment.no_speech_prob,
                "compressionRatio": segment.compression_ratio, "localStartSeconds": segment.start, "localEndSeconds": segment.end}
        item.update({"probeId": window["id"], "sourceEventId": window["sourceEventId"]} if args.mode == "korean" else {"windowId": window["id"]})
        segments.append(item)
        ids.append(item["id"])
    actual = {**window, "sampleRate": rate, "decodedMonoFloat32Sha256": hashlib.sha256(clip.tobytes()).hexdigest(),
              "segmentIds": ids, "originalSourceAudioSha256": args.audio_sha}
    (probes if args.mode == "korean" else windows).append(actual)
    print(json.dumps({"stage": "strict-bounded-asr", "sourceRecordId": args.source_id, "mode": args.mode, "window": window["id"], "segments": len(ids)}), flush=True)

artifact = {"schemaVersion": 1, "createdAt": datetime.now(timezone.utc).isoformat(),
            "sourceAudioPath": str(args.audio), "sourceAudioSha256": args.audio_sha, "durationSeconds": len(audio) / rate,
            "model": "Systran/faster-whisper-medium", "modelSnapshotRevision": MODEL_REVISION,
            "engine": "faster-whisper", "engineVersion": version("faster-whisper"), "device": "cuda", "computeType": "int8",
            "cpuThreads": 1, "numWorkers": 1, "requestedLanguage": "ko" if args.mode == "korean" else "en", "task": "transcribe",
            "multilingual": False, "conditionOnPreviousText": False, "activityPath": str(activity_path), "activitySha256": ref(activity_path)["sha256"],
            "transcriptionSeconds": time.monotonic() - started, "humanReviewed": False, "originalAudioModified": False, "apiCostUsd": 0}
if args.mode == "korean":
    artifact["probes"] = probes
else:
    script_path = args.output / f"{args.source_id}.strict-script.json"
    artifact.update({"windows": windows, "koreanCuePath": str(korean_path), "koreanCueSha256": ref(korean_path)["sha256"],
                     "officialScriptPath": str(script_path), "officialScriptSha256": ref(script_path)["sha256"]})
artifact["segments"] = segments
atomic(destination, artifact)
print(json.dumps({"stage": "strict-asr-complete", "sourceRecordId": args.source_id, "mode": args.mode, "segments": len(segments), "seconds": round(artifact["transcriptionSeconds"], 2), "path": str(destination)}), flush=True)
