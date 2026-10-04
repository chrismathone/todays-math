"""Actual padded/unpadded Silero activity, PCM hash, and original script snapshot."""

import hashlib
from datetime import datetime, timezone

from faster_whisper.audio import decode_audio
from faster_whisper.vad import VadOptions, get_speech_timestamps
from strict_stage_support import atomic, context, read, ref

args = context(__doc__)
original_script = args.base / "question-alignment" / f"{args.source_id}.strict-script.json"
script = read(original_script)
transcript = "\n".join(group["transcript"]["text"] for group in args.prepared["editableInput"]["groups"])
if script["sourceAudioSha256"] != args.audio_sha or script["sourceTranscriptText"] != transcript:
    raise ValueError("Official transcript snapshot differs from the actual prepared source")
script_path = args.output / original_script.name
if not script_path.exists():
    atomic(script_path, script)
elif read(script_path) != script:
    raise ValueError("The staged script snapshot differs")

raw_path = args.output / f"{args.source_id}.audio-activity.json"
if raw_path.exists():
    raw = read(raw_path)
    if raw["sourceAudioSha256"] != args.audio_sha:
        raise ValueError("Cached activity source differs")
else:
    rate = 16000
    audio = decode_audio(str(args.audio), sampling_rate=rate)
    padded = get_speech_timestamps(audio, VadOptions(min_silence_duration_ms=2000, speech_pad_ms=400), rate)
    unpadded = get_speech_timestamps(audio, VadOptions(min_silence_duration_ms=2000, speech_pad_ms=0), rate)
    if len(padded) != len(unpadded):
        raise ValueError("Padded and unpadded events are not one-to-one")
    raw = {"schemaVersion": 1, "createdAt": datetime.now(timezone.utc).isoformat(),
           "sourceAudioPath": str(args.audio), "sourceAudioSha256": args.audio_sha,
           "decoder": "faster_whisper.audio.decode_audio/PyAV", "sampleRate": rate, "decodedSampleCount": len(audio),
           "decodedMonoFloat32Sha256": hashlib.sha256(audio.tobytes()).hexdigest(),
           "options": {"threshold": .5, "minSilenceDurationMs": 2000, "speechPadMs": 400},
           "chunks": [{"startSample": event["start"], "endSample": event["end"]} for event in padded],
           "unpaddedOptions": {"threshold": .5, "minSilenceDurationMs": 2000, "speechPadMs": 0},
           "unpaddedChunks": [{"id": index + 1, "startSample": event["start"], "endSample": event["end"]} for index, event in enumerate(unpadded)],
           "humanReviewed": False, "originalAudioModified": False}
    atomic(raw_path, raw)

activity_path = args.output / f"{args.source_id}.strict-activity.json"
activity = {"schemaVersion": 1, "sourceAudioSha256": args.audio_sha, "decoder": "pyav-faster-whisper",
            "sampleRate": 16000, "decodedSampleCount": raw["decodedSampleCount"], "rawArtifact": ref(raw_path),
            "events": [{"id": index + 1, **event} for index, event in enumerate(raw["chunks"])]}
if not activity_path.exists():
    atomic(activity_path, activity)
elif read(activity_path) != activity:
    raise ValueError("Staged strict activity changed")
print({"sourceRecordId": args.source_id, "activityEvents": len(raw["chunks"]), "scriptSections": len(script["sections"]), "apiCostUsd": 0})
