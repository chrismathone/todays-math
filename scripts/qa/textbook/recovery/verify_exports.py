"""Whole-PDF checks and actual-page visual evidence for isolated automatic exports."""
import argparse
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pymupdf as fitz
from geometry import verify
from page_references import reference_labels, reference_phase_evidence


def answer_references(student_witness, answer_witness, document):
    """Check model references against actual student placements and printed labels."""
    locations, issues = {}, []
    for page in student_witness["pages"]:
        for node in page["nodes"]:
            if node.get("role") == "content" and node.get("kind") == "problem" and node.get("itemId"):
                item_id = node["itemId"]
                locations.setdefault(item_id, []).append(str(page["physicalPageIndex"]))
    answer_blocks = [block for section in answer_witness["projectedModel"]["sections"]
                     for block in section["blocks"] if block.get("kind") == "problem"]
    nodes = {node["id"]: (page, node) for page in answer_witness["pages"]
             for node in page["nodes"] if node.get("role") == "content"}
    printed = 0
    for block in answer_blocks:
        item_id = block["itemId"]
        expected = locations.get(item_id, [])
        if len(expected) != 1 or block.get("sourcePageLabel") != expected[0]:
            issues.append({"code": "ANSWER_STUDENT_PAGE_REFERENCE", "itemId": item_id,
                           "actual": block.get("sourcePageLabel"), "studentPages": expected})
            continue
        placed = nodes.get(block["id"])
        if not placed:
            issues.append({"code": "ANSWER_REFERENCE_NODE_MISSING", "itemId": item_id})
            continue
        page, _ = placed
        answers = [node for node in page["nodes"] if node.get("itemId") == item_id and node.get("role") == "answer"]
        if len(answers) != 1:
            issues.append({"code": "ANSWER_REFERENCE_LABEL_POPULATION", "itemId": item_id, "actual": len(answers)})
            continue
        bounds = fitz.Rect([value * 72 / 25.4 for value in answers[0]["boxMm"]])
        text = re.sub(r"\s+", "", document[page["pdfPageIndex"] - 1].get_textbox(bounds))
        labels = re.findall(r"정답·문제(\d+)쪽", text)
        if labels != expected:
            issues.append({"code": "ANSWER_PRINTED_PAGE_REFERENCE", "itemId": item_id,
                           "actual": labels, "studentPages": expected})
        else:
            printed += 1
    if set(locations) != {block["itemId"] for block in answer_blocks}:
        issues.append({"code": "ANSWER_REFERENCE_ITEM_POPULATION"})
    return {"referencesChecked": len(answer_blocks), "printedLabelsChecked": printed, "issues": issues}


def inspect(folder, variant):
    pdf = folder / f"{variant}.pdf"
    witness_path = folder / f"{variant}-witness.json"
    if not pdf.exists() or not witness_path.exists():
        return {"variant": variant, "status": "failed", "reason": "Actual PDF/witness missing", "issues": [{"code": "ACTUAL_EXPORT_MISSING"}], "samples": []}
    witness = json.loads(witness_path.read_text(encoding="utf-8"))
    result = verify(pdf, witness)
    result["variant"] = variant
    result["pdfSha256"] = hashlib.sha256(pdf.read_bytes()).hexdigest()
    (folder / f"{variant}-geometry.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    document = fitz.open(pdf)
    exchange_path = folder / "exchange.private.json"
    if not exchange_path.exists() or hashlib.sha256(exchange_path.read_bytes()).hexdigest() != witness.get("fixtureSha256"):
        result["issues"].append({"code": "INDEX_SOURCE_EXCHANGE_HASH"})
    else:
        indexes = reference_labels(witness, document, json.loads(exchange_path.read_text(encoding="utf-8")))
        result["indexReferenceVerification"] = indexes
        result["issues"].extend(indexes["issues"])
    phases = reference_phase_evidence(folder, variant)
    result["referencePhaseVerification"] = phases
    result["issues"].extend(phases["issues"])
    if variant == "answers":
        student_pdf, student_path = folder / "student.pdf", folder / "student-witness.json"
        if student_pdf.exists() and student_path.exists():
            student_witness = json.loads(student_path.read_text(encoding="utf-8"))
            if hashlib.sha256(student_pdf.read_bytes()).hexdigest() == student_witness.get("pdfSha256"):
                references = answer_references(student_witness, witness, document)
                result["answerReferenceVerification"] = references
                result["issues"].extend(references["issues"])
            else:
                result["issues"].append({"code": "ANSWER_STUDENT_WITNESS_HASH"})
        else:
            result["issues"].append({"code": "ANSWER_STUDENT_WITNESS_MISSING"})
    if result["issues"]:
        result["status"] = "failed"
    blocks = {block["id"]: block for section in witness["projectedModel"]["sections"] for block in section["blocks"]}
    candidates = {}
    for page in witness["pages"]:
        index = page["pdfPageIndex"]
        actual = [blocks.get(node.get("id"), {}) for node in page["nodes"] if node.get("role") == "content"]
        features = []
        if any(block.get("kind") == "dialogue" for block in actual):
            features.append("dialogue")
        actual_problems = [block for block in actual if block.get("kind") == "problem" and block.get("itemId")]
        if any(block.get("figures") for block in actual_problems):
            features.append("actual-bank-figure")
        if any(re.search(r"\\(?:[cdt]?frac)\b", block.get("content", "")) for block in actual_problems):
            features.append("actual-bank-fraction")
        if any(block.get("learningStage") == "written" or block.get("questionType") in ("descriptive", "서술형") for block in actual_problems):
            features.append("actual-bank-descriptive")
        if page.get("rows"):
            features.append("common-rows")
        if page.get("writeBoxes"):
            features.append("writing-spaces")
        candidates[index] = features
    selected = {}
    for feature in ("actual-bank-descriptive", "actual-bank-figure", "actual-bank-fraction", "dialogue", "common-rows", "writing-spaces"):
        match = next((index for index, features in candidates.items() if feature in features), None)
        if match is not None:
            selected.setdefault(match, []).append(feature)
    for index in (1, max(1, len(document) // 2), len(document)):
        selected.setdefault(index, []).append("whole-page position sample")
    samples, figures = [], []
    for index, reasons in sorted(selected.items()):
        file = f"{variant}-sample-p{index:03}.png"
        document[index - 1].get_pixmap(matrix=fitz.Matrix(1.2, 1.2), alpha=False).save(folder / file)
        samples.append({"pdfPageIndex": index, "file": file, "reasons": reasons, "review": "pending-human-review"})
        figures.append(f'<figure><figcaption>{html.escape(variant)} PDF page {index}: {html.escape(", ".join(reasons))}</figcaption><img src="{file}" loading="lazy"></figure>')
    result["pageCount"] = len(document)
    result["samples"] = samples
    result["atLeastThreeActualVisualPages"] = len(samples) >= 3
    if len(samples) < 3:
        result["status"] = "failed"
        result["issues"].append({"code": "VISUAL_SAMPLE_POPULATION", "actual": len(samples), "expectedMinimum": 3})
    (folder / f"{variant}-geometry.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    (folder / f"{variant}-visual-samples.html").write_text(
        '<!doctype html><html><meta charset="utf-8"><title>Actual automatic export samples</title><style>body{font:15px system-ui;background:#eee}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}img{width:100%}figcaption{padding:12px}</style><p>Actual PDF pages. AI inspection does not establish human or physical approval.</p><main>' + "".join(figures) + '</main></html>', encoding="utf-8")
    document.close()
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--only", default="all")
    args = parser.parse_args()
    # A live creation folder can contain the student PDF while answers are still being written.
    # Such a transient snapshot must not become a final missing-export verdict.
    if args.only == "all" and not (args.directory / "local-pglite-manifest.json").exists():
        raise SystemExit("Automatic writer is still active; use --only for completed combinations or wait for its final local manifest.")
    settled = {row["key"] for row in json.loads((args.directory / "automatic-summary.json").read_text(encoding="utf-8"))}
    if args.only != "all" and not set(args.only.split(",")).issubset(settled):
        raise SystemExit("Requested combination is still active or absent from the settled export summary.")
    summaries = []
    for folder in sorted(args.directory.iterdir()):
        if not folder.is_dir() or not (folder / "creation-result.private.json").exists():
            continue
        if args.only != "all" and folder.name not in args.only.split(","):
            continue
        variants = [inspect(folder, variant) for variant in ("student", "answers")]
        row = {"key": folder.name, "status": "passed" if all(v["status"] == "passed" for v in variants) else "failed",
               "checkedAtUtc": datetime.now(timezone.utc).isoformat(), "exports": variants}
        (folder / "verification-summary.json").write_text(json.dumps(row, ensure_ascii=False, indent=2), encoding="utf-8")
        summaries.append(row)
        print(json.dumps({"key": row["key"], "status": row["status"], "variants": [{"variant": v["variant"], "pages": v.get("pageCount"), "issues": len(v.get("issues", [])), "samples": len(v.get("samples", []))} for v in variants]}), flush=True)
    (args.directory / "automatic-verification.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
