"""한 권의 최종 시범 목록: 원본 코드마다 한 행, 새 판은 원판을 보존하고 우선한다. 적재 없음."""
from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

from collect import STAGE_LABELS


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sources")
    parser.add_argument("bundle")
    args = parser.parse_args()
    bundle = Path(args.bundle)
    codes = [json.loads(line)["problemCode"] for line in Path(args.sources).read_text().splitlines()]
    selected, history = {}, collections.defaultdict(list)
    for round_ in ("r1", "r2"):
        path = bundle / round_
        if not (path / "collect.json").exists():
            continue
        collect = json.loads((path / "collect.json").read_text())
        entries = [{**row, "round": round_} for row in collect["rows"]]
        entries += [{**hold, "round": round_, "status": f"보류 — {STAGE_LABELS.get(hold['stage'], hold['stage'])}"}
                    for hold in json.loads((path / "holds.json").read_text())]
        if len({r["problemCode"] for r in entries}) != len(entries):
            raise ValueError(f"{round_}에 중복 원본 코드가 있다")
        for entry in entries:
            code = entry["problemCode"]
            if code not in codes:
                raise ValueError(f"책 범위 밖 문항: {code}")
            selected[code] = entry
            history[code].append({key: entry.get(key) for key in ("round", "twinExternalId", "status")})
    if set(selected) != set(codes):
        raise ValueError(f"책 목록에서 빠진 문항: {set(codes) - set(selected)}")
    rows = [selected[code] for code in codes if selected[code].get("twinExternalId")]
    holds = [selected[code] for code in codes if not selected[code].get("twinExternalId")]
    tally = dict(collections.Counter(entry["status"] for entry in selected.values()))
    result = {"tally": tally, "totalSources": len(codes), "candidates": len(rows), "earlierHolds": len(holds),
              "loadable": 0, "productionWrites": False, "rows": rows}
    for name, data in [("collect.json", result), ("holds.json", holds), ("selection.json", dict(history))]:
        (bundle / name).write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps({"total": len(codes), "tally": tally}, ensure_ascii=False))


if __name__ == "__main__":
    main()
