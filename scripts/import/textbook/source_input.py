"""Keep a textbook's logical source identity when its bytes are staged elsewhere."""
from __future__ import annotations

import hashlib
from pathlib import Path


def source_key(source_path: str) -> str:
    # The original importer hashes the exact path, including drive and separators.
    return hashlib.sha1(source_path.encode("utf-8")).hexdigest()[:16]


def conversion_input(row: dict) -> tuple[str, Path, str]:
    logical = row["path"]
    if not isinstance(logical, str) or not logical:
        raise ValueError("source path must be a nonempty string")
    key = source_key(logical)
    if row.get("key", key) != key:
        raise ValueError(f"source key does not match the original path: {logical}")
    local = Path(row.get("localPath", logical))
    if local.suffix.lower() not in (".hwp", ".hwpx"):
        raise ValueError(f"unsupported conversion input: {local}")
    if row.get("sha256") and hashlib.sha256(local.read_bytes()).hexdigest() != row["sha256"]:
        raise ValueError(f"staged source bytes changed: {local}")
    return logical, local, key
