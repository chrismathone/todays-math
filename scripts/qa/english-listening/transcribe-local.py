"""Local original-audio ASR. Estimated timestamps never become exact audioRange."""

import argparse
import faulthandler
import hashlib
import json
import os
import sysconfig
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path


@contextmanager
def output_lock(destination):
    """OS lock is released even after a native crash; the sidecar is harmless."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    with open(str(destination) + ".lock", "a+b") as lock:
        if lock.tell() == 0:
            lock.write(b"0")
            lock.flush()
        started = time.monotonic()
        while True:
            try:
                lock.seek(0)
                if os.name == "nt":
                    import msvcrt

                    msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl

                    fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError:
                if time.monotonic() - started > 900:
                    raise TimeoutError("Another ASR worker holds the output lock")
                time.sleep(1)
        try:
            yield
        finally:
            lock.seek(0)
            if os.name == "nt":
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model-cache", required=True)
    parser.add_argument("--model", default="medium")
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--threads", type=int)
    parser.add_argument("--language", choices=["auto", "en", "ko"], default="auto")
    parser.add_argument("--multilingual", action="store_true")
    args = parser.parse_args()
    faulthandler.enable()
    if args.threads is None:
        args.threads = 1 if args.device == "cuda" else 4
    if not 1 <= args.threads <= 16:
        raise ValueError("ASR CPU threads must be 1..16")
    os.environ.setdefault("OMP_NUM_THREADS", str(args.threads))
    if args.device == "cuda" and os.name == "nt":
        # Official CT2 alternative to the asynchronous CUDA memory pool.
        os.environ.setdefault("CT2_CUDA_ALLOCATOR", "cub_caching")
    audio = Path(args.audio).resolve()
    destination = Path(args.output).resolve()
    if audio.stat().st_size > 64 * 1024 * 1024:
        raise ValueError("Original audio exceeds the application source cap")
    actual_hash = hashlib.sha256(audio.read_bytes()).hexdigest()
    if actual_hash != args.expected_sha256:
        raise ValueError("Original recording SHA differs")
    with output_lock(destination):
        if destination.exists():
            cached = json.loads(destination.read_text("utf8"))
            if cached["sourceAudioSha256"] != actual_hash:
                raise ValueError("Cached ASR belongs to a different original recording")
            print(
                json.dumps({"stage": "asr-reused", "output": str(destination)}),
                flush=True,
            )
            return
        # Official NVIDIA Windows CUDA/cuDNN wheels, scoped to this process.
        cuda_dll_handles = []
        if args.device == "cuda" and os.name == "nt":
            for component in ["cublas", "cudnn", "cuda_nvrtc"]:
                directory = (
                    Path(sysconfig.get_path("purelib")) / "nvidia" / component / "bin"
                )
                if directory.is_dir():
                    cuda_dll_handles.append(os.add_dll_directory(str(directory)))
                    os.environ["PATH"] = (
                        str(directory) + os.pathsep + os.environ.get("PATH", "")
                    )
        from faster_whisper import WhisperModel

        started = time.monotonic()
        # Reuse the already verified model snapshot without repeated HF network
        # checks or concurrent download thread pools on Windows.
        model_reference = args.model
        snapshot_revision = None
        repository = (
            Path(args.model_cache) / f"models--Systran--faster-whisper-{args.model}"
        )
        revision_file = repository / "refs" / "main"
        if revision_file.is_file():
            revision = revision_file.read_text("utf8").strip()
            if len(revision) == 40 and all(c in "0123456789abcdef" for c in revision):
                snapshot = repository / "snapshots" / revision
                if all(
                    (snapshot / filename).is_file()
                    for filename in ["model.bin", "config.json", "tokenizer.json"]
                ):
                    model_reference = str(snapshot)
                    snapshot_revision = revision
        model = WhisperModel(
            model_reference,
            device=args.device,
            compute_type=args.compute_type,
            cpu_threads=args.threads,
            num_workers=1,
            download_root=args.model_cache,
        )
        loaded = time.monotonic()
        segments, info = model.transcribe(
            str(audio),
            beam_size=5,
            language=None if args.language == "auto" else args.language,
            task="transcribe",
            vad_filter=True,
            condition_on_previous_text=False,
            word_timestamps=False,
            multilingual=args.multilingual,
        )
        if info.duration > 1800:
            raise ValueError(
                "Original audio exceeds the bounded 30 minute import limit"
            )
        results = []
        for item in segments:
            if not item.text.strip():
                continue
            results.append(
                {
                    "id": len(results) + 1,
                    "text": item.text.strip(),
                    "avgLogProbability": item.avg_logprob,
                    "noSpeechProbability": item.no_speech_prob,
                    "compressionRatio": item.compression_ratio,
                    "uncertain": item.avg_logprob < -1
                    or item.compression_ratio > 2.4
                    or (item.no_speech_prob > 0.6 and item.avg_logprob < -0.6),
                    "estimatedStartSeconds": item.start,
                    "estimatedEndSeconds": item.end,
                }
            )
            if len(results) % 30 == 0:
                print(
                    json.dumps(
                        {
                            "stage": "asr",
                            "segments": len(results),
                            "audioProgressSeconds": round(item.end, 1),
                            "elapsedSeconds": round(time.monotonic() - loaded, 1),
                        }
                    ),
                    flush=True,
                )
        payload = {
            "schemaVersion": 1,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "sourceAudioPath": str(audio),
            "sourceAudioSha256": actual_hash,
            "model": "Systran/faster-whisper-" + args.model,
            "modelSnapshotRevision": snapshot_revision,
            "engine": "faster-whisper",
            "engineVersion": version("faster-whisper"),
            "device": args.device,
            "computeType": args.compute_type,
            "cpuThreads": args.threads,
            "numWorkers": 1,
            "ompNumThreads": os.environ["OMP_NUM_THREADS"],
            "cudaAllocator": os.environ.get("CT2_CUDA_ALLOCATOR"),
            "requestedLanguage": args.language,
            "detectedLanguage": info.language,
            "languageProbability": info.language_probability,
            "multilingual": args.multilingual,
            "task": "transcribe",
            "languagePolicy": "ASR text is model transcription, not human reviewed.",
            "uncertaintyPolicy": "logprob < -1 OR compression > 2.4 OR (noSpeech > 0.6 AND logprob < -0.6); no-speech alone is not rejection.",
            "durationSeconds": info.duration,
            "modelLoadSeconds": round(loaded - started, 3),
            "transcriptionSeconds": round(time.monotonic() - loaded, 3),
            "estimatedTimestampPolicy": "ASR timestamps are estimates and never copied into exact audioRange.",
            "humanReviewed": False,
            "audioUploaded": False,
            "apiCostUsd": 0,
            "segments": results,
        }
        partial = Path(str(destination) + ".partial")
        partial.write_text(json.dumps(payload, ensure_ascii=False, indent=2), "utf8")
        for attempt in range(6):
            try:
                os.replace(partial, destination)
                break
            except PermissionError:
                if attempt == 5:
                    raise
                time.sleep(0.1 * (attempt + 1))
        print(
            json.dumps(
                {
                    "output": str(destination),
                    "sourceAudioSha256": actual_hash,
                    "segments": len(results),
                    "uncertainSegments": sum(item["uncertain"] for item in results),
                    "durationSeconds": info.duration,
                    "modelLoadSeconds": payload["modelLoadSeconds"],
                    "transcriptionSeconds": payload["transcriptionSeconds"],
                    "apiCostUsd": 0,
                }
            ),
            flush=True,
        )


if __name__ == "__main__":
    main()
