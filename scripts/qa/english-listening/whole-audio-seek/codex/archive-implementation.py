"""Freeze replay implementation byte-for-byte in a new durable output directory."""
import argparse
import subprocess
from pathlib import Path

import verifier as v


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    destination = Path(args.output)
    v.require(not destination.exists(), "implementation_archive_already_exists")
    source = Path(__file__).parent
    paths = sorted(p for p in source.iterdir() if p.suffix in (".py", ".mts", ".md"))
    destination.mkdir(parents=True)
    records = []
    for path in paths:
        target = destination / path.name
        target.write_bytes(path.read_bytes())
        v.require(v.sha(target) == v.sha(path), "implementation_archive_copy_changed")
        records.append(v.reference(target))
    commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    v.immutable_write(destination / "implementation-manifest.json", {"schemaVersion": 1, "codeCommit": commit, "files": records})
    print({"archive": str(destination), "files": len(records), "codeCommit": commit})


if __name__ == "__main__":
    main()
