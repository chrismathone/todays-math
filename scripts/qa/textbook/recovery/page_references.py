"""Independent whole-variant reference oracle from frozen entries, DOM and PDF ink."""
from collections import Counter
import hashlib
import json
import math
import re

import pymupdf as fitz

INDEX_ACTIVITIES = {"tableOfContents", "conceptIndex", "typeIndex"}


def compact(value):
    return re.sub(r"\s+", "", value or "")


def reference_labels(witness, document, exchange):
    issues, samples = [], []
    blocks = {b["id"]: b for s in witness["projectedModel"]["sections"] for b in s["blocks"]}
    source_blocks = {b["blockId"]: (u, s, b) for u in exchange["units"] for s in u["sections"]
                     for b in s["blocks"] if (b.get("semantic") or {}).get("node", {}).get("kind") == "references"}
    expected = {(b["blockId"], e["key"]): (u, s, b, e) for u, s, b in source_blocks.values()
                for e in b["semantic"]["node"]["entries"]}
    observed = [(p, r) for p in witness["pages"] for r in p.get("references", [])]
    counts = Counter((r.get("blockId"), r.get("key")) for _, r in observed)
    if counts != Counter({key: 1 for key in expected}):
        issues.append({"code": "INDEX_REFERENCE_POPULATION", "expected": len(expected), "actual": len(observed),
                       "missing": [list(k) for k in expected if not counts[k]],
                       "unexpectedOrDuplicate": [list(k) for k, n in counts.items() if k not in expected or n != 1]})
    sections, items, concepts = {}, {}, {}
    for page in witness["pages"]:
        label = page.get("printedPageLabel")
        for node in page["nodes"]:
            if node.get("role") != "content":
                continue
            block = blocks.get(node.get("id"))
            if not block:
                continue
            owner = (block["unitKey"], block["sectionKey"])
            sections.setdefault(owner, label)
            if node.get("itemId"):
                items.setdefault(node["itemId"], []).append(label)
            semantic_node = (block.get("semantic") or {}).get("node", {})
            if semantic_node.get("kind") == "concept":
                concepts.setdefault(semantic_node["conceptId"], label)
    checked = Counter()
    for page, row in observed:
        key = (row.get("blockId"), row.get("key"))
        if key not in expected or counts[key] != 1:
            continue
        unit, _, source, entry = expected[key]
        activity = source["semantic"]["activity"]
        if entry.get("targetItemId"):
            targets = items.get(entry["targetItemId"], [])
            desired = targets[0] if len(targets) == 1 else None
        elif entry.get("targetConceptId"):
            desired = concepts.get(entry["targetConceptId"])
        elif entry.get("targetSectionKey"):
            desired = sections.get((entry.get("targetUnitKey", unit["unitKey"]), entry["targetSectionKey"]))
        else:
            desired = entry.get("pageLabel")
        detail = {"blockId": key[0], "key": key[1], "activity": activity, "pdfPageIndex": page["pdfPageIndex"]}
        footer_number = re.fullmatch(r"A?(\d+)" if witness.get("variant") == "answers" else r"(\d+)", desired or "")
        if not footer_number:
            issues.append({"code": "INDEX_REFERENCE_TARGET", **detail, "expected": desired})
            continue
        # Native ornament uses 003 / A003; the layout's references identify numeric page 3.
        desired = str(int(footer_number[1]))
        if row.get("pageLabel") != desired:
            issues.append({"code": "INDEX_DOM_PAGE_REFERENCE", **detail, "actual": row.get("pageLabel"), "expected": desired})
        if compact(row.get("label")) != compact(entry["label"]):
            issues.append({"code": "INDEX_DOM_LABEL", **detail})
        for field, target, code in (("pageBoxMm", desired, "INDEX_PRINTED_PAGE_REFERENCE"),
                                    ("labelBoxMm", entry["label"], "INDEX_PRINTED_LABEL")):
            box = row.get(field)
            if not isinstance(box, list) or len(box) != 4 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in box):
                issues.append({"code": code, **detail, "reason": "actual DOM box missing"})
                continue
            text = document[page["pdfPageIndex"] - 1].get_textbox(fitz.Rect([v * 72 / 25.4 for v in box]))
            if compact(text) != compact(target):
                issues.append({"code": code, **detail, "actual": compact(text), "expected": compact(target)})
            else:
                checked[field] += 1
        model = blocks.get(row["blockId"], {})
        model_entries = (model.get("semantic") or {}).get("node", {}).get("entries", [])
        filled = [e for e in model_entries if e["key"] == entry["key"]]
        if len(filled) != 1 or filled[0].get("pageLabel") != desired:
            issues.append({"code": "INDEX_MODEL_PAGE_REFERENCE", **detail})
        samples.append({**detail, "targetPageLabel": desired})
    activities = Counter(b["semantic"]["activity"] for _, _, b, _ in expected.values())
    missing_activities = sorted(INDEX_ACTIVITIES - set(activities))
    if missing_activities:
        issues.append({"code": "INDEX_ACTIVITY_POPULATION", "missing": missing_activities})
    return {"expectedReferences": len(expected), "observedReferences": len(observed),
            "printedNumbersChecked": checked["pageBoxMm"], "printedLabelsChecked": checked["labelBoxMm"],
            "activities": dict(activities), "samples": samples, "issues": issues}


def reference_phase_evidence(folder, variant, evidence=None):
    file = folder / f"{variant}-reference-phases.json"
    if evidence is None and not file.exists():
        return {"issues": [{"code": "REFERENCE_PHASE_EVIDENCE_MISSING"}], "chunksChecked": 0}
    if evidence is None:
        evidence = json.loads(file.read_text(encoding="utf-8"))
    issues, checked = [], 0
    plan = evidence["publisherPlan"]
    phases = evidence["phases"]
    counts = Counter((p["referencePhase"], p["chunkIndex"]) for p in phases)
    if counts != Counter({(phase, i): 1 for phase in ("reserve", "final") for i in range(len(plan))}):
        issues.append({"code": "REFERENCE_PHASE_POPULATION"})
    if evidence.get("mode") != "publish":
        issues.append({"code": "REFERENCE_PHASE_MODE"})
    for index in range(len(plan)):
        pair = {phase: [p for p in phases if p["referencePhase"] == phase and p["chunkIndex"] == index]
                for phase in ("reserve", "final")}
        if not all(len(rows) == 1 for rows in pair.values()):
            continue
        before, after = pair["reserve"][0], pair["final"][0]
        for phase, row in (("reserve", before), ("final", after)):
            pdf = (folder / "reserve" if phase == "reserve" else folder) / f"{variant}-chunk-{index}.pdf"
            if not pdf.exists() or hashlib.sha256(pdf.read_bytes()).hexdigest() != row["pdfSha256"]:
                issues.append({"code": "REFERENCE_PHASE_PDF_HASH", "chunkIndex": index, "phase": phase})
        invariant = (before["firstPhysicalPageIndex"] == after["firstPhysicalPageIndex"]
                     and before["nextPhysicalPageIndex"] == after["nextPhysicalPageIndex"]
                     and len(before["pages"]) == len(after["pages"]) <= 32 and len(plan[index]) <= 4)
        for a, b in zip(before["pages"], after["pages"]):
            invariant &= all(a.get(k) == b.get(k) for k in ("physicalPageIndex", "printedPageLabel", "unitKey", "sectionKey", "kind"))
            invariant &= len(a["blocks"]) == len(b["blocks"])
            for x, y in zip(a["blocks"], b["blocks"]):
                invariant &= all(x.get(k) == y.get(k) for k in ("blockId", "itemId", "column"))
                invariant &= all(abs(x[k] - y[k]) <= .01 for k in ("xMm", "yMm", "widthMm", "heightMm"))
        if not invariant:
            issues.append({"code": "REFERENCE_PHASE_REFLOW", "chunkIndex": index})
        checked += 1
    return {"issues": issues, "chunksChecked": checked, "mode": evidence.get("mode")}
