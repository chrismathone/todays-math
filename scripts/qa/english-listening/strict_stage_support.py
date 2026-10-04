"""Read-only source inputs and isolated, immutable strict-stage artifacts."""

import argparse
import hashlib
import json
import math
import os
import re
from pathlib import Path

PROTECTED_SOURCE = "ebsi-high-1-2022-2"
MODEL_REVISION = "08e178d48790749d25932bbc082711ddcfdfbc4f"
PRIORITY_SOURCES = ["ebs-middle-1-2026-2", "ebs-middle-2-2026-2", "ebs-middle-3-2026-2", "ebsi-high-1-2026-2", "ebsi-high-2-2026-2", "ebsi-high-3-2026-2", "ebsi-high-1-2026-09-mock"]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text("utf8"))


def ref(path):
    return {"path": str(Path(path).resolve()), "sha256": sha256(path)}


def atomic(path, value, *, replace=False):
    path = Path(path)
    if path.exists() and not replace:
        raise ValueError(f"Immutable artifact already exists: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), "utf8")
    os.replace(temporary, path)


def recognition_windows(activity, korean, question_count):
    """Actual cue-to-next-event windows are recognition inputs, never final cuts."""
    by_event = {}
    for segment in korean["segments"]:
        if segment["uncertain"]:
            continue
        match = re.match(r"^(\d{1,2})\s*번(?:\s*(?:부터|~|～|-|과|와)\s*(\d{1,2})\s*번)?", segment["text"])
        if match:
            first, last = int(match[1]), int(match[2] or match[1])
            if 1 <= first <= last <= question_count:
                by_event[segment["sourceEventId"]] = (list(range(first, last + 1)), segment)
    cues = sorted(by_event.values(), key=lambda item: item[1]["estimatedStartSeconds"])
    closing = next((segment for segment in korean["segments"] if re.match(r"^(?:수고하셨|이상으로|지금까지)", segment["text"]) and not segment["uncertain"]), None)
    inputs = []
    for index, (numbers, cue) in enumerate(cues):
        following = cues[index + 1][1] if index + 1 < len(cues) else closing
        if following is None or cue["sourceEventId"] >= following["sourceEventId"]:
            continue
        first_event = activity["chunks"][cue["sourceEventId"] - 1]
        last_event = activity["chunks"][following["sourceEventId"] - 2]
        start = max(first_event["startSample"], math.floor((cue["estimatedEndSeconds"] - 1) * 16000))
        end = last_event["endSample"]
        if start >= end or end - start > 180 * 16000:
            continue
        inputs.append({"id": len(inputs) + 1, "questionNumbers": numbers, "cueSegmentIds": [cue["id"]],
                       "firstActivityEventId": cue["sourceEventId"], "nextActivityEventId": following["sourceEventId"],
                       "startSample": start, "endSample": end, "purpose": "recognition_only_not_clip_boundaries"})
    return inputs


def context(description, modes=None):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--source-id", required=True)
    if modes:
        parser.add_argument("--mode", choices=modes, required=True)
    args = parser.parse_args()
    if args.source_id == PROTECTED_SOURCE:
        raise ValueError("The already applied source is frozen and excluded from this runner")
    if not re.fullmatch(r"(?:ebs-middle-[123]|ebsi-high-[123])-\d{4}-(?:[12]|09-mock)", args.source_id):
        raise ValueError("Unexpected original source ID")
    args.base = args.base.resolve()
    args.output = args.base / "strict-stage-20261004"
    args.asr_output = args.output / "asr" / args.source_id
    args.output.mkdir(parents=True, exist_ok=True)
    args.prepared_path = next((folder / f"{args.source_id}.json" for folder in [args.base / "prepared-registration", args.base / "prepared-historical-registration"] if (folder / f"{args.source_id}.json").is_file()), None)
    if args.prepared_path is None:
        raise ValueError("No actual original prepared source")
    args.prepared = read(args.prepared_path)
    if args.prepared["verification"].get("audioOnly") or not args.prepared["verification"]["questionCount"]:
        raise ValueError("Official-source proof cannot be fabricated for an audio-only reconstruction")
    args.audio = Path(args.prepared["audioFilePath"])
    args.audio_sha = next(asset["sha256"] for asset in args.prepared["sourceFiles"] if asset["kind"] == "audio")
    if sha256(args.audio) != args.audio_sha:
        raise ValueError("Actual original audio bytes differ")
    result_path = args.output / f"{args.source_id}.strict-verification.json"
    if result_path.exists() and read(result_path).get("status") == "passed":
        raise ValueError("This new whole-round proof already passed and is now frozen")
    return args
