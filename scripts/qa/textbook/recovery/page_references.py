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


def visible_label(source):
    """Decode only independently understood inline notation; never discard math.

    Unknown TeX/markup fails closed rather than erasing commands, digits or signs.
    The frozen bank labels use integers, a variable, multiplication and division.
    """
    symbols = {r"\times": "×", r"\div": "÷", r"\cdot": "⋅"}

    def math_ink(match):
        value = match[1].strip()
        if value in symbols:
            return symbols[value]
        if re.fullmatch(r"[A-Za-z0-9()+\-=/<>., :]+", value):
            return value.replace("-", "−")
        raise ValueError("unsupported inline math label")

    result = re.sub(r"\$([^$]+)\$", math_ink, source)
    if "$" in result or "\\" in result:
        raise ValueError("unsupported label notation")
    return result


def printed_label(page, box):
    """Read bounded painted glyphs by baseline then x, independent of PDF runs.

    KaTeX and prose are separate PDF text objects even on one visible line.
    Stream order appends the math after the prose; glyph geometry restores its
    actual position. No glyph is dropped or replaced, and wrapped lines remain
    ordered by their measured baseline.
    """
    bounds = fitz.Rect([v * 72 / 25.4 for v in box])
    glyphs = []
    for block in page.get_text("rawdict", clip=bounds)["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                glyphs.extend((span["origin"][1], char["bbox"][0], char["c"])
                              for char in span["chars"])
    lines = []
    for baseline, x, char in sorted(glyphs):
        if not lines or abs(baseline - lines[-1][0]) > .75:
            lines.append((baseline, []))
        lines[-1][1].append((x, char))
    return "\n".join("".join(char for _, char in sorted(chars, key=lambda g: g[0]))
                     for _, chars in lines)


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
    sections, items, concepts, definitions = {}, {}, {}, {}
    for page in sorted(witness["pages"], key=lambda p: p["physicalPageIndex"]):
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
                candidate = {"pageLabel": label, "blockId": block["id"],
                             "activity": block["semantic"].get("activity"),
                             "pdfPageIndex": page["pdfPageIndex"]}
                identity = (block["unitKey"], semantic_node["conceptId"])
                concepts.setdefault(identity, candidate)
                if candidate["activity"] == "concepts":
                    definitions.setdefault(identity, candidate)
    checked = Counter()
    for page, row in observed:
        key = (row.get("blockId"), row.get("key"))
        if key not in expected or counts[key] != 1:
            continue
        unit, _, source, entry = expected[key]
        activity = source["semantic"]["activity"]
        target_evidence = {}
        target_unit = entry.get("targetUnitKey", unit["unitKey"])
        concept_id = entry.get("targetConceptId")
        # Actual frozen concept-index entries use their exact concept ID as key,
        # but retain an older section pointer. Resolve that identity independently
        # within the target unit, without treating ordinary section titles as IDs.
        if not concept_id and activity == "conceptIndex" and (target_unit, entry["key"]) in concepts:
            concept_id = entry["key"]
        if entry.get("targetItemId"):
            targets = items.get(entry["targetItemId"], [])
            desired = targets[0] if len(targets) == 1 else None
        elif concept_id:
            identity = (target_unit, concept_id)
            target = definitions.get(identity) or concepts.get(identity)
            desired = target["pageLabel"] if target else None
            target_evidence = {"targetConceptId": concept_id,
                               "conceptIdentitySource": "targetConceptId" if entry.get("targetConceptId") else "exact-concept-index-key-in-target-unit",
                               "targetResolution": "semantic-concepts-activity" if identity in definitions
                               else "legacy-first-placed-concept",
                               "targetPlacement": target,
                               "firstPlacedConcept": concepts.get(identity)}
        elif entry.get("targetSectionKey"):
            desired = sections.get((entry.get("targetUnitKey", unit["unitKey"]), entry["targetSectionKey"]))
            if activity == "conceptIndex":
                target_evidence = {"targetResolution": "legacy-section-pointer-no-matching-concept",
                                   "targetUnitKey": target_unit, "targetSectionKey": entry["targetSectionKey"]}
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
        try:
            expected_label = visible_label(entry["label"])
        except ValueError as error:
            issues.append({"code": "INDEX_LABEL_NOT_SUPPORTED", **detail, "reason": str(error)})
            expected_label = entry["label"]
        if compact(row.get("label")) != compact(expected_label):
            issues.append({"code": "INDEX_DOM_LABEL", **detail,
                           "actual": row.get("label"), "expected": expected_label})
        for field, target, code in (("pageBoxMm", desired, "INDEX_PRINTED_PAGE_REFERENCE"),
                                    ("labelBoxMm", expected_label, "INDEX_PRINTED_LABEL")):
            box = row.get(field)
            if not isinstance(box, list) or len(box) != 4 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in box):
                issues.append({"code": code, **detail, "reason": "actual DOM box missing"})
                continue
            text = printed_label(document[page["pdfPageIndex"] - 1], box)
            if compact(text) != compact(target):
                issues.append({"code": code, **detail, "actual": compact(text), "expected": compact(target)})
            else:
                checked[field] += 1
        model = blocks.get(row["blockId"], {})
        model_entries = (model.get("semantic") or {}).get("node", {}).get("entries", [])
        filled = [e for e in model_entries if e["key"] == entry["key"]]
        if len(filled) != 1 or filled[0].get("pageLabel") != desired:
            issues.append({"code": "INDEX_MODEL_PAGE_REFERENCE", **detail})
        samples.append({**detail, "targetPageLabel": desired, **target_evidence,
                        "expectedVisibleLabel": expected_label, "labelBoxMm": row.get("labelBoxMm"),
                        "printedLabelMethod": "bounded-glyph-baseline-then-x"})
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
