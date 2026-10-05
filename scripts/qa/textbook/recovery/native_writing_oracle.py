"""Attach measured native free-writing DOM and pinned original PDF vectors to a copied oracle."""
import argparse
import hashlib
import json
from pathlib import Path

import pymupdf as fitz
from geometry import horizontal_vectors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source_geometry", type=Path)
    parser.add_argument("native_writing", type=Path)
    parser.add_argument("original_pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    source_bytes, writing_bytes = args.source_geometry.read_bytes(), args.native_writing.read_bytes()
    source, writing = json.loads(source_bytes), json.loads(writing_bytes)
    pdf_sha = hashlib.sha256(args.original_pdf.read_bytes()).hexdigest()
    assert pdf_sha == "6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0"
    assert source["manuscriptSha256"] == writing["manuscriptSha256"]
    assert source["files"] == writing["files"]
    assert source["selectedPhysicalPages"] == writing["selectedPhysicalPages"] == list(range(8, 44))
    assert all(page["fontsLoaded"] for page in writing["pages"])
    document = fitz.open(args.original_pdf)
    containers, rules = 0, 0
    for original in source["pages"]:
        native = next(page for page in writing["pages"] if page["sourcePage"] == original["physicalPageIndex"])
        original["nativeWritingAreas"] = []
        vectors, _ = horizontal_vectors(document[original["physicalPageIndex"] - 1])
        for container in native["containers"]:
            if container["questionId"] is not None:
                continue
            bounds = container["boxMm"]
            found = [v for v in vectors if v["x0"] >= bounds[0] - .5 and v["x1"] <= bounds[2] + .5
                     and bounds[1] - .5 <= v["y"] <= bounds[3] + .5]
            assert len(found) == len(container["lines"]) > 0, "Pinned native PDF rule population disagrees with its measured DOM"
            found.sort(key=lambda vector: vector["y"])
            for dom, vector in zip(container["lines"], found):
                expected = [dom["boxMm"][0], dom["boxMm"][2], dom["boxMm"][3] - dom["thicknessMm"] / 2]
                assert max(abs(a - b) for a, b in zip(expected, [vector["x0"], vector["x1"], vector["y"]])) <= .5
                assert abs(dom["thicknessMm"] - vector["thicknessMm"]) <= .005
            original["nativeWritingAreas"].append({**container, "referencePdfVectors": found})
            containers += 1
            rules += len(found)
    document.close()
    source["nativeWritingReference"] = {
        "originalPdfSha256": pdf_sha,
        "domSha256": hashlib.sha256(writing_bytes).hexdigest(),
        "priorSourceGeometrySha256": hashlib.sha256(source_bytes).hexdigest(),
        "containerCount": containers,
        "pdfVectorCount": rules,
        "method": "Actual native free-writing DOM matched to exact pinned original PDF vectors; generic bank 7mm pitch is unchanged",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    assert not args.output.exists(), "Preserve the previous oracle; choose a fresh output"
    args.output.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
                      "nativeContainers": containers, "nativePdfVectors": rules}))


if __name__ == "__main__":
    main()
