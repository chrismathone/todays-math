"""Actual source answer containers and painted panels versus their printed guide band."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

import pymupdf as fitz
from geometry import MM, TOL, finite_box


def verify_source_guides(pdf, witness, selected_pages=None):
    issues, comparisons = [], []
    checked = Counter()

    def fail(code, **details):
        issues.append({"code": code, **details})

    actual_hash = hashlib.sha256(Path(pdf).read_bytes()).hexdigest()
    if witness.get("pdfSha256") != actual_hash:
        fail("SOURCE_GUIDE_PDF_HASH")
    if witness.get("variant") != "answers":
        fail("SOURCE_GUIDE_ANSWER_REQUIRED")
    pages = [p for p in witness.get("pages", [])
             if selected_pages is None or p.get("pdfPageIndex") in selected_pages]
    if selected_pages is None:
        model = witness.get("projectedModel")
        if not isinstance(model, dict):
            fail("SOURCE_GUIDE_MODEL_REQUIRED")
        else:
            expected = Counter(b.get("id") for s in model.get("sections", []) for b in s.get("blocks", [])
                               if b.get("kind") == "problem" and (b.get("semantic") or {}).get("source"))
            checked["expectedSourceQuestions"] = sum(expected.values())
            observed = Counter(r.get("blockId") for p in pages for r in p.get("sourceQuestionRegions", [])
                               if r.get("role") == "container")
            if not expected or expected != observed:
                fail("SOURCE_GUIDE_GLOBAL_QUESTION_POPULATION", expected=sum(expected.values()), actual=sum(observed.values()))
    with fitz.open(pdf) as document:
        expected_indices = Counter(range(1, len(document) + 1) if selected_pages is None else selected_pages)
        if Counter(p.get("pdfPageIndex") for p in pages) != expected_indices:
            fail("SOURCE_GUIDE_PAGE_COVERAGE")
        for page in pages:
            index = page.get("pdfPageIndex")
            if not isinstance(index, int) or not 1 <= index <= len(document):
                fail("SOURCE_GUIDE_PDF_PAGE", page=index)
                continue
            checked["actualPdfPages"] += 1
            guides, regions = page.get("sourceGuideBands"), page.get("sourceQuestionRegions")
            if not isinstance(guides, list) or not isinstance(regions, list):
                fail("SOURCE_GUIDE_DOM_REQUIRED", page=index)
                continue
            accounting = page.get("accounting", {})
            role_counts = Counter(r.get("role") for r in regions)
            if (len(guides) != accounting.get("sourceGuideCandidates")
                    or role_counts["container"] != accounting.get("sourceQuestionCandidates")
                    or role_counts["answer-panel"] != accounting.get("sourceAnswerCandidates")):
                fail("SOURCE_GUIDE_DOM_POPULATION", page=index)
            if len({r.get("id") for r in regions}) != len(regions):
                fail("SOURCE_GUIDE_DUPLICATE_REGION", page=index)
            if len({g.get("id") for g in guides}) != len(guides):
                fail("SOURCE_GUIDE_DUPLICATE_BAND", page=index)
            for guide in guides:
                if not finite_box(guide.get("boxMm")):
                    fail("SOURCE_GUIDE_BAND_BOUNDS", page=index, guideId=guide.get("id"))
            owners, expected_questions = page.get("sourceGuideOwnerIds"), page.get("expectedSourceQuestionIds")
            if not isinstance(owners, list) or not isinstance(expected_questions, list):
                fail("SOURCE_GUIDE_MODEL_REQUIRED", page=index)
            else:
                if len(guides) != int(bool(owners)):
                    fail("SOURCE_GUIDE_OWNER_POPULATION", page=index, expected=int(bool(owners)), actual=len(guides))
                if Counter(r.get("blockId") for r in regions if r.get("role") == "container") != Counter(expected_questions):
                    fail("SOURCE_GUIDE_QUESTION_POPULATION", page=index)
            # Answer-panel population must also agree with the independently captured role nodes.
            source_problem_ids = {r.get("blockId") for r in regions if r.get("role") == "container"}
            expected_panels = sum(n.get("role") == "answer" and n.get("id", "").split(".role")[0] in source_problem_ids
                                  for n in page.get("nodes", []))
            if role_counts["answer-panel"] != expected_panels:
                fail("SOURCE_GUIDE_ANSWER_PANEL_POPULATION", page=index,
                     expected=expected_panels, actual=role_counts["answer-panel"])
            rectangles = [item[1] for drawing in document[index-1].get_drawings()
                          if drawing.get("fill") is not None for item in drawing["items"] if item[0] == "re"]
            checked["guideBands"] += len(guides)
            checked["questionContainers"] += role_counts["container"]
            checked["answerPanels"] += role_counts["answer-panel"]
            for region in regions:
                if region.get("role") not in ("container", "answer-panel"):
                    fail("SOURCE_GUIDE_REGION_ROLE", page=index, regionId=region.get("id"))
                bounds = region.get("boxMm")
                if not finite_box(bounds):
                    fail("SOURCE_GUIDE_REGION_BOUNDS", page=index, regionId=region.get("id"))
                    continue
                if region.get("role") == "answer-panel" and region.get("backgroundColor") not in ("transparent", "rgba(0, 0, 0, 0)"):
                    matching_paint = [r for r in rectangles if max(abs(a-b/MM) for a,b in zip(bounds,list(r))) <= TOL]
                    if not matching_paint:
                        fail("SOURCE_GUIDE_ANSWER_BACKGROUND_PAINT", page=index, regionId=region.get("id"))
                    else:
                        checked["paintedAnswerPanels"] += 1
                for guide in guides:
                    band = guide.get("boxMm")
                    if not finite_box(band):
                        fail("SOURCE_GUIDE_BAND_BOUNDS", page=index, guideId=guide.get("id"))
                        continue
                    if min(bounds[2], band[2]) <= max(bounds[0], band[0]):
                        continue
                    intersection = max(0, min(bounds[3],band[3])-max(bounds[1],band[1]))
                    comparison = {"pdfPageIndex":index,"sourcePage":page.get("sourcePage"),
                                  "blockId":region.get("blockId"),"regionId":region.get("id"),
                                  "role":region.get("role"),"regionBoxMm":bounds,"guideBoxMm":band,
                                  "guideId":guide.get("id"),"clearanceMm":band[1]-bounds[3],
                                  "intersectionMm":intersection}
                    comparisons.append(comparison)
                    if intersection > TOL:
                        fail("SOURCE_ANSWER_GUIDE_INTRUSION", **comparison)
    if not checked["guideBands"] or not checked["questionContainers"]:
        fail("SOURCE_GUIDE_NONEMPTY_REQUIRED")
    return {"status":"failed" if issues else "passed","issues":issues,"checked":dict(checked),
            "pdfSha256":actual_hash,"scope":"whole-source" if selected_pages is None else "focused-diagnostic",
            "coordinateToleranceMm":TOL,"comparisons":comparisons,
            "limits":["Container/background intersection is distinct from visible glyph ink loss.",
                      "Raw clearances are recorded; existing .5mm coordinate tolerance is unchanged.",
                      "Human editorial and physical approval remain pending."]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--witness", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--pages")
    args = parser.parse_args()
    witness = json.loads(args.witness.read_text(encoding="utf-8"))
    selected = [int(p) for p in args.pages.split(",")] if args.pages else None
    result = verify_source_guides(args.pdf,witness,selected)
    result["witnessSha256"] = hashlib.sha256(args.witness.read_bytes()).hexdigest()
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":result["status"],"issues":len(result["issues"]),"checked":result["checked"]}))
    raise SystemExit(1 if result["issues"] else 0)


if __name__ == "__main__":
    main()
