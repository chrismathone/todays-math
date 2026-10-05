"""Independent PDF/DOM verifier. All coordinates are page-local millimetres.

Inventory mode never claims G0 acceptance. Verification requires a render witness
with declared coverage; page text alone cannot prove semantic absence or clipping.
No question/answer text is written to the report (only IDs and geometry).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path

import pymupdf as fitz

MM = 72 / 25.4
TOL = 0.5


def box_mm(rect):
    return [round(float(x) / MM, 4) for x in rect]


def contains(outer, inner, tol=TOL):
    return (inner[0] >= outer[0] - tol and inner[1] >= outer[1] - tol
            and inner[2] <= outer[2] + tol and inner[3] <= outer[3] + tol)


def overlaps(a, b):
    return min(a[2], b[2]) > max(a[0], b[0]) and min(a[3], b[3]) > max(a[1], b[1])


def finite_box(v):
    return (isinstance(v, list) and len(v) == 4
            and all(isinstance(x, (int, float)) and math.isfinite(x) for x in v)
            and v[2] >= v[0] and v[3] >= v[1])


def horizontal_vectors(page):
    """Accept stroked paths and thin filled vector rectangles (Chromium borders).

    A raster gradient is never a write line. Filled grey rectangles thicker than
    0.5mm are returned separately, and evaluated only within declared write boxes.
    """
    lines, bands = [], []
    for drawing in page.get_drawings():
        stroke = drawing.get("color") is not None
        fill = drawing.get("fill")
        width = float(drawing.get("width") or 0) / MM
        for item in drawing["items"]:
            if item[0] == "l" and stroke:
                a, b = item[1:3]
                if abs(a.y - b.y) / MM <= 0.03 and abs(a.x - b.x) / MM >= 4:
                    lines.append({"x0": min(a.x, b.x) / MM, "x1": max(a.x, b.x) / MM,
                                  "y": (a.y + b.y) / 2 / MM, "thicknessMm": width,
                                  "encoding": "stroke"})
            elif item[0] == "re":
                r = item[1]
                if r.width / MM < 4:
                    continue
                if fill is not None and r.height / MM <= 0.35:
                    lines.append({"x0": r.x0 / MM, "x1": r.x1 / MM,
                                  "y": (r.y0 + r.y1) / 2 / MM,
                                  "thicknessMm": r.height / MM, "encoding": "vector-fill"})
                elif fill is not None and r.height / MM > 0.5:
                    rgb = list(fill) if len(fill) == 3 else [fill[0]] * 3
                    if max(rgb) - min(rgb) < 0.08 and 0.25 <= sum(rgb) / 3 < 0.98:
                        bands.append(box_mm(r))
                if stroke:
                    for y in (r.y0, r.y1):
                        lines.append({"x0": r.x0 / MM, "x1": r.x1 / MM,
                                      "y": y / MM, "thicknessMm": width, "encoding": "stroke"})
    # Duplicate PDF path operations at the same geometry must not create fake pitch.
    unique = {(round(v["x0"], 3), round(v["x1"], 3), round(v["y"], 3),
               round(v["thicknessMm"], 3)): v for v in lines}
    return list(unique.values()), bands


def inventory(pdf):
    document = fitz.open(pdf)
    pages, fonts = [], {}
    for index, page in enumerate(document):
        spans = [s for b in page.get_text("dict")["blocks"] if b["type"] == 0
                 for line in b["lines"] for s in line["spans"]]
        vectors, bands = horizontal_vectors(page)
        page_fonts = []
        for font in page.get_fonts(full=True):
            xref, ext, kind, name, alias, encoding = font[:6]
            if xref not in fonts:
                try:
                    raw = document.extract_font(xref)[3]
                except Exception:
                    raw = b""
                fonts[xref] = {"name": name, "type": kind, "extension": ext,
                               "embedded": bool(raw), "byteLength": len(raw)}
            page_fonts.append(fonts[xref])
        pages.append({"physicalPageIndex": index + 1, "widthMm": page.rect.width / MM,
                      "heightMm": page.rect.height / MM, "textSpanCount": len(spans),
                      "imageCount": len(page.get_image_info()), "fonts": page_fonts,
                      "fontSizePt": sorted(set(round(s["size"], 3) for s in spans)),
                      "horizontalVectors": vectors, "greyBands": bands})
    document.close()
    return {"sha256": hashlib.sha256(Path(pdf).read_bytes()).hexdigest(),
            "pageCount": len(pages), "pages": pages}


def verify(pdf, witness):
    document = fitz.open(pdf)
    issues = []
    checked = defaultdict(int)

    def fail(code, page=None, node=None, **detail):
        issues.append({"code": code, **({"page": page} if page is not None else {}),
                       **({"nodeId": node} if node is not None else {}), **detail})

    if witness.get("pdfSha256") != hashlib.sha256(Path(pdf).read_bytes()).hexdigest():
        fail("WITNESS_PDF_HASH")
    if witness.get("variant") not in ("student", "answers"):
        fail("VARIANT_REQUIRED")
    expected = witness.get("pages", [])
    if len(expected) != len(document):
        fail("ALL_PAGE_COVERAGE", expected=len(expected), actual=len(document))
    required = ("anchors", "rows", "writeBoxes", "qrs", "nodes", "clips")
    for key in required:
        if witness.get("coverage", {}).get(key) is not True:
            fail("WITNESS_COVERAGE_REQUIRED", check=key)
    if witness.get("version", 1) >= 2:
        evidence = witness.get("coverageEvidence", {})
        if evidence.get("pdfSha256") != witness.get("pdfSha256"):
            fail("COVERAGE_EVIDENCE_HASH")
        if evidence.get("expectedPages") != len(document) or evidence.get("observedPages") != len(expected):
            fail("COVERAGE_PAGE_ACCOUNTING")
        actual_blocks = sum(p.get("accounting", {}).get("actualBlocks", 0) for p in expected)
        if evidence.get("expectedPlacedBlocks") != actual_blocks or evidence.get("observedBlocks") != actual_blocks:
            fail("COVERAGE_BLOCK_ACCOUNTING")
        for p in expected:
            accounting = p.get("accounting", {})
            if witness.get("sourceComparisonRequired"):
                if not re.fullmatch(r"[a-f0-9]{64}", witness.get("sourceGeometrySha256", "")):
                    fail("SOURCE_ORACLE_HASH_REQUIRED", p.get("physicalPageIndex"))
                if p.get("sourceReferenceFound") is not True or not p.get("anchorAccounting"):
                    fail("SOURCE_ORACLE_PAGE_REQUIRED", p.get("physicalPageIndex"))
            if (accounting.get("placementFound") is not True
                    or accounting.get("expectedBlocks") != accounting.get("actualBlocks")
                    or any(accounting.get(k) for k in ("missingBlocks", "unexpectedBlocks", "duplicateBlocks"))):
                fail("DOM_BLOCK_POPULATION", p.get("physicalPageIndex"))
            if p.get("fontsLoaded") is not True:
                fail("DOM_FONT_LOADING", p.get("physicalPageIndex"))
            if accounting.get("missingWritingIds"):
                fail("DOM_WRITING_POPULATION", p.get("physicalPageIndex"), nodes=accounting["missingWritingIds"])
            if accounting.get("missingQrIds"):
                fail("DOM_QR_POPULATION", p.get("physicalPageIndex"), nodes=accounting["missingQrIds"])
            if accounting.get("missingActivityIds"):
                fail("DOM_ACTIVITY_POPULATION", p.get("physicalPageIndex"), nodes=accounting["missingActivityIds"])
            if accounting.get("missingNumberIds"):
                fail("DISPLAY_NUMBER", p.get("physicalPageIndex"), nodes=accounting["missingNumberIds"])
            for key, count in (("clips", "clipCandidates"), ("writeBoxes", "writeCandidates"), ("qrs", "qrCandidates")):
                if accounting.get(count) != len(p.get(key, [])):
                    fail("DOM_POPULATION_ACCOUNTING", p.get("physicalPageIndex"), check=key)
            for anchor in p.get("anchorAccounting", []):
                if not anchor.get("found") or anchor.get("expectedCount") != anchor.get("actualCount"):
                    fail("ANCHOR_POPULATION", p.get("physicalPageIndex"), anchor.get("id"))
    disabled = set(witness.get("disabledActivities", []))
    public = set(witness.get("publicExampleItemIds", []))
    phases = defaultdict(list)
    dialogue_fonts = defaultdict(list)
    expected_rows = witness.get("expectedRows", {})
    all_nodes = []
    pdf_indexes = set()
    for expected_page in expected:
        pdf_index = expected_page.get("pdfPageIndex", expected_page.get("physicalPageIndex"))
        if not isinstance(pdf_index, int) or pdf_index < 1 or pdf_index > len(document):
            fail("PAGE_INDEX", pdf_index)
            continue
        if pdf_index in pdf_indexes:
            fail("PAGE_DUPLICATE", pdf_index)
        pdf_indexes.add(pdf_index)
        page = document[pdf_index - 1]
        number = expected_page.get("physicalPageIndex", pdf_index)
        extent = [0, 0, page.rect.width / MM, page.rect.height / MM]
        checked["pages"] += 1
        for dimension, actual in (("widthMm", extent[2]), ("heightMm", extent[3])):
            desired = expected_page.get(dimension, {"widthMm": 210, "heightMm": 297}[dimension])
            if abs(actual - desired) > TOL:
                fail("PAGE_DIMENSION", number, axis=dimension, actual=actual, expected=desired)
        fonts = page.get_fonts(full=True)
        for pattern in witness.get("requiredFonts", []):
            matches = [f for f in fonts if re.search(pattern, f[3])]
            if not matches:
                fail("FONT_MISSING", number, pattern=pattern)
            elif witness.get("requireEmbeddedFonts", True):
                for f in matches:
                    if not f[0] or not document.extract_font(f[0])[3]:
                        fail("FONT_NOT_EMBEDDED", number, font=f[3])
        # All extracted spans and images are checked on all pages. Element-level
        # clipping is checked separately; absent glyphs cannot be inferred here.
        spans = [s for b in page.get_text("dict")["blocks"] if b["type"] == 0
                 for line in b["lines"] for s in line["spans"]]
        for span in spans:
            checked["textSpans"] += 1
            if span["text"].strip() and not contains(extent, box_mm(span["bbox"])):
                fail("PDF_TEXT_OUTSIDE_PAGE", number, boxMm=box_mm(span["bbox"]))
        for dialogue in expected_page.get("dialogueBoxes", []):
            bounds = dialogue.get("boxMm")
            if not finite_box(bounds):
                fail("DIALOGUE_BOX_INVALID", number, dialogue.get("id"))
                continue
            found = [s for s in spans if contains(bounds, box_mm(s["bbox"]))
                     and re.search(dialogue.get("fontNameRegex", "Noto|Nanum"), s["font"])]
            if not found:
                fail("DIALOGUE_FONT_SPANS_MISSING", number, dialogue.get("id"))
            for span in found:
                checked["dialogueFontSpans"] += 1
                size = span["size"]
                dialogue_fonts[dialogue.get("unitId")].append(size)
                if size < 9.2 - 0.025 or size > 10.5 + 0.025:
                    fail("DIALOGUE_FONT_SIZE", number, dialogue.get("id"), actual=size)
                if abs(size * 10 - round(size * 10)) > 0.25:
                    fail("DIALOGUE_FONT_STEP", number, dialogue.get("id"), actual=size)
        for figure in page.get_image_info():
            checked["figures"] += 1
            if not contains(extent, box_mm(figure["bbox"])):
                fail("PDF_FIGURE_OUTSIDE_PAGE", number, boxMm=box_mm(figure["bbox"]))
        for clip in expected_page.get("clips", []):
            checked["clipNodes"] += 1
            if not finite_box(clip.get("boxMm")) or not finite_box(clip.get("clipBoxMm")):
                fail("CLIP_BOX_INVALID", number, clip.get("id"))
            elif not contains(clip["clipBoxMm"], clip["boxMm"]):
                fail("DOM_CLIPPING", number, clip.get("id"), boxMm=clip["boxMm"])
        for anchor in expected_page.get("anchors", []):
            checked["anchors"] += 1
            a, b = anchor.get("boxMm"), anchor.get("referenceBoxMm")
            if not finite_box(a) or not finite_box(b):
                fail("ANCHOR_REFERENCE_REQUIRED", number, anchor.get("id"))
            elif max(abs(x - y) for x, y in zip(a, b)) > TOL:
                fail("ANCHOR_COORDINATE", number, anchor.get("id"), actual=a, expected=b)
        vectors, bands = horizontal_vectors(page)
        for write in expected_page.get("writeBoxes", []):
            checked["writeBoxes"] += 1
            bounds = write.get("boxMm")
            if not finite_box(bounds):
                fail("WRITE_BOX_INVALID", number, write.get("id"))
                continue
            if not contains(extent, bounds):
                fail("WRITE_BOX_CLIPPED", number, write.get("id"))
            found = [v for v in vectors if v["x0"] >= bounds[0] - TOL
                     and v["x1"] <= bounds[2] + TOL
                     and bounds[1] - TOL <= v["y"] <= bounds[3] + TOL]
            if not found:
                fail("WRITE_VECTOR_MISSING", number, write.get("id"))
            for line in found:
                if not 0.2 - 0.005 <= line["thicknessMm"] <= 0.35 + 0.005:
                    fail("WRITE_THICKNESS", number, write.get("id"), actual=line["thicknessMm"])
                width = write.get("columnWidthMm", bounds[2] - bounds[0])
                if write.get("written") and line["x1"] - line["x0"] < 0.95 * width - 0.05:
                    fail("WRITE_LENGTH", number, write.get("id"), actual=line["x1"] - line["x0"])
            if write.get("writingSpace") == "native-source":
                lines = write.get("nativeLines")
                expected_count = write.get("nativeExpectedLineCount")
                if not isinstance(lines, list) or not isinstance(expected_count, int) or expected_count < 1:
                    fail("NATIVE_WRITE_DOM_REQUIRED", number, write.get("id"))
                    lines = []
                if len(lines) != expected_count or len(found) != expected_count:
                    fail("NATIVE_WRITE_VECTOR_POPULATION", number, write.get("id"),
                         actualPdf=len(found), actualDom=len(lines), expected=expected_count)
                found.sort(key=lambda vector: vector["y"])
                for dom, vector in zip(lines, found):
                    box = dom.get("boxMm") if isinstance(dom, dict) else None
                    thickness = dom.get("thicknessMm") if isinstance(dom, dict) else None
                    if not finite_box(box) or not isinstance(thickness, (int, float)) or not math.isfinite(thickness) or thickness <= 0:
                        fail("NATIVE_WRITE_DOM_INVALID", number, write.get("id"))
                        continue
                    expected_vector = [box[0], box[2], box[3] - thickness / 2]
                    if max(abs(a - b) for a, b in zip(expected_vector, [vector["x0"], vector["x1"], vector["y"]])) > TOL:
                        fail("NATIVE_WRITE_DOM_PDF_COORDINATE", number, write.get("id"))
                    if abs(thickness - vector["thicknessMm"]) > .005:
                        fail("NATIVE_WRITE_DOM_PDF_THICKNESS", number, write.get("id"))
                if write.get("nativeReferenceRequired"):
                    reference = write.get("nativeReference")
                    reference_lines = reference.get("lines") if isinstance(reference, dict) else None
                    reference_vectors = reference.get("referencePdfVectors") if isinstance(reference, dict) else None
                    if (write.get("nativeReferencePdfSha256") != "6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0"
                            or not isinstance(write.get("nativeReferenceDomSha256"), str)
                            or not re.fullmatch(r"[a-f0-9]{64}", write["nativeReferenceDomSha256"])
                            or not isinstance(reference, dict)
                            or not finite_box(reference.get("boxMm"))
                            or not isinstance(reference_lines, list)
                            or len(reference_lines) != expected_count
                            or not all(isinstance(line, dict) and finite_box(line.get("boxMm")) for line in reference_lines)
                            or not isinstance(reference_vectors, list)
                            or len(reference_vectors) != expected_count
                            or not all(isinstance(vector, dict) and all(isinstance(vector.get(key), (int, float)) and math.isfinite(vector[key]) for key in ["x0", "x1", "y", "thicknessMm"]) for vector in reference_vectors)):
                        fail("NATIVE_WRITE_REFERENCE_REQUIRED", number, write.get("id"))
                    else:
                        if max(abs(a - b) for a, b in zip(bounds, reference["boxMm"])) > TOL:
                            fail("NATIVE_WRITE_BOUNDS", number, write.get("id"))
                        for actual, native in zip(found, reference["referencePdfVectors"]):
                            if max(abs(actual[key] - native[key]) for key in ["x0", "x1", "y"]) > TOL:
                                fail("NATIVE_WRITE_PDF_COORDINATE", number, write.get("id"))
                            if abs(actual["thicknessMm"] - native["thicknessMm"]) > .005:
                                fail("NATIVE_WRITE_PDF_THICKNESS", number, write.get("id"))
                        for actual, native in zip(lines, reference["lines"]):
                            if not isinstance(actual, dict) or not finite_box(actual.get("boxMm")) or max(abs(a - b) for a, b in zip(actual["boxMm"], native["boxMm"])) > TOL:
                                fail("NATIVE_WRITE_DOM_COORDINATE", number, write.get("id"))
            else:
                ys = sorted(set(round(v["y"], 3) for v in found))
                for a, b in zip(ys, ys[1:]):
                    if abs(b - a - 7) > TOL:
                        fail("WRITE_PITCH", number, write.get("id"), actual=b - a)
            for band in bands:
                if contains(bounds, band) and band[2] - band[0] >= (bounds[2] - bounds[0]) * 0.5:
                    fail("WRITE_GREY_BAND", number, write.get("id"), boxMm=band)
            for qr in expected_page.get("qrs", []):
                if finite_box(qr.get("boxMm")) and overlaps(bounds, qr["boxMm"]):
                    fail("QR_INSIDE_WRITEBOX", number, qr.get("id"))
        for qr in expected_page.get("qrs", []):
            checked["qrs"] += 1
            if not finite_box(qr.get("boxMm")) or not contains(extent, qr["boxMm"]):
                fail("QR_CLIPPED", number, qr.get("id"))
        for row in expected_page.get("rows", []):
            checked["rows"] += 1
            phases[row.get("phase") or "unphased"].append(row)
        for node in expected_page.get("nodes", []):
            checked["semanticNodes"] += 1
            all_nodes.append(node)
            if node.get("activity") in disabled or any(x in disabled for x in node.get("references", [])):
                fail("DISABLED_ACTIVITY_NODE", number, node.get("id"))
            if witness.get("variant") == "student" and node.get("role") in ("answer", "solution", "teacher-answer"):
                if node.get("itemId") not in public or node.get("role") == "teacher-answer":
                    fail("STUDENT_ANSWER_NODE", number, node.get("id"))
            if node.get("displayNumber") is not None and node.get("expectedDisplayNumber") != node["displayNumber"]:
                fail("DISPLAY_NUMBER", number, node.get("id"))
            if node.get("continuation") and not (node.get("titlePresent") and node.get("continuationLabelPresent")):
                fail("CONTINUATION_LABEL", number, node.get("id"))
    # Check absence both in the DTO and in the DOM witness. Never search PDF
    # prose for words like 'answer' or a one-digit answer that can be a choice.
    model = witness.get("projectedModel")
    if not isinstance(model, dict):
        fail("PROJECTED_MODEL_REQUIRED")
    else:
        def walk(value):
            if isinstance(value, dict):
                if value.get("activity") in disabled:
                    fail("DISABLED_MODEL_NODE", node=value.get("id"))
                if witness.get("variant") == "student":
                    if value.get("teacherAnswer") is not None:
                        fail("STUDENT_TEACHER_ANSWER", node=value.get("id"))
                    if value.get("kind") == "problem" and value.get("itemId") not in public:
                        if any(k in value for k in ("answer", "solution", "publicWorkedExample")):
                            fail("STUDENT_ANSWER_FIELD", node=value.get("id"))
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)
        walk(model)
    normalized = {}
    for unit, sizes in dialogue_fonts.items():
        if max(sizes) - min(sizes) > 0.05:
            fail("DIALOGUE_FONT_COMMON", node=unit, minPt=min(sizes), maxPt=max(sizes))
    for phase, rows in phases.items():
        seen, sequence = set(), []
        desired = expected_rows.get(phase)
        authored_slots = phase == "unphased" and desired and len(desired[0]) == 5
        for row in rows:
            key = (row.get("conceptId") or "", row.get("rowKey"))
            if authored_slots:
                key += (row.get("unitKey"), row.get("activity"), row.get("blockId"))
            if key in seen:
                fail("ROW_DUPLICATE", node=row.get("rowKey"), phase=phase,
                     blockId=row.get("blockId"), activity=row.get("activity"))
            seen.add(key)
            if not finite_box(row.get("boxMm")):
                fail("ROW_BOX_INVALID", node=row.get("rowKey"))
                continue
            sequence.append((key, row.get("relativePageIndex"), row["boxMm"][1], row["boxMm"][3]))
        normalized[phase] = sequence
        if desired is not None and [list(r[0]) for r in sequence] != desired:
            fail("ROW_KEYS", phase=phase)
    for phase, desired in expected_rows.items():
        if phase not in normalized and desired:
            fail("ROW_PHASE_MISSING", phase=phase)
    present = [p for p in ("study", "keywords", "sentences") if p in normalized]
    if present:
        baseline = normalized[present[0]]
        for phase in present[1:]:
            rows = normalized[phase]
            if [r[0] for r in baseline] != [r[0] for r in rows]:
                fail("ROW_KEYS", phase=phase)
                continue
            for a, b in zip(baseline, rows):
                if a[1] != b[1]:
                    fail("ROW_PAGE_SPLIT", node=a[0][1], phase=phase)
                if max(abs(a[2] - b[2]), abs(a[3] - b[3])) > TOL:
                    fail("ROW_COORDINATE", node=a[0][1], phase=phase)
    document.close()
    return {"status": "passed" if not issues else "failed", "issues": issues,
            "checked": dict(checked), "limits": [
                "PDF spans cannot reveal glyphs omitted before painting; DOM clip witness is required.",
                "Semantic absence uses typed DTO/DOM roles, never incidental matching prose or choices.",
                "Human all-page visual reading and physical printing remain separate gates."]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--witness", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = verify(args.pdf, json.loads(args.witness.read_text(encoding="utf-8"))) if args.witness else inventory(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(args.output), "status": result.get("status", "inventory-only"),
                      "pages": result.get("pageCount", result.get("checked", {}).get("pages")),
                      "issues": len(result.get("issues", []))}))
    if result.get("status") == "failed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
