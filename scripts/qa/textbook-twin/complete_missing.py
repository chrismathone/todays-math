"""저자 응답이 일부만 왔을 때 빠진 코드만 작은 묶음으로 이어 쓴다. 기존 제안은 덮어쓰지 않는다."""
from __future__ import annotations

import argparse
import concurrent.futures
import json
from pathlib import Path

import author


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("work")
    parser.add_argument("--jobs", type=int, default=1)
    parser.add_argument("--all-missing", action="store_true", help="초기 단원 저작 큐가 끝난 뒤에만 사용")
    args = parser.parse_args()
    work = Path(args.work)
    sources = [json.loads(line) for line in (work / "sources.jsonl").read_text().splitlines()]
    catalog = json.loads((work / "catalog.json").read_text())
    records = [json.loads(path.read_text()) for path in (work / "author").glob("*.json")
               if not path.name.startswith("._") and not path.name.endswith(".raw.json")]
    seen = {p["problemCode"] for record in records for p in record.get("proposals", [])}
    partial = {code for record in records for code in record.get("missing", [])}
    missing = [src for src in sources if src["problemCode"] not in seen and (args.all_missing or src["problemCode"] in partial)]
    sections = {}
    for src in missing:
        sections.setdefault(src["section"], []).append(src)
    batches = [(section, items[n:n + 3]) for section, items in sections.items() for n in range(0, len(items), 3)]
    print(f"빠진 코드 {len(missing)} · 작은 묶음 {len(batches)}", flush=True)

    def one(section, items):
        stem = work / "author" / f"extra-{items[0]['problemCode']}"
        if stem.with_suffix(".json").exists():
            raise ValueError(f"기존 보완 제안과 충돌: {stem}")
        prompt = author.build_prompt(section, items, catalog[section])
        stem.with_suffix(".prompt.md").write_text(prompt)
        envelope = author.run(prompt, author.AUTHOR_MODEL, work)
        stem.with_suffix(".raw.json").write_text(json.dumps(envelope, ensure_ascii=False, indent=1))
        proposals = author.parse_result(envelope.get("result", ""))
        wanted = {item["problemCode"] for item in items}
        got = [p["problemCode"] for p in proposals]
        if len(got) != len(set(got)) or set(got) - wanted:
            raise ValueError("저자가 요청 밖 코드 또는 중복 코드를 냈다 — 원응답 보존")
        record = {"section": section, "model": author.AUTHOR_MODEL, "sessionId": envelope.get("session_id"),
                  "missing": sorted(wanted - set(got)), "extra": [], "proposals": proposals}
        stem.with_suffix(".json").write_text(json.dumps(record, ensure_ascii=False, indent=1))
        return f"{stem.name}: {len(got)}/{len(items)} · {envelope['_elapsedSec']}초"

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(one, s, items): s for s, items in batches}
        for future in concurrent.futures.as_completed(futures):
            try:
                print(future.result(), flush=True)
            except Exception as error:
                print(f"실패 {futures[future]}: {error}", flush=True)


if __name__ == "__main__":
    main()
