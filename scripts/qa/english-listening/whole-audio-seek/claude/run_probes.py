"""Bounded Korean recognition probes on exact native clips. One GPU model at a time.

    <venv python> -u run_probes.py --requests <round.json> --out <claude output dir>
        --lock <shared gpu-probe.lock> --model-cache <model cache> --owner claude:<dispatch>

Each source is one batch: its clips are cut from the native PCM by
extract-clips.mjs (the same clock the seek starts are stated on), recognized under
the shared exclusive GPU lock, written once, and the temporary clips are deleted.
Recognized text and model timestamps are stored exactly as returned. A probe whose
recognized times run past its real duration is marked as overflow; nothing is
clamped. No original file, cache or database is written.
"""

import argparse
import ctypes
import faulthandler
import gc
import hashlib
import json
import os
import shutil
import subprocess
import sys
import sysconfig
import time
import wave
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

MODEL_REVISION = "08e178d48790749d25932bbc082711ddcfdfbc4f"
INPUT_RATE = 16000
POLL_SECONDS = 2
YIELD_SECONDS = 3
OVERFLOW_TOLERANCE_SECONDS = 0.02


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def process_alive(pid):
    """Never os.kill(pid, 0) on Windows: that terminates the process."""
    if os.name != "nt":
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        except PermissionError:
            return True
        return True
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.GetExitCodeProcess.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_ulong)]
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    handle = kernel.OpenProcess(0x1000, False, int(pid))
    if not handle:
        # Access denied means it exists; anything else means it is gone.
        return ctypes.get_last_error() == 5
    try:
        code = ctypes.c_ulong()
        if not kernel.GetExitCodeProcess(handle, ctypes.byref(code)):
            return True
        return code.value == 259
    finally:
        kernel.CloseHandle(handle)


class GpuLock:
    """Atomic create with owner identity. A live owner's lock is never removed."""

    def __init__(self, path, owner):
        self.path = Path(path)
        self.owner = owner
        self.held = False

    def try_acquire(self):
        body = json.dumps(
            {"owner": self.owner, "pid": os.getpid(), "host": os.environ.get("COMPUTERNAME"), "acquiredAt": utc_now()}
        ).encode("utf8")
        try:
            descriptor = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            self._set_aside_if_dead()
            return False
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(body)
        self.held = True
        return True

    def _set_aside_if_dead(self):
        try:
            current = json.loads(self.path.read_text("utf8"))
        except (OSError, ValueError):
            return
        same_host = current.get("host") == os.environ.get("COMPUTERNAME")
        if not same_host or not isinstance(current.get("pid"), int) or process_alive(current["pid"]):
            return
        aside = self.path.with_name(self.path.name + f".dead-{current['pid']}-{int(time.time())}")
        try:
            os.replace(self.path, aside)
        except OSError:
            pass

    def release(self):
        if not self.held:
            return
        current = json.loads(self.path.read_text("utf8"))
        if current.get("pid") != os.getpid() or current.get("owner") != self.owner:
            raise RuntimeError("GPU lock is no longer ours; refusing to remove it")
        os.remove(self.path)
        self.held = False

    # A waiter says so with its own small marker beside the lock. The holder keeps
    # the GPU across batches only while nobody waits; it never needs to guess.

    def _marker(self):
        return self.path.with_name(self.path.name + f".waiting-{os.getpid()}")

    def announce_waiting(self):
        if self.held or self._marker().exists():
            return
        self._marker().write_text(
            json.dumps({"owner": self.owner, "pid": os.getpid(), "host": os.environ.get("COMPUTERNAME"), "since": utc_now()}),
            "utf8",
        )

    def withdraw_waiting(self):
        try:
            os.remove(self._marker())
        except FileNotFoundError:
            pass

    def others_waiting(self):
        for marker in self.path.parent.glob(self.path.name + ".waiting-*"):
            try:
                other = json.loads(marker.read_text("utf8"))
            except (OSError, ValueError):
                continue
            if other.get("pid") == os.getpid():
                continue
            same_host = other.get("host") == os.environ.get("COMPUTERNAME")
            if same_host and isinstance(other.get("pid"), int) and not process_alive(other["pid"]):
                # A marker is not the lock; a dead waiter's marker is just litter.
                try:
                    os.remove(marker)
                except OSError:
                    pass
                continue
            return True
        return False


def read_wave(path):
    with wave.open(str(path), "rb") as handle:
        if handle.getsampwidth() != 2 or handle.getcomptype() != "NONE":
            raise ValueError("Probe clip is not PCM16")
        return handle.getframerate(), handle.getnchannels(), handle.getnframes(), handle.readframes(handle.getnframes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--requests", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--lock", required=True)
    parser.add_argument("--model-cache", required=True)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--node", default="node")
    parser.add_argument("--source-id", action="append")
    parser.add_argument("--max-sources", type=int)
    parser.add_argument("--max-wait-seconds", type=int, default=6 * 3600)
    # A hand-over happens at a source boundary once this many probes ran in the
    # current hold, so a round of many small sources is one source-sized batch
    # per turn rather than one model reload per handful of probes.
    parser.add_argument("--min-probes-per-hold", type=int, default=30)
    args = parser.parse_args()
    faulthandler.enable()
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("CT2_CUDA_ALLOCATOR", "cub_caching")

    request_path = Path(args.requests).resolve()
    request_bytes = request_path.read_bytes()
    request = json.loads(request_bytes)
    out = Path(args.out).resolve()
    round_id = request["round"]
    result_dir = out / "probes" / f"round-{round_id}"
    result_dir.mkdir(parents=True, exist_ok=True)
    tmp_root = out / "tmp" / f"round-{round_id}"
    extractor = Path(__file__).resolve().parent / "extract-clips.mjs"
    snapshot = Path(args.model_cache) / "models--Systran--faster-whisper-medium" / "snapshots" / MODEL_REVISION
    if not (snapshot / "model.bin").is_file():
        raise ValueError("Frozen cached medium snapshot is missing; do not download another model")

    pending = [
        source
        for source in request["sources"]
        if source["probes"]
        and (not args.source_id or source["sourceRecordId"] in args.source_id)
        and not (result_dir / f"{source['sourceRecordId']}.json").exists()
    ]
    if args.max_sources:
        pending = pending[: args.max_sources]
    print(json.dumps({"stage": "probe-queue", "round": round_id, "pendingSources": len(pending),
                      "pendingProbes": sum(len(s["probes"]) for s in pending)}), flush=True)
    if not pending:
        return

    for component in ["cublas", "cudnn", "cuda_nvrtc"]:
        directory = Path(sysconfig.get_path("purelib")) / "nvidia" / component / "bin"
        if directory.is_dir():
            os.add_dll_directory(str(directory))
            os.environ["PATH"] = str(directory) + os.pathsep + os.environ.get("PATH", "")
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio

    def extract(source):
        tmp = tmp_root / source["sourceRecordId"]
        if tmp.exists():
            shutil.rmtree(tmp)
        tmp.mkdir(parents=True)
        started = time.monotonic()
        subprocess.run(
            [args.node, str(extractor), "--requests", str(request_path), "--source-id", source["sourceRecordId"], "--tmp", str(tmp)],
            check=True, stdout=subprocess.DEVNULL,
        )
        return tmp, json.loads((tmp / "clips.json").read_text("utf8")), time.monotonic() - started

    lock = GpuLock(args.lock, args.owner)
    state = {"model": None}
    model_loads = 0

    def unload():
        """The model is resident only while the lock is held: always before a release."""
        model = state["model"]
        if model is None:
            return
        state["model"] = None
        try:
            model.model.unload_model()
        except Exception:
            pass
        del model
        gc.collect()

    pool = ThreadPoolExecutor(max_workers=1)
    # Say that we wait before the first clip is even cut, so a holder can hand over.
    lock.announce_waiting()
    upcoming = pool.submit(extract, pending[0])
    run_started = time.monotonic()
    done_probes = 0
    probes_in_hold = 0
    try:
        for index, source in enumerate(pending):
            tmp, manifest, extract_seconds = upcoming.result()
            if index + 1 < len(pending):
                upcoming = pool.submit(extract, pending[index + 1])
            if manifest["sourceAudioSha256"] != source["sourceAudioSha256"] or manifest["pcmSha256"] != source["pcmSha256"]:
                raise ValueError("Extracted clips belong to another original")
            waited = time.monotonic()
            if not lock.held:
                lock.announce_waiting()
                while not lock.try_acquire():
                    if time.monotonic() - waited > args.max_wait_seconds:
                        raise TimeoutError("GPU lock stayed busy; it was not touched")
                    time.sleep(POLL_SECONDS)
                lock.withdraw_waiting()
                probes_in_hold = 0
            lock_wait = time.monotonic() - waited
            if True:
                if state["model"] is None:
                    state["model"] = WhisperModel(str(snapshot), device="cuda", compute_type="int8", cpu_threads=1, num_workers=1)
                    model_loads += 1
                model = state["model"]
                started = time.monotonic()
                probes = []
                by_id = {clip["id"]: clip for clip in manifest["clips"]}
                for wanted in source["probes"]:
                    clip = by_id[wanted["id"]]
                    rate, channels, frames, pcm = read_wave(clip["file"])
                    if (rate, channels, frames) != (source["sampleRate"], source["channels"], wanted["frameCount"]) \
                            or clip["startFrame"] != wanted["startFrame"] \
                            or hashlib.sha256(pcm).hexdigest() != clip["clipPcmSha256"]:
                        raise ValueError("Probe clip differs from its request")
                    audio = decode_audio(clip["file"], sampling_rate=INPUT_RATE)
                    duration = frames / rate
                    # One fixed language per probe: the round's, or the probe's own.
                    language = wanted.get("language", request["language"])
                    if language not in ("ko", "en"):
                        raise ValueError("Probe language must be ko or en")
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
                            "words": [{"text": word.word, "localStartSeconds": float(word.start), "localEndSeconds": float(word.end),
                                       "probability": float(word.probability)} for word in (segment.words or [])],
                        })
                    probes.append({
                        **wanted,
                        "sampleRate": rate,
                        "channels": channels,
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
                gpu_seconds = time.monotonic() - started
                del model
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
                "nativePcm": {"sampleRate": source["sampleRate"], "channels": source["channels"],
                              "frameCount": source["frameCount"], "sha256": source["pcmSha256"]},
                "clipClock": "native PCM16 frames of the original decoded with mpg123 (gapless); probe startFrame is a source frame",
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
            destination = result_dir / f"{source['sourceRecordId']}.json"
            partial = Path(str(destination) + ".partial")
            partial.write_text(json.dumps(artifact, ensure_ascii=False, indent=1), "utf8")
            if destination.exists():
                raise FileExistsError(destination)
            os.replace(partial, destination)
            shutil.rmtree(tmp)
            done_probes += len(probes)
            print(json.dumps({
                "stage": "probe-source", "sourceRecordId": source["sourceRecordId"], "probes": len(probes),
                "overflow": sum(p["overflow"] for p in probes), "gpuSeconds": round(gpu_seconds, 1),
                "extractSeconds": round(extract_seconds, 1), "lockWaitSeconds": round(lock_wait, 1),
                "done": index + 1, "of": len(pending), "doneProbes": done_probes,
                "elapsedSeconds": round(time.monotonic() - run_started, 1), "modelLoads": model_loads,
            }), flush=True)
            probes_in_hold += len(probes)
            if (index + 1 < len(pending) and probes_in_hold >= args.min_probes_per_hold
                    and lock.others_waiting()):
                # Hand the GPU over between source-sized batches: unload first,
                # then release, then stay away long enough for a waiter to take it.
                unload()
                lock.release()
                lock.announce_waiting()
                time.sleep(YIELD_SECONDS)
    finally:
        # Also on any error: never leave a resident model behind a released lock.
        unload()
        if lock.held:
            lock.release()
        lock.withdraw_waiting()
        pool.shutdown(wait=False, cancel_futures=True)
    print(json.dumps({"stage": "probe-queue-complete", "round": round_id, "sources": len(pending), "probes": done_probes,
                      "elapsedSeconds": round(time.monotonic() - run_started, 1)}), flush=True)


if __name__ == "__main__":
    sys.exit(main())
