"""Render locally selected PDF regions. Source documents and labels stay local.

Usage: python -X utf8 prepare.py recipe.json output-directory
Recipe: {cases:[{id,pdf,page (1-based),box:[x0,y0,x1,y1] (0..1),...}]}
Requires PyMuPDF. This never writes to the source PDFs.
"""
import json
import sys
from pathlib import Path

import pymupdf


def main():
    recipe_path = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    recipe = json.loads(recipe_path.read_text(encoding="utf-8-sig"))
    cases = []
    for case in recipe["cases"]:
        if not case["id"].replace("-", "").replace("_", "").isalnum():
            raise ValueError("Case ids must contain only letters, digits, - or _")
        with pymupdf.open(case["pdf"]) as doc:
            if not isinstance(case["page"], int) or not 1 <= case["page"] <= len(doc):
                raise ValueError("Page must be a valid 1-based page number")
            page = doc[case["page"] - 1]
            if case.get("rotation"):
                page.set_rotation((page.rotation + case["rotation"]) % 360)
            x0, y0, x1, y1 = case["box"]
            if not (0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1):
                raise ValueError("Crop must be normalized and nonempty")
            w, h = page.rect.width, page.rect.height
            crop = pymupdf.Rect(x0*w, y0*h, x1*w, y1*h)
            target = output / (case["id"] + ".png")
            page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=crop).save(target)
            cases.append({**case, "imagePath": str(target), "width": round(crop.width*2), "height": round(crop.height*2)})
    manifest = {"labelStatus": "assistant-reviewed pilot; teacher verification pending", "cases": cases}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"cases": len(cases), "manifest": str(output / "manifest.json")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
