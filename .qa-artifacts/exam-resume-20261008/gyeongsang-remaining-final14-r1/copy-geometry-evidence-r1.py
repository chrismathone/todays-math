"""Copy the Geometry worktree's local-only GF14 evidence into the parent, byte-exact.

The Geometry verifier (orca-codex-exam-twin-author-geometry-20261008) began the GF14
post-exposure review and left evidence that never reached Git. Its worker is stopped,
so the parent keeps an exact copy and a ledger. Files already present in the parent
are compared, never overwritten. Original-question crops (context/packet/images)
are reviewer-only and stay out of Git, like the source67 previews.
"""
import hashlib, json, pathlib, shutil, sys
from datetime import datetime, timezone

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
GEOMETRY = pathlib.Path(
    "C:/Users/user/orca/workspaces/todays-math/exam-twin-author-geometry-20261008"
    "/.qa-artifacts/exam-resume-20261008/gyeongsang-remaining-final14-r1"
)


def sha(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


copied, same, conflicts = [], [], []
for src in sorted(GEOMETRY.rglob("*")):
    if not src.is_file() or "__pycache__" in src.parts:
        continue
    rel = src.relative_to(GEOMETRY)
    dst = HERE / rel
    h = sha(src)
    row = {"path": rel.as_posix(), "sha256": h, "bytes": src.stat().st_size}
    if dst.exists():
        (same if sha(dst) == h else conflicts).append(row | {"parentSha256": sha(dst)})
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    assert sha(dst) == h
    row["reviewerOnly"] = rel.parts[:3] == ("context", "packet", "images")
    copied.append(row)

ledger = {
    "kind": "geometry-local-evidence-copy/v1",
    "utc": datetime.now(timezone.utc).isoformat(),
    "from": GEOMETRY.as_posix(),
    "geometryHead": "d68b5f2c87f6039af879817ef1a9c9fb159c4a8f",
    "copied": copied,
    "alreadyPresentIdentical": [r["path"] for r in same],
    "conflictsLeftUntouched": conflicts,
    "reviewerOnlyNotForGit": [r["path"] for r in copied if r["reviewerOnly"]],
    "geometryWorktreeUnchanged": True,
    "dbWrites": 0,
}
(HERE / "geometry-local-evidence-copy-r1.json").write_text(
    json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps({"copied": len(copied), "same": len(same), "conflicts": [c["path"] for c in conflicts]}, ensure_ascii=False))
