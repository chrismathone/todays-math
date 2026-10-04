"""Two disjoint local-only queues for the seven unresolved priority originals."""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from strict_stage_support import PRIORITY_SOURCES, atomic

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base", type=Path, required=True)
parser.add_argument("--worker", type=int, choices=[0, 1], required=True)
args = parser.parse_args()
sources = PRIORITY_SOURCES[args.worker::2]
directory = Path(__file__).resolve().parent
destination = args.base / "strict-stage-20261004" / f"worker-{args.worker}-results.json"
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("CT2_CUDA_ALLOCATOR", "cub_caching")
results = []
for source_id in sources:
    for stage in ["activity", "korean", "english"]:
        filename = "strict-stage-activity.py" if stage == "activity" else "strict-stage-asr.py"
        command = [sys.executable, "-X", "faulthandler", "-u", str(directory / filename), "--base", str(args.base), "--source-id", source_id]
        if stage != "activity":
            command += ["--mode", stage]
        attempts = 0
        for _ in range(2):
            completed = subprocess.run(command, check=False)
            attempts += 1
            if completed.returncode & 0xFFFFFFFF != 0xC000070A:
                break
        results.append({"sourceRecordId": source_id, "stage": stage, "exitCode": completed.returncode, "attempts": attempts, "completedAt": datetime.now(timezone.utc).isoformat()})
        atomic(destination, {"worker": args.worker, "sources": sources, "records": results, "paidApiCalls": 0, "humanReviewed": False}, replace=True)
        if completed.returncode:
            break
print(json.dumps({"worker": args.worker, "steps": len(results), "failed": sum(row["exitCode"] != 0 for row in results)}))
