"""두 원시 풀이가 모인 문항만 먼저 Git 봉인한 뒤 검수한다. 구독 CLI, DB 쓰기 없음.

python review_ready.py <sources.jsonl> <bundle> <run_dir> [--watch]
코드/후보를 커밋하지 않으며 선택한 원시 풀이와 검수 입력 해시 계약만 명시적으로 추가한다.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import subprocess
import time
from pathlib import Path

import integrity
import review_inputs
from review import review_one


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sources")
    parser.add_argument("bundle")
    parser.add_argument("run_dir")
    parser.add_argument("--watch", action="store_true")
    args = parser.parse_args()
    bundle, run_dir = Path(args.bundle), Path(args.run_dir)
    sources = {s["problemCode"]: s for s in map(json.loads, Path(args.sources).read_text().splitlines())}
    failures = {}
    while True:
        frozen = json.loads((bundle / "freeze.json").read_text())["candidates"]
        pending = [tid for tid in frozen if not (bundle / "reviews" / f"{tid}.json").exists() and failures.get(tid, 0) < 2]
        if not pending:
            break
        ready = [tid for tid in pending if (bundle / "solve/codex" / f"{tid}.json").exists() and
                 any((bundle / "solve" / solver / f"{tid}.json").exists() for solver in ("opus", "gemini"))]
        if not ready:
            if not args.watch:
                break
            time.sleep(15)
            continue
        # 작은 문항별 커밋의 폭증을 피한다. 풀이가 모두 끝난 마지막 묶음은 작아도 처리한다.
        if args.watch and len(ready) < 10 and len(ready) < len(pending):
            time.sleep(15)
            continue
        ready = ready[:30]
        paths = [bundle / "solve" / solver / f"{tid}.json" for tid in ready for solver in ("codex", "opus", "gemini")
                 if (bundle / "solve" / solver / f"{tid}.json").exists()]
        for tid in ready:
            candidate = json.loads((bundle / "candidates" / f"{tid}.json").read_text())
            paths.append(review_inputs.prepare(tid, sources[candidate["sourceReference"]["problemCode"]], bundle, run_dir))
        new = [path for path in paths if not integrity.committed(path)]
        if new:
            if subprocess.check_output(["git", "diff", "--cached", "--name-only"], text=True).strip():
                raise RuntimeError("다른 작업의 staged 파일이 있다 — 섞어서 커밋하지 않는다")
            subprocess.run(["git", "add", "--pathspec-from-file=-", "--pathspec-file-nul"],
                           input=b"\0".join(str(p).encode() for p in new) + b"\0", check=True)
            subprocess.run(["git", "commit", "-q", "-m", f"chore(qa): seal blind solves and review inputs for {len(ready)} textbook twins"], check=True)
        print(f"봉인 {len(ready)} · {integrity.git_head(bundle)[:9]}", flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = {}
            for tid in ready:
                candidate = json.loads((bundle / "candidates" / f"{tid}.json").read_text())
                futures[pool.submit(review_one, tid, sources[candidate["sourceReference"]["problemCode"]], bundle, run_dir)] = tid
            for future in concurrent.futures.as_completed(futures):
                tid = futures[future]
                try:
                    print(future.result(), flush=True)
                except Exception as error:
                    failures[tid] = failures.get(tid, 0) + 1
                    print(f"검수 실패 {tid}: {error}", flush=True)
        if not args.watch:
            break
    (run_dir / "review-failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
