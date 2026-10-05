"""Losslessly archive final chunk HTML only for verified completed export pairs."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path


def fingerprint(stream):
    digest, size = hashlib.sha256(), 0
    while chunk := stream.read(1024 * 1024):
        digest.update(chunk)
        size += len(chunk)
    return size, digest.hexdigest()


def write_manifest(filename, records):
    temporary = filename.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, filename)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--source-complete", action="store_true")
    args = parser.parse_args()
    root = args.directory.resolve(strict=True)
    plans = []
    if args.source_complete:
        assert root.parent.name == "runs" and root.parent.parent.name == "reference", "Expected explicitly named private source run"
        for variant in ["student", "answers"]:
            prefix = f"new-u01-semantic-{variant}"
            witness = json.loads((root / f"{prefix}-witness.json").read_text(encoding="utf-8"))
            export = json.loads((root / f"{prefix}-export.json").read_text(encoding="utf-8"))
            with (root / f"{prefix}.pdf").open("rb") as stream:
                _, pdf_sha = fingerprint(stream)
            assert pdf_sha == witness["pdfSha256"] == export["pdfSha256"]
            assert len(witness["pages"]) == export["pageCount"]
            folder = (root / prefix).resolve(strict=True)
            assert folder.parent == root
            placements = sorted(folder.glob("chunk-*-placements.json"))
            assert len(placements) == export["chunks"]
            assert sum(len(json.loads(p.read_text(encoding="utf-8"))["pages"]) for p in placements) == len(witness["pages"])
            plans.append((prefix, folder, sorted(folder.glob("chunk-*.html"))))
    else:
        assert root.parent.name == "runs" and root.parent.parent.name == "automatic", "Expected explicitly named private automatic run"
        summary = json.loads((root / "automatic-summary.json").read_text(encoding="utf-8"))
        completed = [row for row in summary if row.get("status") == "exported-checks-pending"
                     and {export["variant"] for export in row.get("exports", [])} == {"student", "answers"}]
        for row in completed:
            folder = (root / row["key"]).resolve(strict=True)
            assert folder.is_relative_to(root) and folder.parent == root
            for export in row["exports"]:
                variant = export["variant"]
                witness = json.loads((folder / f"{variant}-witness.json").read_text(encoding="utf-8"))
                with (folder / f"{variant}.pdf").open("rb") as stream:
                    _, pdf_sha = fingerprint(stream)
                assert pdf_sha == export["pdfSha256"] == witness["pdfSha256"]
            files = sorted([*folder.glob("student-chunk-*.html"), *folder.glob("answers-chunk-*.html")])
            plans.append((row["key"], folder, files))
    manifest = root / "inactive-html-lossless-archive.json"
    records = json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else []
    total = 0
    for key, folder, files in plans:
        saved = 0
        for candidate in files:
            original = candidate.resolve(strict=True)
            assert original.is_relative_to(folder) and original.parent == folder and original.suffix == ".html"
            archive, temporary = Path(str(original) + ".gz"), Path(str(original) + ".gz.tmp")
            assert not archive.exists() and not temporary.exists(), "Archive collision; original retained"
            digest, size = hashlib.sha256(), 0
            with original.open("rb") as source, gzip.open(temporary, "wb", compresslevel=6) as destination:
                while chunk := source.read(1024 * 1024):
                    digest.update(chunk)
                    size += len(chunk)
                    destination.write(chunk)
            original_sha = digest.hexdigest()
            with gzip.open(temporary, "rb") as decoded:
                decoded_size, decoded_sha = fingerprint(decoded)
            assert decoded_size == size and decoded_sha == original_sha
            with original.open("rb") as source:
                assert fingerprint(source) == (size, original_sha), "Original changed; it remains untouched"
            with temporary.open("rb") as compressed:
                compressed_size, compressed_sha = fingerprint(compressed)
            os.replace(temporary, archive)
            records.append({"original": str(original), "originalBytes": size, "originalSha256": original_sha,
                            "archive": str(archive), "compressedBytes": compressed_size, "compressedSha256": compressed_sha,
                            "decodedBytes": decoded_size, "decodedSha256": decoded_sha})
            write_manifest(manifest, records)
            # This single-file removal is allowed only after both immutable byte checks and the durable manifest.
            original.unlink()
            saved += size - compressed_size
            total += 1
        print(json.dumps({"key": key, "archived": len(files), "savedBytes": saved}), flush=True)
    print(json.dumps({"archived": total, "manifest": str(manifest), "manifestSha256": hashlib.sha256(manifest.read_bytes()).hexdigest() if manifest.exists() else None}), flush=True)


if __name__ == "__main__":
    main()
