"""Inspect original listening picture prototypes without modifying images.

Teacher metadata lives beside the picture; it must not be embedded in PNG text/EXIF
chunks. This check is structural evidence, not a judgment of answer correctness.
"""
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VISUALS = ROOT / "docs/listening-samples/visuals"
FORBIDDEN = {b"tEXt", b"iTXt", b"zTXt", b"eXIf"}
DISPLAY_CHUNKS = {b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS", b"sRGB", b"gAMA", b"cHRM", b"pHYs"}


def inspect_png(path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG: {path.name}")
    offset, dimensions, chunks, extra_chunks = 8, None, [], []
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError(f"Truncated PNG: {path.name}")
        size = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + size
        if end > len(data):
            raise ValueError(f"Truncated PNG chunk: {path.name}")
        if kind in FORBIDDEN:
            raise ValueError(f"Embedded metadata {kind.decode()}: {path.name}")
        if kind not in DISPLAY_CHUNKS:
            extra_chunks.append({"type": kind.decode("ascii"), "bytes": size})
        if kind == b"IHDR":
            dimensions = struct.unpack(">II", data[offset + 8:offset + 16])
        chunks.append(kind.decode("ascii"))
        offset = end
        if kind == b"IEND":
            break
    if not dimensions or min(dimensions) < 64 or chunks[-1:] != ["IEND"] or offset != len(data):
        raise ValueError(f"Incomplete or invalid PNG: {path.name}")
    return {"width": dimensions[0], "height": dimensions[1], "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(), "embeddedTextOrExif": False,
            "chunksOutsideDisplayAllowlist": extra_chunks, "metadataReviewRequired": bool(extra_chunks)}


def main():
    results = []
    for manifest_path in sorted(VISUALS.glob("*.json")):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        image_path = (VISUALS / manifest["file"]).resolve()
        if image_path.parent != VISUALS.resolve():
            raise ValueError("Visual path must remain inside the prototype directory")
        if manifest["status"] != "teacher_review_pending":
            raise ValueError("Prototype status must not imply student publication")
        results.append({"id": manifest["id"], **inspect_png(image_path)})
    if not results:
        raise ValueError("No prototype manifests found")
    print(json.dumps({"structuralCheck": "passed", "assets": results,
                      "teacherReview": "pending", "studentPublication": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
