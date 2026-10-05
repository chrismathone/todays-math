"""Recognize the converted 2006-2 playback clips on the shared GPU lock.

The original file stays the m4a. Codex native-windows.mts verifies the
nine-landmark zero-offset proof and decodes the playback MP3. This runner
does not call Claude's MPEG extractor and does not edit that runner.
"""
import faulthandler
import gc
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import sysconfig
import time
import wave
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

MODEL_REVISION = "08e178d48790749d25932bbc082711ddcfdfbc4f"
INPUT_RATE = 16000
POLL_SECONDS = 2
OVERFLOW_TOLERANCE_SECONDS = 0.02
SOURCE_ID = "ebs-middle-1-2006-2"
PLAYBACK_SHA = "6e6992f5b967db06dbb2139f52dad0d4f1b028a348ba1813c3d7e8ad35430e9d"
PCM_SHA = "da5211d79f76afaca3742168bbdf69c72d5729ad5d9dca4ca06a6cdf2f655296"
FRAME_COUNT = 43975680
DURATION_MS = 916160
ENERGY_SHA = "ff01e145dbf51cbdba1e9ca42d8636aa3a71f6d3e964e5028f03edb07ba73da5"

ROOT = Path("C:/Creative/testautocreator")
OUT = ROOT / "output/listening-assessments/whole-audio-seek-20261005/grok"
ROUND_ID = sys.argv[1] if len(sys.argv) > 1 else ""
REQUEST = OUT / "probe-requests" / f"round-{ROUND_ID}.json"
CLOCK = ROOT / "output/listening-assessments/whole-audio-seek-20261005/codex/complete-native-clock.json"
NATIVE_WINDOWS = ROOT / "scripts/qa/english-listening/whole-audio-seek/codex/native-windows.mts"
TSX = ROOT / "node_modules/tsx/dist/cli.mjs"
LOCK = ROOT / "output/listening-assessments/whole-audio-seek-20261005/gpu-probe.lock"
MODEL_CACHE = ROOT / "output/listening-assessments/reconstruction/model-cache"
CLAUDE_RUNNER = ROOT / "scripts/qa/english-listening/whole-audio-seek/claude/run_probes.py"
OWNER = "offline:converted-audio-seek"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def load_lock():
    spec = importlib.util.spec_from_file_location("claude_run_probes", CLAUDE_RUNNER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.GpuLock


def main():
    faulthandler.enable()
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("CT2_CUDA_ALLOCATOR", "cub_caching")
    if len(ROUND_ID) != 3 or not ROUND_ID.isdigit():
        raise RuntimeError("Usage: runConvertedProbes.py <round>")
    request_bytes = REQUEST.read_bytes()
    request = json.loads(request_bytes)
    if request.get("round") != ROUND_ID or len(request["sources"]) != 1:
        raise RuntimeError("Converted round must contain only the converted source")
    source = request["sources"][0]
    if source["sourceRecordId"] != SOURCE_ID or source["frameCount"] != FRAME_COUNT:
        raise RuntimeError("Round 010 source is not the measured 2006-2 clock")
    if source["sampleRate"] != 48000 or source["pcmSha256"] != PCM_SHA:
        raise RuntimeError("Round 010 PCM clock does not match the measurement")
    if source["playbackSha256"] != PLAYBACK_SHA or source.get("decodedFrom") != "converted-playback-mp3":
        raise RuntimeError("Round 010 is not the converted playback")
    if not 1 <= len(source["probes"]) <= 128:
        raise RuntimeError("Converted probe count is outside 1..128")
    clock_file = json.loads(CLOCK.read_text("utf8"))
    clock = next(item for item in clock_file["records"] if item["sourceRecordId"] == SOURCE_ID)
    if clock["status"] != "passed" or clock["frameCount"] != FRAME_COUNT or clock["durationMs"] != DURATION_MS:
        raise RuntimeError("Codex clock for 2006-2 is not the passed playback clock")
    if clock["playbackSha256"] != PLAYBACK_SHA or clock["decodedInterleavedInt16Sha256"] != PCM_SHA:
        raise RuntimeError("Codex clock hashes differ from the measurement")
    if clock["sourceToPlaybackOffsetMs"] != 0 or clock["convertedClockProof"] != source["convertedClockProof"]:
        raise RuntimeError("Converted proof reference differs")
    snapshot = MODEL_CACHE / "models--Systran--faster-whisper-medium" / "snapshots" / MODEL_REVISION
    if not (snapshot / "model.bin").is_file():
        raise RuntimeError("Frozen cached medium snapshot is missing")

    spec = {
        "root": str(ROOT),
        "source": {
            "sourceRecordId": SOURCE_ID,
            "sourceAudioPath": source["sourceAudioPath"],
            "sourceAudioSha256": source["sourceAudioSha256"],
            "audio": {"sha256": PLAYBACK_SHA},
        },
        "clock": clock,
        "probes": [
            {"id": probe["id"], "startFrame": probe["startFrame"], "frameCount": probe["frameCount"], "maxDurationSeconds": 14}
            for probe in source["probes"]
        ],
    }
    started = time.monotonic()
    completed = subprocess.run(
        ["node", str(TSX), str(NATIVE_WINDOWS)],
        input=json.dumps(spec).encode("utf8"),
        capture_output=True,
        timeout=300,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.decode("utf8", errors="replace")[-1000:])
    measured = json.loads(completed.stdout)
    if measured["pcmSha256"] != PCM_SHA or measured["frameCount"] != FRAME_COUNT or measured["durationMs"] != DURATION_MS:
        raise RuntimeError("Converted decode drifted from the measured clock")
    if measured["energySha256"] != ENERGY_SHA or measured["playbackSha256"] != PLAYBACK_SHA:
        raise RuntimeError("Converted energy or playback hash drifted")
    if measured["sampleRate"] != 48000 or measured["channels"] != source["channels"]:
        raise RuntimeError("Converted decode clock is not 48000 Hz stereo")
    clips = {clip["id"]: clip for clip in measured.pop("probes")}
    del measured
    extract_seconds = time.monotonic() - started
    print(json.dumps({"stage": "converted-extract", "probes": len(clips), "extractSeconds": round(extract_seconds, 1)}), flush=True)

    for component in ["cublas", "cudnn", "cuda_nvrtc"]:
        directory = Path(sysconfig.get_path("purelib")) / "nvidia" / component / "bin"
        if directory.is_dir():
            os.add_dll_directory(str(directory))
            os.environ["PATH"] = str(directory) + os.pathsep + os.environ.get("PATH", "")
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio

    lock = load_lock()(LOCK, OWNER)
    lock.announce_waiting()
    waited = time.monotonic()
    while not lock.try_acquire():
        if time.monotonic() - waited > 6 * 3600:
            raise TimeoutError("GPU lock stayed busy")
        time.sleep(POLL_SECONDS)
    lock.withdraw_waiting()
    lock_wait = time.monotonic() - waited
    model = None
    try:
        model = WhisperModel(str(snapshot), device="cuda", compute_type="int8", cpu_threads=1, num_workers=1)
        gpu_started = time.monotonic()
        probes = []
        tmp = OUT / "tmp" / f"round-{ROUND_ID}" / SOURCE_ID
        if tmp.exists():
            raise RuntimeError("Temporary converted clip dir already exists")
        tmp.mkdir(parents=True)
        try:
            for wanted in source["probes"]:
                clip = clips[wanted["id"]]
                pcm = __import__("base64").b64decode(clip["pcmBase64"])
                if hashlib.sha256(pcm).hexdigest() != clip["clipPcmSha256"]:
                    raise RuntimeError("Clip PCM hash drifted")
                if len(pcm) != wanted["frameCount"] * source["channels"] * 2:
                    raise RuntimeError("Clip PCM length drifted")
                header = wave_header(wanted["frameCount"], source["channels"], source["sampleRate"])
                wav_path = tmp / f"probe-{wanted['id']}.wav"
                wav_path.write_bytes(header + pcm)
                audio = decode_audio(str(wav_path), sampling_rate=INPUT_RATE)
                wav_path.unlink()
                duration = wanted["frameCount"] / source["sampleRate"]
                detected, _info = model.transcribe(
                    audio, beam_size=5, language="ko", task="transcribe", vad_filter=False,
                    condition_on_previous_text=False, word_timestamps=True, multilingual=False,
                )
                segments = []
                latest = 0.0
                for segment in detected:
                    if not segment.text.strip():
                        continue
                    latest = max(latest, float(segment.end))
                    segments.append({
                        "id": len(segments) + 1,
                        "text": segment.text.strip(),
                        "localStartSeconds": float(segment.start),
                        "localEndSeconds": float(segment.end),
                        "avgLogProbability": float(segment.avg_logprob),
                        "noSpeechProbability": float(segment.no_speech_prob),
                        "compressionRatio": float(segment.compression_ratio),
                        "uncertain": bool(segment.avg_logprob < -1 or segment.compression_ratio > 2.4
                                          or (segment.no_speech_prob > 0.6 and segment.avg_logprob < -0.6)),
                        "words": [{
                            "text": word.word,
                            "localStartSeconds": float(word.start),
                            "localEndSeconds": float(word.end),
                            "probability": float(word.probability),
                        } for word in (segment.words or [])],
                    })
                probes.append({
                    **wanted,
                    "sampleRate": source["sampleRate"],
                    "channels": source["channels"],
                    "durationSeconds": float(duration),
                    "requestedLanguage": "ko",
                    "clipPcmSha256": clip["clipPcmSha256"],
                    "inputSampleRate": INPUT_RATE,
                    "inputSampleCount": int(len(audio)),
                    "inputMonoFloat32Sha256": hashlib.sha256(audio.tobytes()).hexdigest(),
                    "latestRecognizedEndSeconds": latest,
                    "overflow": bool(latest > duration + OVERFLOW_TOLERANCE_SECONDS),
                    "segments": segments,
                })
                del pcm, audio
        finally:
            if tmp.exists():
                for child in tmp.iterdir():
                    child.unlink()
                tmp.rmdir()
        gpu_seconds = time.monotonic() - gpu_started
        artifact = {
            "schemaVersion": 1,
            "provider": "grok",
            "round": ROUND_ID,
            "createdAt": utc_now(),
            "requestPath": str(REQUEST),
            "requestSha256": hashlib.sha256(request_bytes).hexdigest(),
            "inventorySha256": request["inventorySha256"],
            "sourceRecordId": SOURCE_ID,
            "sourceAudioPath": source["sourceAudioPath"],
            "sourceAudioSha256": source["sourceAudioSha256"],
            "decodedFrom": "converted-playback-mp3",
            "playbackAudioPath": source["playbackAudioPath"],
            "playbackSha256": PLAYBACK_SHA,
            "convertedClockProof": source["convertedClockProof"],
            "nativePcm": {
                "sampleRate": 48000,
                "channels": source["channels"],
                "frameCount": FRAME_COUNT,
                "sha256": PCM_SHA,
                "durationMs": DURATION_MS,
                "energySha256": ENERGY_SHA,
            },
            "clipClock": "48000 Hz PCM16 frames of the verified converted playback MP3; the original m4a was hashed and not decoded; probe startFrame is a playback frame at offset 0",
            "inputPreparation": "exact native PCM16 clip -> faster_whisper.audio.decode_audio(16000 Hz mono float32)",
            "model": "Systran/faster-whisper-medium",
            "modelSnapshotRevision": MODEL_REVISION,
            "engine": "faster-whisper",
            "engineVersion": version("faster-whisper"),
            "ctranslate2Version": version("ctranslate2"),
            "avVersion": version("av"),
            "device": "cuda",
            "computeType": "int8",
            "beamSize": 5,
            "requestedLanguage": "ko",
            "task": "transcribe",
            "vadFilter": False,
            "conditionOnPreviousText": False,
            "wordTimestamps": True,
            "multilingual": False,
            "uncertaintyPolicy": "logprob < -1 OR compression > 2.4 OR (noSpeech > 0.6 AND logprob < -0.6)",
            "overflowPolicy": f"recognized end > real duration + {OVERFLOW_TOLERANCE_SECONDS}s marks the probe; times are never clamped",
            "estimatedTimestampPolicy": "Model times are estimates local to the probe; the seek start is the measured native frame, not a model time.",
            "extractSeconds": round(extract_seconds, 3),
            "lockWaitSeconds": round(lock_wait, 3),
            "gpuSeconds": round(gpu_seconds, 3),
            "humanReviewed": False,
            "originalAudioModified": False,
            "audioUploaded": False,
            "apiCostUsd": 0,
            "probes": probes,
        }
        destination = OUT / "probes" / f"round-{ROUND_ID}" / f"{SOURCE_ID}.json"
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            raise FileExistsError(destination)
        partial = destination.with_suffix(".json.partial")
        partial.write_text(json.dumps(artifact, ensure_ascii=False, indent=1), "utf8")
        os.replace(partial, destination)
        print(json.dumps({
            "stage": "probe-source",
            "sourceRecordId": SOURCE_ID,
            "probes": len(probes),
            "overflow": sum(probe["overflow"] for probe in probes),
            "gpuSeconds": round(gpu_seconds, 1),
            "extractSeconds": round(extract_seconds, 1),
            "lockWaitSeconds": round(lock_wait, 1),
        }), flush=True)
    finally:
        if model is not None:
            try:
                model.model.unload_model()
            except Exception:
                pass
            del model
            gc.collect()
        if lock.held:
            lock.release()
        lock.withdraw_waiting()


def wave_header(frames, channels, rate):
    import struct
    data_bytes = frames * channels * 2
    return struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_bytes, b"WAVE", b"fmt ", 16, 1, channels, rate,
        rate * channels * 2, channels * 2, 16, b"data", data_bytes,
    )


if __name__ == "__main__":
    main()
