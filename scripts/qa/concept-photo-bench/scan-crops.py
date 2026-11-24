"""Compare image-text anchors with model boxes; crop verified masked variants only.
Existing prepare.py's normalized crop convention, full-page composites, no products.
Model round 1 boxes are frozen before read-arm outputs; later rounds measure variance.
"""
import argparse
import json
import re
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw


def iou(a, b):
    w = max(0, min(a[2], b[2])-max(a[0], b[0]))
    h = max(0, min(a[3], b[3])-max(a[1], b[1]))
    intersection = w*h
    return intersection / ((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-intersection)


def main(root):
    pages = json.loads((root / "pages.json").read_text())
    truth = {p["pageId"]: p["slots"] for p in json.loads((root / "truth-candidates.json").read_text())}
    manifest, audit, tiles = [], [], []
    for p in pages:
        ident = p["id"]
        expected = sorted({int(re.match(r"q(\d+)", s["id"]).group(1)) for s in truth[ident]})
        detected = {}
        for r in json.loads((root / f"{ident}-ocr.json").read_text()):
            if r["box"][0] >= .12 or not .14 < r["box"][1] < .94:
                continue
            match = re.match(r"^[•·(\s]*(?:문|분)\s*(\d+|II|Il|ll)\b", r["text"])
            if match:
                q = 11 if match.group(1) in ["II", "Il", "ll"] else int(match.group(1))
                if q in expected:
                    detected.setdefault(q, r["box"][1])
        image_boxes = {q: [.03, y-.012, .975, detected[q+1]-.009] for q, y in detected.items() if q+1 in detected}
        if expected[-1] in detected:
            image_boxes[expected[-1]] = [.03, detected[expected[-1]]-.012, .975, .945]
        rounds = []
        for run in [1, 2, 3]:
            f = root / "boxes" / f"{ident}-r{run}.json"
            if not f.exists():
                continue
            value = json.loads(f.read_text())
            boxes = value["data"]["boxes"]
            ids = [b["question"] for b in boxes]
            if sorted(ids) != expected or len(ids) != len(set(ids)):
                raise ValueError("Model box coverage failed: " + f.name)
            converted = {}
            for b in boxes:
                x0, y0, x1, y1 = [v/1000 for v in b["box"]]
                if not 0 <= x0 < x1 <= 1 or not p["maskBottom"] <= y0 < y1 <= 1:
                    raise ValueError("Unsafe model box")
                converted[b["question"]] = [x0, y0, x1, y1]
            rounds.append({"round": run, "boxes": converted, "call": value["call"]})
        if not rounds:
            raise ValueError("Missing model boxes")
        chosen = rounds[0]["boxes"]
        entry = {"pageId": ident, "method": "model-opus-high-round1-fullwidth-pad4", "variants": {}, "detectorCall": rounds[0]["call"]}
        for variant, source in p["variants"].items():
            im = Image.open(source["file"]).convert("RGB")
            parts = []
            for q in expected:
                _, y0, _, y1 = chosen[q]
                # Whole width preserves a response written outside its intended line.
                box = [round(im.width*.025), max(round(im.height*p["maskBottom"]), round(im.height*y0)-4), round(im.width*.985), min(im.height, round(im.height*y1)+4)]
                target = root / "crops" / f"{ident}-{variant}-q{q}.jpg"
                target.parent.mkdir(exist_ok=True)
                im.crop(box).save(target, quality=95)
                parts.append({"question": q, "file": str(target), "boxPixels": box, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
            entry["variants"][variant] = parts
        manifest.append(entry)
        audit.append({"pageId": ident, "expectedQuestions": len(expected), "nativeMarkers": len(detected), "nativeMissing": [q for q in expected if q not in detected], "nativeBoxes": image_boxes,
                      "modelRounds": rounds, "nativeModelIoU": [{"question": q, "iou": iou(box, chosen[q])} for q, box in image_boxes.items()],
                      "modelRoundIoU": [{"round": r["round"], "question": q, "iou": iou(chosen[q], r["boxes"][q])} for r in rounds[1:] for q in expected]})
        im = Image.open(p["variants"]["raw-high"]["file"]).convert("RGB")
        draw = ImageDraw.Draw(im)
        for part in entry["variants"]["raw-high"]:
            q, px = part["question"], tuple(part["boxPixels"])
            draw.rectangle(px, outline="blue", width=3)
            draw.text((px[0], px[1]), str(q), fill="blue")
        im.thumbnail((400,566))
        tile = Image.new("RGB",(410,590),"white")
        tile.paste(im,(5,20));ImageDraw.Draw(tile).text((5,3),ident,fill="black");tiles.append(tile)
    (root / "crops.json").write_text(json.dumps(manifest, indent=2))
    (root / "crop-audit.json").write_text(json.dumps(audit, indent=2))
    canvas = Image.new("RGB",(1640,1180),"white")
    for i,t in enumerate(tiles):canvas.paste(t,((i%4)*410,(i//4)*590))
    canvas.save(root / "crop-review.jpg")
    print(json.dumps({"pages":len(manifest),"questions":sum(a["expectedQuestions"] for a in audit),"nativeMarkers":sum(a["nativeMarkers"] for a in audit),"nativeCompletePages":sum(not a["nativeMissing"] for a in audit),"modelRuns":sum(len(a["modelRounds"]) for a in audit)}))


def review(root):
    pages=json.loads((root/"pages.json").read_text())
    crops=json.loads((root/"crops.json").read_text())
    canvas=Image.new("RGB",(1640,1180),"white")
    for i,p in enumerate(pages):
        im=Image.open(p["variants"]["raw-high"]["file"]).convert("RGB")
        draw=ImageDraw.Draw(im)
        for c in next(c for c in crops if c["pageId"]==p["id"])["variants"]["raw-high"]:
            draw.rectangle(tuple(c["boxPixels"]),outline="blue",width=3)
        im.thumbnail((400,566))
        tile=Image.new("RGB",(410,590),"white");tile.paste(im,(5,20));ImageDraw.Draw(tile).text((5,3),p["id"],fill="black")
        canvas.paste(tile,((i%4)*410,(i//4)*590))
    canvas.save(root/"crop-review.jpg")


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("root",type=Path)
    parser.add_argument("--review-only",action="store_true")
    args=parser.parse_args()
    repo=Path(__file__).resolve().parents[3]
    if args.root.resolve()==repo or repo in args.root.resolve().parents:raise ValueError("Private artifacts outside repository only")
    review(args.root) if args.review_only else main(args.root)
