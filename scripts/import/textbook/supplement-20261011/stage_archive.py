"""Stage an original ZIP into a new workspace while retaining its legacy G: identity."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import shutil
import sys
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from source_input import source_key  # noqa: E402
from inventory import new_output, sha256, write_json  # noqa: E402


def safe_member(name: str) -> PurePosixPath:
    member = PurePosixPath(name)
    if ("\\" in name or member.is_absolute() or ".." in member.parts
            or not member.parts or any(":" in part for part in member.parts)):
        raise ValueError(f"unsafe archive member: {name}")
    return member


def stage(archive: Path, logical_root: str, snapshot: Path, out: Path,
          member_prefix: str = "평가자료/", drive_id: str | None = None) -> dict:
    root = PureWindowsPath(logical_root)
    if root.drive != "G:" or not any(x in root.parts for x in ("중등교과서", "고등교과서")):
        raise ValueError("logical root must be the exact original G: textbook book directory")
    current = json.loads(snapshot.read_text(encoding="utf-8"))
    sources = {}
    for item in current["rows"]:
        material = item["material"]
        source = material["source_file"]
        if PureWindowsPath(source).is_relative_to(root):
            key = material["external_key"]
            if key != f"tb-{source_key(source)}":
                raise ValueError(f"snapshot identity disagrees with original path: {source}")
            sources[source] = key
    if not sources:
        raise ValueError("no independently captured loaded source paths verify this logical root")
    entries = []
    with zipfile.ZipFile(archive) as zipped:
        members = [info for info in zipped.infolist() if not info.is_dir()
                   and info.filename.startswith(member_prefix)
                   and PurePosixPath(info.filename).suffix.lower() in (".hwp", ".hwpx")]
        seen = set()
        for info in members:
            member = safe_member(info.filename)
            source = str(root.joinpath(*member.parts))
            if source in seen:
                raise ValueError(f"duplicate source path in archive: {source}")
            seen.add(source)
            entries.append((info, source))
        missing = sorted(set(sources) - seen)
        if missing:
            raise ValueError(f"archive/prefix omits {len(missing)} captured source paths: {missing[:3]}")
        new_output(out)
        staged = []
        for info, source in entries:
            key = source_key(source)
            target = out / "sources" / f"{key}{PurePosixPath(info.filename).suffix.lower()}"
            target.parent.mkdir(parents=True, exist_ok=True)
            with zipped.open(info) as src, target.open("xb") as dest:
                shutil.copyfileobj(src, dest)
            staged.append({"path": source, "localPath": str(target.resolve()), "key": key,
                           "kind": "문제", "archiveMember": info.filename,
                           "sha256": sha256(target), "bytes": info.file_size,
                           "archiveCrc32": f"{info.CRC:08x}"})
    manifest = {
        "schemaVersion": 1, "driveFileId": drive_id, "archiveName": archive.name,
        "archiveBytes": archive.stat().st_size, "archiveSha256": sha256(archive),
        "logicalRoot": str(root), "memberPrefix": member_prefix,
        "snapshotSha256": sha256(snapshot), "verifiedLoadedSourcePaths": len(sources),
        "stagedFiles": len(staged), "identityPolicy":
            "Exact legacy path hash, verified against captured source_material keys; local bytes have separate paths.",
    }
    write_json(out / "source-manifest.json", manifest)
    write_json(out / "triage.json", staged)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--logical-root", required=True)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--member-prefix", default="평가자료/")
    parser.add_argument("--drive-id")
    args = parser.parse_args()
    print(json.dumps(stage(args.archive, args.logical_root, args.snapshot, args.out,
                           args.member_prefix, args.drive_id), ensure_ascii=False))


if __name__ == "__main__":
    main()
