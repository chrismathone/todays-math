"""One additional oldest-first medium/int8 GPU worker; no paid API or DB calls."""

import argparse
import json
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--prepared", required=True)
parser.add_argument("--asr-output", required=True)
parser.add_argument("--model-cache", required=True)
parser.add_argument("--limit", type=int, default=36)
args = parser.parse_args()
if not 1 <= args.limit <= 36:
    raise ValueError("Additional queue is bounded to 36 records")
records = []
for file in Path(args.prepared).glob("ebs-middle-*.json"):
    payload = json.loads(file.read_text("utf8"))
    if (
        payload["verification"]["audioOnly"]
        and payload["verification"]["originalDocumentsMissing"]
    ):
        records.append(payload)
records.sort(
    key=lambda payload: (
        payload["createInput"]["source"]["year"],
        payload["createInput"]["source"]["round"],
        payload["createInput"]["level"],
    )
)
results = []
for payload in records[: args.limit]:
    destination = (
        Path(args.asr_output)
        / payload["sourceRecordId"]
        / "asr-medium-multilingual.json"
    )
    if destination.exists():
        continue
    source_audio = next(
        file for file in payload["sourceFiles"] if file["kind"] == "audio"
    )
    completed = subprocess.run(
        [
            sys.executable,
            "-X",
            "faulthandler",
            "-u",
            "scripts/qa/english-listening/transcribe-local.py",
            "--audio",
            payload["audioFilePath"],
            "--expected-sha256",
            source_audio["sha256"],
            "--output",
            str(destination),
            "--model-cache",
            args.model_cache,
            "--model",
            "medium",
            "--device",
            "cuda",
            "--compute-type",
            "int8",
            "--language",
            "auto",
            "--multilingual",
        ],
        check=False,
    )
    results.append(
        {
            "sourceRecordId": payload["sourceRecordId"],
            "exitCode": completed.returncode,
            "status": "prepared" if completed.returncode == 0 else "failed",
        }
    )
    print(json.dumps({"stage": "oldest-asr", **results[-1]}), flush=True)
receipt = Path(args.asr_output) / "oldest-asr-results.json"
receipt.write_text(json.dumps(results, ensure_ascii=False, indent=2), "utf8")
print(
    json.dumps(
        {
            "stage": "oldest-asr-complete",
            "records": len(results),
            "failed": sum(record["status"] == "failed" for record in results),
        }
    ),
    flush=True,
)
