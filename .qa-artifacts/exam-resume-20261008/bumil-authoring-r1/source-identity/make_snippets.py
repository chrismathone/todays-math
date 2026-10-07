"""Question-only snippets; printed scan regions omit names and handwritten work.

Some printed stems carry underlines/highlighting from the original scans. No
retouching, OCR, regeneration, or alteration of source conditions is performed.
"""
import hashlib
import json
import re
import sys

import fitz

from inspect_sources import OUT, digest, render, save_json

sys.stdout.reconfigure(encoding="utf-8")
sources = {s["id"]: s for s in json.loads((OUT / "source-files.json").read_text(encoding="utf-8"))}
snippets = []
jobs = [
    ("s3", 1, 90, "original-exam-header", [50, 65, 423, 145], []),
    ("s3", 1, 90, "original-school-footer", [598, 975, 691, 993], []),
    ("s3", 4, 270, "original-copyright-school", [389, 950, 702, 999], []),
    ("s3", 1, 90, "original-q2-stem", [38, 633, 359, 690], [2]),
    ("s3", 1, 90, "original-q2-figure", [132, 697, 238, 837], [2]),
    ("s3", 1, 90, "original-q3-stem", [366, 158, 680, 249], [3]),
    ("s3", 3, 90, "original-q15-stem", [373, 62, 681, 100], [15]),
    ("s3", 3, 90, "original-q15-figure", [462, 111, 596, 204], [15]),
    ("s3", 4, 270, "original-q21-stem", [390, 484, 695, 542], [21]),
    ("s3", 4, 270, "original-q21-figure", [467, 547, 624, 667], [21]),
    ("s2", 1, None, "second-scan-exam-header", [47, 61, 350, 123], []),
    ("s2", 1, None, "second-scan-school-footer", [495, 797, 550, 817], []),
    ("s7", 4, None, "third-scan-exam-header", [51, 92, 345, 152], []),
    ("s7", 1, None, "third-scan-q15-stem", [306, 69, 552, 106], [15]),
    ("s7", 1, None, "third-scan-q15-figure", [369, 107, 495, 188], [15]),
    ("s6", 1, None, "named-pdf-header", [42, 30, 552, 84], []),
    ("s6", 1, None, "named-pdf-footer", [373, 775, 551, 793], []),
    ("s4", 1, None, "anonymous-pdf-header", [48, 36, 677, 107], []),
    ("s4", 1, None, "anonymous-pdf-footer", [443, 949, 677, 972], []),
    ("s6", 1, None, "named-pdf-q2", [43, 330, 290, 518], [2]),
    ("s6", 1, None, "named-pdf-q3", [43, 570, 290, 718], [3]),
    ("s6", 3, None, "named-pdf-q15", [304, 431, 550, 584], [15]),
    ("s6", 4, None, "named-pdf-q21", [304, 547, 550, 704], [21]),
    ("s4", 1, None, "anonymous-pdf-q2", [52, 402, 350, 643], [2]),
    ("s4", 1, None, "anonymous-pdf-q3", [52, 700, 357, 875], [3]),
    ("s4", 3, None, "anonymous-pdf-q15", [372, 528, 676, 712], [15]),
    ("s4", 4, None, "anonymous-pdf-q21", [372, 664, 676, 867], [21]),
]
for sid, pn, rotation, name, box, questions in jobs:
    with fitz.open(sources[sid]["current_path"]) as doc:
        original_rotation = doc[pn - 1].rotation
        if rotation is not None:
            doc[pn - 1].set_rotation(rotation)
        rec = render(doc, pn, name + ".png", box, scale=3)
        rec.update(source_id=sid, source_sha256=sources[sid]["sha256"],
                   original_pdf_rotation=original_rotation, render_rotation=doc[pn - 1].rotation,
                   question_numbers=questions, kind="question_or_identity_snippet")
        if sid in {"s4", "s6"} and questions:
            text = doc[pn - 1].get_text(clip=fitz.Rect(box))
            rec["printed_pdf_text"] = text
            rec["whitespace_normalized_text_sha256"] = hashlib.sha256(re.sub(r"\s+", "", text).encode("utf-8")).hexdigest()
        snippets.append(rec)

# Only PDF images already identified as selected-question figures by prior
# comparison and current visual review are extracted. Page 5 is never loaded.
picture_pairs = {2: (1, 11, 19), 15: (3, 25, 47), 21: (4, 31, 61)}
hwp = json.loads((OUT / "hwp-question-only-evidence.json").read_text(encoding="utf-8"))
hwp_by_q = {r["question_number"]: r for r in hwp["questions"]}
comparisons = []
for q, (pn, collection_xref, work_xref) in picture_pairs.items():
    comparison = {"question_number": q, "hwp": hwp_by_q[q]["pictures"][0], "pdf_figures": []}
    for sid, xref in [("s4", collection_xref), ("s6", work_xref)]:
        with fitz.open(sources[sid]["current_path"]) as doc:
            assert xref in {im[0] for im in doc[pn - 1].get_images()}
            pix = fitz.Pixmap(doc, xref)
            rgb = fitz.Pixmap(fitz.csRGB, pix) if pix.colorspace.n != 3 else pix
            name = f"{sid}-q{q}-embedded-figure.png"
            rgb.save(OUT / name)
            pixel_hash = hashlib.sha256(rgb.samples).hexdigest()
            comparison["pdf_figures"].append({"source_id": sid, "page": pn, "xref": xref,
                "width": rgb.width, "height": rgb.height, "rgb_pixels_sha256": pixel_hash,
                "hwp_rgb_pixels_equal": pixel_hash == comparison["hwp"]["rgb_pixels_sha256"],
                "file": name, "png_sha256": digest(OUT / name)})
    comparisons.append(comparison)

for comparison in comparisons:
    hp = fitz.Pixmap(OUT / comparison["hwp"]["file"])
    if hp.colorspace.n != 3:
        hp = fitz.Pixmap(fitz.csRGB, hp)
    if hp.alpha:
        hp = fitz.Pixmap(hp, 0)
    for pdf in comparison["pdf_figures"]:
        pp = fitz.Pixmap(OUT / pdf["file"])
        if pp.colorspace.n != 3:
            pp = fitz.Pixmap(fitz.csRGB, pp)
        if pp.alpha:
            pp = fitz.Pixmap(pp, 0)
        assert (hp.width, hp.height, hp.n) == (pp.width, pp.height, pp.n)
        differences = [abs(a - b) for a, b in zip(hp.samples, pp.samples)]
        pdf["hwp_mean_absolute_rgb_channel_difference"] = round(sum(differences) / len(differences), 6)
        pdf["hwp_maximum_rgb_channel_difference"] = max(differences)
save_json("snippet-records.json", snippets)
save_json("selected-figure-linkage.json", comparisons)
print(json.dumps({"snippets": len(snippets), "figure_linkage": comparisons}, ensure_ascii=False, indent=2))
