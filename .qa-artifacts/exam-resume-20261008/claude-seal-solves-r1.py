"""Seal the Claude blind solves before any candidate is shown to their solvers.

For each review folder: every solve/qNN.json must name the student digest of the blind
item it answered (checked against blind/student-problems.json), be `solved` or `pending`,
and is recorded by raw sha256 and canonical-JSON digest (same digest as candidatePack.mjs).
The seal file is committed and pushed before the review messages go out.
"""
import hashlib, json, pathlib, sys
from datetime import datetime, timezone

sys.dont_write_bytecode = True
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent


def canonical(v):
    if isinstance(v, list):
        return "[" + ",".join(canonical(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canonical(v[k]) for k in sorted(v)) + "}"
    return json.dumps(v, ensure_ascii=False)


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


FOLDERS = sys.argv[1:]
assert FOLDERS, "usage: claude-seal-solves-r1.py <review-folder>..."
for name in FOLDERS:
    review = ROOT / name
    claude = review / "claude-review-r1"
    blind = json.loads((review / "blind" / "student-problems.json").read_text(encoding="utf-8"))
    by_number = {b["questionNumber"]: b for b in blind}
    rows = []
    for p in sorted((claude / "solve").glob("q*.json")):
        raw = p.read_bytes()
        solve = json.loads(raw.decode("utf-8"))
        n = solve["questionNumber"]
        assert n in by_number, (name, n)
        assert solve["studentDigest"] == by_number[n]["studentDigest"], (name, n, "student digest mismatch")
        assert solve["status"] in ("solved", "pending"), (name, n)
        assert solve["solverId"].startswith("claude-opus-5-5-"), (name, n)
        rows.append({
            "questionNumber": n,
            "path": p.relative_to(review).as_posix(),
            "sha256": sha(raw),
            "solveDigest": sha(canonical(solve).encode("utf-8")),
            "studentDigest": solve["studentDigest"],
            "solverId": solve["solverId"],
            "status": solve["status"],
        })
    assert len(rows) == len(blind), (name, len(rows), len(blind))
    kit_files = [f for f in ("REVIEW-KIT.md", "official-provisions.json", "build-provisions.py") if (claude / f).exists()]
    seal = {
        "kind": "claude-blind-solve-seal/v1",
        "utc": datetime.now(timezone.utc).isoformat(),
        "reviewFolder": name,
        "method": "independent-solve-then-review",
        "blindStudentProblemsSha256": sha((review / "blind" / "student-problems.json").read_bytes()),
        "solves": rows,
        "kit": [{"path": f"claude-review-r1/{f}", "sha256": sha((claude / f).read_bytes())} for f in kit_files],
        "candidatesShownToSolvers": False,
        "previousVerifierSolvesReadBySolvers": False,
        "dbWrites": 0,
    }
    (claude / "solve-seal.json").write_text(json.dumps(seal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(name, len(rows), "sealed", [r["status"] for r in rows].count("solved"), "solved")
