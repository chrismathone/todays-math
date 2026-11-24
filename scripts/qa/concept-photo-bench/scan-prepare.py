"""Private full-page PDF render, header masking, image variants and OCR crop anchors.
Extends prepare.py's PyMuPDF route. Never modifies PDFs, product code or bank data.
All output (including local Vision OCR) must stay outside the checkout.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image, ImageDraw


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def render(root, out, reviewed_header_bottom=None):
    out.mkdir(parents=True, exist_ok=True)
    source_plan={"renderer":"pymupdf-composite-216dpi-v1", "sources":[digest(f) for f in sorted(root.glob("*.pdf"))]}
    plan_file=out/"source-plan.json"
    if plan_file.exists() and json.loads(plan_file.read_text()) != source_plan:
        raise ValueError("Source PDFs changed; use a fresh output directory")
    if not plan_file.exists():
        if list(out.glob("*-raw.png")):
            old=json.loads((out/"inventory.json").read_text()) if (out/"inventory.json").exists() else []
            for row in old:
                di=int(row["id"].split("-")[0][1:])-1
                if row["sourceHash"] != source_plan["sources"][di]:
                    raise ValueError("Existing renders have different source hashes")
            if len(old)!=len(list(out.glob("*-raw.png"))):
                raise ValueError("Existing renders lack provenance; use a fresh output directory")
        plan_file.write_text(json.dumps(source_plan,indent=2))
    inventory = []
    for di, file in enumerate(sorted(root.glob("*.pdf")), 1):
        with pymupdf.open(file) as doc:
            for pi, page in enumerate(doc, 1):
                ident = f"d{di}-p{pi:02}"
                raw = out / f"{ident}-raw.png"
                if not raw.exists():
                    pix = page.get_pixmap(matrix=pymupdf.Matrix(3, 3), alpha=False)
                    pix.save(raw)
                ocr = out / f"{ident}-ocr.json"
                if not ocr.exists():
                    subprocess.run(["swift", str(Path(__file__).with_name("scan-ocr.swift")), str(raw), str(ocr)], check=True, capture_output=True)
                rows = json.loads(ocr.read_text())
                names = [r for r in rows if "이름" in r["text"] and r["box"][1] < .12 and r["box"][0] > .6]
                # A fail-closed mask: all pixels above the lower edge of the name line.
                if not names and reviewed_header_bottom is None:
                    inventory.append({"id": ident, "sourceHash": digest(file), "pdfPage": pi, "status": "header-review-required"})
                    continue
                cutoff = reviewed_header_bottom if reviewed_header_bottom is not None else max(r["box"][3] for r in names) + .006
                if not .05 < cutoff < .2:
                    raise ValueError("Invalid reviewed header mask")
                im = Image.open(raw).convert("RGB")
                ImageDraw.Draw(im).rectangle((0, 0, im.width, round(im.height*cutoff)), fill="white")
                masked = out / f"{ident}-masked.png"
                im.save(masked)
                inventory.append({"id": ident, "sourceHash": digest(file), "pdfPage": pi, "width": im.width, "height": im.height,
                                  "maskBottom": cutoff, "maskMethod": "assistant-visual-reviewed" if reviewed_header_bottom else "local-name-marker", "masked": str(masked), "maskedHash": digest(masked), "status": "masked"})
                print(ident, "mask", round(cutoff, 4), flush=True)
    (out / "inventory.json").write_text(json.dumps(inventory, indent=2))


def variants(inventory, selected, out):
    pages = []
    for row in inventory:
        if row["id"] not in selected:
            continue
        if row["status"] != "masked":
            raise ValueError("Header has not been located: " + row["id"])
        page = {**row, "variants": {}}
        original = Image.open(row["masked"]).convert("RGB")
        rgb = np.asarray(original).copy()
        r, g, b = [rgb[:, :, i].astype(float) for i in range(3)]
        red = (r > g*1.15) & (r > b*1.10) & ((r-g) > 18)
        # Explicitly destructive ablation: red-over-pencil can erase pencil too.
        rgb[red] = 255
        cleaned = Image.fromarray(rgb)
        for name, source, longside in [("raw-high", original, 2526), ("raw-low", original, 1263), ("nored-high", cleaned, 2526), ("nored-low", cleaned, 1263)]:
            im = source.copy()
            im.thumbnail((longside, longside), Image.Resampling.LANCZOS)
            target = out / f'{row["id"]}-{name}.jpg'
            # JPEG analogue of phone ladder; real base64 bytes, not file-size guesses.
            for quality in [92, 85, 75]:
                im.save(target, quality=quality)
                if ((target.stat().st_size+2)//3)*4 < 4_000_000:
                    break
            else:
                raise ValueError("4 MB image base64 budget exceeded")
            page["variants"][name] = {"file": str(target), "sha256": digest(target), "width": im.width, "height": im.height, "bytes": target.stat().st_size, "quality": quality}
        pages.append(page)
    if len(pages) != len(selected):
        raise ValueError("Missing selected pages")
    (out / "pages.json").write_text(json.dumps(pages, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["render", "variants"])
    parser.add_argument("root", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--pages", default="")
    parser.add_argument("--reviewed-header-bottom", type=float)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    if args.out.resolve() == repo or repo in args.out.resolve().parents:
        raise ValueError("Private output must be outside repository")
    if args.mode == "render":
        render(args.root, args.out, args.reviewed_header_bottom)
    else:
        variants(json.loads((args.out / "inventory.json").read_text()), args.pages.split(","), args.out)
