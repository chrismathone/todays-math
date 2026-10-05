"""Bounded recognition on the one converted original, on its own verified clock.

    <venv python> -u run_converted_probes.py --requests <round.json> --out <root>
        --lock <shared gpu-probe.lock> --model-cache <model cache> --owner <owner>
        --main <main checkout>

`ebs-middle-1-2006-2` was published as M4A; what plays is an authenticated MP3
whose decode is the frozen clock, bound to the original by the independent
verifier's nine-landmark proof. The existing runner (../claude/run_probes.py)
reads MPEG originals only and is not changed. This runner cuts every clip with
the verifier's own `codex/native-windows.mts` (read only), which re-checks the
original's hash, the proof, the playback hash and the full PCM against the
clock before it returns a single frame. Nothing is decoded from the M4A, nothing
is re-encoded, and no clip is kept.

Containers have the shape of the earlier converted rounds: the original's path
and hash, `playbackAudioPath`, `playbackSha256`, `convertedClockProof`, and the
playback PCM as `nativePcm`. Each probe has one fixed language, `ko` or `en`.
"""

import argparse
import base64
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
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

MODEL_REVISION = "08e178d48790749d25932bbc082711ddcfdfbc4f"
INPUT_RATE = 16000
POLL_SECONDS = 2
OVERFLOW_TOLERANCE_SECONDS = 0.02
WINDOW_BATCH = 100  # native-windows.mts refuses more than 128 clips at once


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_lock(runner):
    spec = importlib.util.spec_from_file_location("claude_run_probes", runner)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.GpuLock


def wave_header(frames, channels, rate):
    data = frames * channels * 2
    return (b"RIFF" + (36 + data).to_bytes(4, "little") + b"WAVEfmt " + (16).to_bytes(4, "little")
            + (1).to_bytes(2, "little") + channels.to_bytes(2, "little") + rate.to_bytes(4, "little")
            + (rate * channels * 2).to_bytes(4, "little") + (channels * 2).to_bytes(2, "little")
            + (16).to_bytes(2, "little") + b"data" + data.to_bytes(4, "little"))


def cut_windows(main, source, clock, probes):
    """Clips on the playback clock, from the verifier's own decode. Returns (measure, {id: clip})."""
    spec = {
        "root": str(main),
        "source": {
            "sourceRecordId": source["sourceRecordId"],
            "sourceAudioPath": source["sourceAudioPath"],
            "sourceAudioSha256": source["sourceAudioSha256"],
            "audio": {"sha256": source["playbackSha256"]},
        },
        "clock": clock,
        "probes": [
            {"id": p["id"], "startFrame": p["startFrame"], "frameCount": p["frameCount"],
             "maxDurationSeconds": 14 if p["frameCount"] <= 14 * source["sampleRate"] else 60}
            for p in probes
        ],
    }
    done = subprocess.run(
        ["node", str(main / "node_modules/tsx/dist/cli.mjs"),
         str(main / "scripts/qa/english-listening/whole-audio-seek/codex/native-windows.mts")],
        input=json.dumps(spec).encode("utf8"), capture_output=True, timeout=600,
    )
    if done.returncode != 0:
        raise RuntimeError(done.stderr.decode("utf8", errors="replace")[-1200:])
    measured = json.loads(done.stdout)
    if (measured["pcmSha256"] != clock["decodedInterleavedInt16Sha256"]
            or measured["frameCount"] != clock["frameCount"]
            or measured["durationMs"] != clock["durationMs"]
            or measured["playbackSha256"] != clock["playbackSha256"]
            or measured["sampleRate"] != clock["sampleRate"]
            or measured["channels"] != clock["channels"]
            or measured.get("convertedClockProof") != clock["convertedClockProof"]):
        raise RuntimeError("Converted decode is not the frozen playback clock")
    clips = {clip["id"]: clip for clip in measured.pop("probes")}
    measured.pop("energyBase64", None)
    return measured, clips


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--requests", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--lock", required=True)
    parser.add_argument("--model-cache", required=True)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--main", required=True)
    parser.add_argument("--max-wait-seconds", type=int, default=6 * 3600)
    args = parser.parse_args()
    faulthandler.enable()
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("CT2_CUDA_ALLOCATOR", "cub_caching")

    main_root = Path(args.main).resolve()
    request_path = Path(args.requests).resolve()
    request_bytes = request_path.read_bytes()
    request = json.loads(request_bytes)
    out = Path(args.out).resolve()
    round_id = request["round"]
    if len(request["sources"]) != 1:
        raise ValueError("A converted round holds the converted source alone")
    source = request["sources"][0]
    if source.get("decodedFrom") != "converted-playback-mp3":
        raise ValueError("This runner is for the converted playback clock only")
    destination = out / "probes" / f"round-{round_id}" / f"{source['sourceRecordId']}.json"
    if destination.exists():
        print(json.dumps({"stage": "probe-queue", "round": round_id, "pendingSources": 0}), flush=True)
        return

    # The clock record the request was planned on, by hash; the proof it names, by hash.
    clock_ref = request["inputs"]["clock"]
    if sha256_file(clock_ref["path"]) != clock_ref["sha256"]:
        raise ValueError("Clock file changed")
    clock = next(r for r in json.loads(Path(clock_ref["path"]).read_text("utf8"))["records"]
                 if r["sourceRecordId"] == source["sourceRecordId"])
    proof_ref = clock.get("convertedClockProof")
    if (clock["status"] != "passed" or clock["sourceToPlaybackOffsetMs"] != 0 or not proof_ref
            or proof_ref != source["convertedClockProof"]
            or sha256_file(proof_ref["path"]) != proof_ref["sha256"]
            or clock["sourceAudioSha256"] != source["sourceAudioSha256"]
            or clock["playbackSha256"] != source["playbackSha256"]
            or clock["decodedInterleavedInt16Sha256"] != source["pcmSha256"]
            or clock["frameCount"] != source["frameCount"]
            or clock["sampleRate"] != source["sampleRate"]
            or clock["channels"] != source["channels"]):
        raise ValueError("Request is not on the verified converted clock")
    proof = json.loads(Path(proof_ref["path"]).read_text("utf8"))
    if (Path(proof["playback"]["path"]).resolve() != Path(source["playbackAudioPath"]).resolve()
            or proof["playback"]["sha256"] != source["playbackSha256"]
            or proof["original"]["sha256"] != source["sourceAudioSha256"]):
        raise ValueError("Request names another playback or original than the proof")
    snapshot = Path(args.model_cache) / "models--Systran--faster-whisper-medium" / "snapshots" / MODEL_REVISION
    if not (snapshot / "model.bin").is_file():
        raise ValueError("Frozen cached medium snapshot is missing; do not download another model")

    wanted = source["probes"]
    for probe in wanted:
        if probe.get("language", request["language"]) not in ("ko", "en"):
            raise ValueError("Probe language must be ko or en")
    print(json.dumps({"stage": "probe-queue", "round": round_id, "pendingSources": 1,
                      "pendingProbes": len(wanted)}), flush=True)

    for component in ["cublas", "cudnn", "cuda_nvrtc"]:
        directory = Path(sysconfig.get_path("purelib")) / "nvidia" / component / "bin"
        if directory.is_dir():
            os.add_dll_directory(str(directory))
            os.environ["PATH"] = str(directory) + os.pathsep + os.environ.get("PATH", "")
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio

    runner = main_root / "scripts/qa/english-listening/whole-audio-seek/claude/run_probes.py"
    lock = load_lock(runner)(args.lock, args.owner)
    tmp = out / "tmp" / f"round-{round_id}" / source["sourceRecordId"]
    if tmp.exists():
        raise RuntimeError("Temporary converted clip dir already exists")
    probes = []
    measure = None
    extract_seconds = gpu_seconds = lock_wait = 0.0
    model = None
    try:
        for offset in range(0, len(wanted), WINDOW_BATCH):
            batch = wanted[offset:offset + WINDOW_BATCH]
            started = time.monotonic()
            measure, clips = cut_windows(main_root, source, clock, batch)
            extract_seconds += time.monotonic() - started
            waited = time.monotonic()
            if not lock.held:
                lock.announce_waiting()
                while not lock.try_acquire():
                    if time.monotonic() - waited > args.max_wait_seconds:
                        raise TimeoutError("GPU lock stayed busy; it was not touched")
                    time.sleep(POLL_SECONDS)
                lock.withdraw_waiting()
            lock_wait += time.monotonic() - waited
            if model is None:
                model = WhisperModel(str(snapshot), device="cuda", compute_type="int8", cpu_threads=1, num_workers=1)
            started = time.monotonic()
            tmp.mkdir(parents=True, exist_ok=True)
            for probe in batch:
                clip = clips[probe["id"]]
                pcm = base64.b64decode(clip["pcmBase64"])
                if (hashlib.sha256(pcm).hexdigest() != clip["clipPcmSha256"]
                        or clip["startFrame"] != probe["startFrame"]
                        or len(pcm) != probe["frameCount"] * source["channels"] * 2):
                    raise RuntimeError("Clip differs from its request")
                wav_path = tmp / f"probe-{probe['id']}.wav"
                wav_path.write_bytes(wave_header(probe["frameCount"], source["channels"], source["sampleRate"]) + pcm)
                audio = decode_audio(str(wav_path), sampling_rate=INPUT_RATE)
                wav_path.unlink()
                duration = probe["frameCount"] / source["sampleRate"]
                language = probe.get("language", request["language"])
                detected, _ = model.transcribe(
                    audio, beam_size=5, language=language, task="transcribe", vad_filter=False,
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
                        "words": [{"text": word.word, "localStartSeconds": float(word.start),
                                   "localEndSeconds": float(word.end), "probability": float(word.probability)}
                                  for word in (segment.words or [])],
                    })
                probes.append({
                    **probe,
                    "sampleRate": source["sampleRate"],
                    "channels": source["channels"],
                    "durationSeconds": float(duration),
                    "requestedLanguage": language,
                    "clipPcmSha256": clip["clipPcmSha256"],
                    "inputSampleRate": INPUT_RATE,
                    "inputSampleCount": int(len(audio)),
                    "inputMonoFloat32Sha256": hashlib.sha256(audio.tobytes()).hexdigest(),
                    "latestRecognizedEndSeconds": latest,
                    "overflow": bool(latest > duration + OVERFLOW_TOLERANCE_SECONDS),
                    "segments": segments,
                })
                del pcm, audio
            gpu_seconds += time.monotonic() - started
            del clips
    finally:
        # The model is resident only while the lock is held: unload before release.
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
        if tmp.exists():
            for child in tmp.iterdir():
                child.unlink()
            tmp.rmdir()

    artifact = {
        "schemaVersion": 1,
        "provider": request["provider"],
        "round": round_id,
        "createdAt": utc_now(),
        "requestPath": str(request_path),
        "requestSha256": hashlib.sha256(request_bytes).hexdigest(),
        "inventorySha256": request["inventorySha256"],
        "sourceRecordId": source["sourceRecordId"],
        "sourceAudioPath": source["sourceAudioPath"],
        "sourceAudioSha256": source["sourceAudioSha256"],
        "decodedFrom": "converted-playback-mp3",
        "playbackAudioPath": source["playbackAudioPath"],
        "playbackSha256": source["playbackSha256"],
        "convertedClockProof": source["convertedClockProof"],
        "nativePcm": {"sampleRate": source["sampleRate"], "channels": source["channels"],
                      "frameCount": source["frameCount"], "sha256": source["pcmSha256"],
                      "durationMs": clock["durationMs"], "energySha256": measure["energySha256"]},
        "clipClock": "PCM16 frames of the verified converted playback MP3, cut by codex/native-windows.mts; the original m4a was hashed and not decoded; probe startFrame is a playback frame at offset 0",
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
        "requestedLanguage": request["language"],
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
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = Path(str(destination) + ".partial")
    partial.write_text(json.dumps(artifact, ensure_ascii=False, indent=1), "utf8")
    if destination.exists():
        raise FileExistsError(destination)
    os.replace(partial, destination)
    print(json.dumps({"stage": "probe-queue-complete", "round": round_id, "sources": 1, "probes": len(probes),
                      "overflow": sum(p["overflow"] for p in probes), "gpuSeconds": round(gpu_seconds, 1),
                      "extractSeconds": round(extract_seconds, 1), "lockWaitSeconds": round(lock_wait, 1)}), flush=True)


if __name__ == "__main__":
    sys.exit(main())
