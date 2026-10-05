"""Bounded actual CPU decode prefetch; every admission gate stays in verifier.run."""
import argparse
from concurrent.futures import ThreadPoolExecutor

import claude_adapter
import verifier as v


class SourcePrefetch:
    """Keep at most two ordered source replays pending; never persist PCM."""
    def __init__(self, specs, constructor=claude_adapter.SourceReplay):
        self.specs = iter(specs)
        self.constructor = constructor
        self.pool = ThreadPoolExecutor(max_workers=2)
        self.pending = {}
        self.closed = False
        self.fill()

    def fill(self):
        while len(self.pending) < 2:
            spec = next(self.specs, None)
            if spec is None:
                return
            sid = spec[1]["sourceRecordId"]
            v.require(sid not in self.pending, "duplicate_prefetch_source")
            self.pending[sid] = (spec, self.pool.submit(self.constructor, *spec))

    def __call__(self, root, source, clock, rows):
        v.require(not self.closed and source["sourceRecordId"] in self.pending, "unexpected_prefetch_source")
        spec, future = self.pending.pop(source["sourceRecordId"])
        v.require(spec == (root, source, clock, rows), "prefetch_input_differs")
        try:
            return future.result()
        finally:
            self.fill()

    def close(self):
        self.closed = True
        self.pool.shutdown(wait=True, cancel_futures=True)
        self.pending.clear()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--marks", action="append", required=True)
    parser.add_argument("--clock", required=True)
    parser.add_argument("--frozen", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    inventory = v.checked_ref(v.reference(args.inventory))
    clocks = v.checked_ref(v.reference(args.clock))
    clock_index = {row["sourceRecordId"]: row for row in clocks["records"]}
    queue_rows = {}
    for path in args.marks:
        queue = v.checked_ref(v.reference(path))
        for row in queue["records"]:
            key = (row["sourceRecordId"], row["questionId"])
            v.require(key not in queue_rows, "duplicate_prefetch_question")
            queue_rows[key] = row
    specs = []
    for source in inventory["records"]:
        rows = [queue_rows.get((source["sourceRecordId"], q["id"])) for q in source["questions"]]
        if any(row and row.get("status") == "candidate" and row.get("probeEvidence") for row in rows):
            specs.append((inventory["root"], source, clock_index[source["sourceRecordId"]], rows))
    replay = SourcePrefetch(specs)
    try:
        v.run(args.inventory, args.marks, args.clock, args.frozen, args.output,
              report_progress=True, source_replay_factory=replay)
    finally:
        replay.close()


if __name__ == "__main__":
    main()
