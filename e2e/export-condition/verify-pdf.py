"""Check the real PDF text and drawing geometry, then rasterize for visual review."""
import json
from pathlib import Path

import fitz

root = Path(__file__).resolve().parents[2] / "test-results" / "export-condition"
pdf_path = next(root.rglob("condition.pdf"))
document = fitz.open(pdf_path)
assert len(document) == 1
page = document[0]
assert abs(page.rect.width - 595.28) < 1
assert abs(page.rect.height - 841.89) < 1
spans = [
    span
    for block in page.get_text("dict")["blocks"]
    if "lines" in block
    for line in block["lines"]
    for span in line["spans"]
]
number = next(span for span in spans if span["text"] == "1.")
metadata = next(span for span in spans if span["text"].startswith("일차방정식"))
body = next(span for span in spans if span["text"].startswith("다음 조건을"))
heading = next(span for span in spans if span["text"] == "〈조건〉")
bullets = [span for span in spans if span["text"].startswith("•")]
assert len(bullets) == 2
assert number["bbox"][1] < metadata["bbox"][3]
assert metadata["bbox"][1] < number["bbox"][3]
assert body["bbox"][1] > max(number["bbox"][3], metadata["bbox"][3])
assert heading["size"] < body["size"]
assert all(not (span["flags"] & 16) for span in [heading, *bullets])
assert abs(bullets[0]["bbox"][0] - bullets[1]["bbox"][0]) < 0.1
assert heading["bbox"][3] < bullets[0]["bbox"][1] < bullets[1]["bbox"][1]
condition_rect = min(
    (
        drawing["rect"]
        for drawing in page.get_drawings()
        if drawing["rect"].contains(fitz.Rect(heading["bbox"]))
        and all(drawing["rect"].contains(fitz.Rect(span["bbox"])) for span in bullets)
    ),
    key=lambda rect: rect.width * rect.height,
)
heading_center = (heading["bbox"][0] + heading["bbox"][2]) / 2
assert abs(heading_center - (condition_rect.x0 + condition_rect.x1) / 2) < 1
geometry = json.loads(pdf_path.with_name("geometry.json").read_text(encoding="utf-8"))
assert abs(condition_rect.width - geometry["print"]["box"]["width"] * 0.75) < 1
assert abs(condition_rect.height - geometry["print"]["box"]["height"] * 0.75) < 1
page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(pdf_path.with_name("condition-pdf.png"))
proof = {
    "pdf": str(pdf_path), "pages": len(document), "a4_points": list(page.rect),
    "condition_rect_points": list(condition_rect),
    "heading_center_error_points": abs(heading_center - (condition_rect.x0 + condition_rect.x1) / 2),
    "heading_size_points": heading["size"], "body_size_points": body["size"],
    "number_metadata_overlap": True, "body_below_metadata": True,
    "bullet_left_alignment": True, "condition_text_regular_weight": True,
    "preview_print_pdf_box_size_matches": True,
}
(root / "pdf-proof.json").write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(proof, ensure_ascii=True, indent=2))
