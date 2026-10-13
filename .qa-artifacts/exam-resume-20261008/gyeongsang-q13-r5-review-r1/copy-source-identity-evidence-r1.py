"""Copy SourceIdentity's unsealed q13 r5 work into the parent, byte-exact.

SourceIdentity (orca-codex-exam-twin-source-identity-20261008) declared it had not read
the r4 author answers, solved q13 r5 from the student-only pack, and wrote exact
calculations and a 70mm student preview — but stopped before writing a raw solve file or
sealing it by commit. Its worker is stopped. The parent keeps an exact copy and this
ledger; nothing in the SourceIdentity worktree is changed. The official curriculum
HWP/PDF copies are public documents but large; they stay local (not for Git).
"""
import hashlib, json, pathlib, shutil, sys
from datetime import datetime, timezone

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
SOURCE = pathlib.Path(
    "C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008"
    "/.qa-artifacts/exam-resume-20261008/gyeongsang-q13-r5-review-r1"
)
DEST = HERE / "source-identity-unsealed-r1"


def sha(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


rows = []
for src in sorted(SOURCE.rglob("*")):
    if not src.is_file() or "__pycache__" in src.parts:
        continue
    rel = src.relative_to(SOURCE)
    h = sha(src)
    if rel.parts[0] == "blind":
        parent_copy = HERE / rel
        rows.append({"path": rel.as_posix(), "sha256": h, "matchesParentBlind": parent_copy.exists() and sha(parent_copy) == h})
        continue
    dst = DEST / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    assert sha(dst) == h
    rows.append({"path": rel.as_posix(), "sha256": h, "bytes": src.stat().st_size, "localOnly": rel.parts[0] == "official"})

ledger = {
    "kind": "source-identity-unsealed-q13-r5-copy/v1",
    "utc": datetime.now(timezone.utc).isoformat(),
    "from": SOURCE.as_posix(),
    "sourceIdentityHead": "b9324223ce7051095537e4b80e4ab550276169cf",
    "copiedTo": DEST.relative_to(HERE).as_posix(),
    "files": rows,
    "rawSolveFileWritten": False,
    "sealedByCommit": False,
    "disposition": "Kept as an unsealed second calculation. The q13 r5 approval path uses a new sealed blind solve (claude-review-r1); this copy is cross-check evidence only.",
    "sourceIdentityWorktreeUnchanged": True,
    "dbWrites": 0,
}
(HERE / "source-identity-unsealed-copy-r1.json").write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"files": len(rows), "blindMatches": [r["path"] for r in rows if r.get("matchesParentBlind")]}, ensure_ascii=False))
