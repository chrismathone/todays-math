"""Private same-region original-PDF vs new-PDF evidence; missing output remains failed."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import pymupdf as fitz


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("original", type=Path)
    parser.add_argument("new", type=Path)
    parser.add_argument("witness", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    original_sha = hashlib.sha256(args.original.read_bytes()).hexdigest()
    assert original_sha == "6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0"
    witness = json.loads(args.witness.read_text(encoding="utf-8"))
    new_sha = hashlib.sha256(args.new.read_bytes()).hexdigest()
    assert witness["pdfSha256"] == new_sha
    source, rendered = fitz.open(args.original), fitz.open(args.new)
    articles, mappings = [], []
    for number in range(8, 44):
        matches = [p for p in witness["pages"] if p.get("sourcePage") == number]
        source_name = f"original-r{number:03}.png"
        source[number-1].get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False).save(args.output/source_name)
        rows = []
        for p in matches:
            index = p["pdfPageIndex"]
            name = f"new-r{number:03}-p{index:03}.png"
            rendered[index-1].get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False).save(args.output/name)
            anchors = p.get("anchorAccounting", [])
            failures = [a["id"] for a in anchors if not a["found"] or a["expectedCount"] != a["actualCount"]]
            deltas = [{"id": a["id"], "deltaMm": max(abs(x-y) for x,y in zip(a["boxMm"], a["referenceBoxMm"]))} for a in anchors if a["found"]]
            rows.append(f'<figure><figcaption>New PDF page {index}, physical {p["physicalPageIndex"]}; missing/count-mismatch anchors {len(failures)}</figcaption><img src="{name}" loading="lazy"></figure>')
            mappings.append({"sourcePage": number, "newPdfPage": index, "newPhysicalPage": p["physicalPageIndex"], "missingAnchors": failures, "anchorDeltas": deltas})
        if not matches:
            rows.append('<p class="failure">FAILED: no new rendered page maps to this original source page.</p>')
        articles.append(f'<article id="r{number}"><h2>Original source R{number}</h2><div class="pair"><figure><figcaption>Pinned original PDF R{number}</figcaption><img src="{source_name}" loading="lazy"></figure><div>{"".join(rows)}</div></div></article>')
    payload = {"originalPdfSha256": original_sha, "newPdfSha256": new_sha, "sourcePages": list(range(8,44)), "matchedSourcePages": len({m["sourcePage"] for m in mappings}), "mappings": mappings,
               "limits": ["Whole-page images are the same physical page region; different pagination remains visible.", "Computed source DOM anchors and PDF glyph ink are different geometries.", "AI reading of these images is not human or physical approval."]}
    (args.output/"comparison-manifest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    css = 'body{font:15px system-ui;background:#eee;color:#172b24;margin:24px}article{margin:28px 0;border-top:2px solid #264f40}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0 0 20px}img{display:block;width:100%;background:white}figcaption{padding:10px;background:#dce8dc}.failure{color:#9c172c;font-weight:bold}header{position:sticky;top:0;background:#eee;padding:10px}code{word-break:break-all}'
    (args.output/"same-region-comparison.html").write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Original U01 same-region PDF comparison</title><style>{css}</style></head><body><header><b>Independent QA; approval pending.</b> Original SHA <code>{html.escape(original_sha)}</code>; new SHA <code>{html.escape(new_sha)}</code>. Matched source pages: {payload["matchedSourcePages"]}/36. <a href="comparison-manifest.json">Exact anchor/count measurements</a></header>{"".join(articles)}</body></html>', encoding="utf-8")
    print(json.dumps({"output": str(args.output/"same-region-comparison.html"), "matchedSourcePages": payload["matchedSourcePages"], "newPdfSha256": new_sha}))


if __name__ == "__main__":
    main()
