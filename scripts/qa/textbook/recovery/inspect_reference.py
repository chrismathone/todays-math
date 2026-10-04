"""Pin the supplied original and inventory every physical page without publishing prose."""
from __future__ import annotations
import argparse
import hashlib
import json
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import pymupdf as fitz
from geometry import MM, box_mm, inventory

PDF_SHA = "6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0"
MANUSCRIPT_SHA = "520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb"

ACTIVITY = {
    "cover": "cover", "guide": "learningGuide", "toc": "tableOfContents",
    "studyplan": "learningPlan", "unitBridge": "preparation",
    "unitSpreadLeft": "unitIntro", "unitSpreadRight": "unitIntro", "opening": "dialogue",
    "concept1": "concepts", "concept2": "concepts", "concept3": "concepts", "lesson": "concepts",
    "scriptcheck": "dialogueCheck", "recall": "conceptBlankTest", "drill": "basicCheck",
    "basic": "basicCheck", "paired": "workedExamples", "types": "practice",
    "clinic": "errorCheck", "errors": "errorCheck", "oral": "explainActivity",
    "oralguide": "explainActivity", "mindmap": "conceptMap", "unitmap": "conceptMap",
    "reasoning": "reasoning", "conceptindex": "conceptIndex", "typeindex": "typeIndex",
    "typepage": "workedExamples+practice",
}
STAGES = {
    "선수 개념 확인": ("preparation", "preparation"), "유형 연습": ("practice", "type-practice"),
    "오류 점검": ("errorCheck", "error-check"), "짧은 복습": ("review", "cumulative-review"),
    "다시 확인": ("review", "cumulative-review"), "학습 점검": ("assessment", "unit-assessment"),
    "개념 이해": ("concepts", "concept-check"), "개념 정리": ("conceptStudy", "concept-check"),
    "확인문제": ("basicCheck", "concept-check"), "실전문제": ("assessment", "application"),
    "누적 복습": ("review", "cumulative-review"), "단원 평가": ("assessment", "unit-assessment"),
    "단원 마무리": ("assessment", "unit-assessment"), "유형 적용": ("practice", "type-practice"),
    "수와 식 종합": ("assessment", "application"),
}


def activity(page):
    if page["kind"] == "exercise":
        return STAGES[page["stage"]][0]
    if page["kind"] == "fullmaster":
        return {"learn": "conceptStudy", "cloze": "clozeRecall", "sentence": "sentenceRecall"}[page["mode"]]
    if page["kind"] == "practice":
        return "written" if page.get("stage") == "설명과 적용" else "assessment"
    return ACTIVITY[page["kind"]]


def union(spans):
    boxes = [s["bbox"] for s in spans]
    if not boxes:
        return None
    return box_mm([min(b[0] for b in boxes), min(b[1] for b in boxes),
                   max(b[2] for b in boxes), max(b[3] for b in boxes)])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manuscript", type=Path, required=True)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--zip", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--public-manifest", type=Path)
    parser.add_argument("--reuse-inventory", action="store_true")
    parser.add_argument("--png-pages", default="1,8,9,10,14,15,16,18,19,20,24,50,60,74,258")
    args = parser.parse_args()
    assert hashlib.sha256(args.manuscript.read_bytes()).hexdigest() == MANUSCRIPT_SHA
    assert hashlib.sha256(args.pdf.read_bytes()).hexdigest() == PDF_SHA
    data = json.loads(args.manuscript.read_text(encoding="utf-8"))
    zip_sha = None
    if args.zip:
        zip_sha = hashlib.sha256(args.zip.read_bytes()).hexdigest()
        with zipfile.ZipFile(args.zip) as archive:
            members = [name for name in archive.namelist() if name.endswith("/manuscript.json") or name == "manuscript.json"]
            assert len(members) == 1
            assert hashlib.sha256(archive.read(members[0])).hexdigest() == MANUSCRIPT_SHA
    document = fitz.open(args.pdf)
    assert len(document) == len(data["pages"]) == 259
    args.output.mkdir(parents=True, exist_ok=True)
    cached = args.output / "original-all-pages.json"
    pdf_inventory = json.loads(cached.read_text(encoding="utf-8")) if args.reuse_inventory and cached.exists() else inventory(args.pdf)
    assert pdf_inventory["sha256"] == PDF_SHA
    by_kind, by_stage = defaultdict(list), defaultdict(list)
    templates, original_rows = [], []
    for raw, page in zip(data["pages"], document):
        number = raw["page"]
        assert page.number + 1 == number
        by_kind[raw["kind"]].append(number)
        if raw["kind"] == "exercise":
            by_stage[raw["stage"]].append(number)
        spans = [s for b in page.get_text("dict")["blocks"] if b["type"] == 0
                 for line in b["lines"] for s in line["spans"] if s["text"].strip()]
        # These PDF span unions are measured landmarks, not CSS coordinates.
        # Body start excludes the title and decorative chapter text heuristically.
        landmarks = {
            "header": union([s for s in spans if s["bbox"][1] / MM < 23]),
            "largeTitle": union([s for s in spans if s["size"] >= 20 and 23 <= s["bbox"][1] / MM < 48]),
            "bodyStart": union(sorted([s for s in spans if 48 <= s["bbox"][1] / MM < 70],
                                      key=lambda s: s["bbox"][1])[:1]),
            "footer": union([s for s in spans if s["bbox"][1] / MM > 278]),
        }
        templates.append({"physicalPageIndex": number, "unit": raw["unit"], "kind": raw["kind"],
                          "activity": activity(raw), "stage": raw.get("stage"),
                          "landmarks": landmarks, "landmarkMethod": "PDF span unions; bodyStart heuristic",
                          "fontSizePt": sorted(Counter(round(s["size"], 3) for s in spans).items()),
                          "spanColors": sorted(set(s["color"] for s in spans))})
        if raw["kind"] == "fullmaster" and raw["unit"] == "U01":
            phase = {"learn": "study", "cloze": "keywords", "sentence": "sentences"}[raw["mode"]]
            previous_y = 75 * MM
            for concept in data["concepts"]:
                for i, row in enumerate(concept["rows"]):
                    candidates = sorted((r for r in page.search_for(row["label"])
                                         if r.x0 / MM < 30 and r.y0 > previous_y), key=lambda r: r.y0)
                    if not candidates:
                        raise ValueError(f"Missing original row label page {number} {concept['id']} {i}")
                    found = candidates[0]
                    previous_y = found.y0 + 0.1
                    original_rows.append({"physicalPageIndex": number, "phase": phase,
                                          "conceptId": concept["id"], "rowKey": f"U01.{concept['id']}.r{i+1}",
                                          "relativePageIndex": 0, "labelBoxMm": box_mm(found),
                                          "rawTextSha256": hashlib.sha256(row["text"].encode()).hexdigest()})
    assert len(by_kind) == 31 and len(by_stage) == 15
    dispositions = [{"kind": k, "physicalPages": pages, "count": len(pages),
                     "activityByPage": [{"page": n, "activity": activity(data["pages"][n-1])} for n in pages],
                     "status": "source-pinned; renderer integration pending"} for k, pages in by_kind.items()]
    stages = [{"stage": s, "physicalPages": pages, "count": len(pages),
               "activity": STAGES[s][0], "learningStage": STAGES[s][1]} for s, pages in by_stage.items()]
    u01 = [p["page"] for p in data["pages"] if p["unit"] == "U01"]
    assert u01 == list(range(8, 44))
    selected = sorted(set(range(1, 44)) | {v[0] for v in by_kind.values()}
                      | {v[0] for v in by_stage.values()})
    manifest = {"version": 1, "source": {"pdfSha256": PDF_SHA, "manuscriptSha256": MANUSCRIPT_SHA,
                **({"zipSha256": zip_sha, "zipManuscriptMatches": True} if zip_sha else {}),
                "physicalPages": 259, "questionCount": len(data["questions"])},
                "u01PhysicalPages": u01, "selectedPhysicalPages": selected,
                "kinds": dispositions, "exerciseStages": stages,
                "originalFullmasterRows": original_rows,
                "templates": templates,
                "limits": ["No source answer PDF has been pinned; answer visual equality is not asserted.",
                           "Template landmarks are PDF measurements; bodyStart is a heuristic requiring visual review.",
                           "This inventories the original; it is not new-renderer G0 acceptance."]}
    for filename, value in (("reference-manifest.json", manifest), ("original-all-pages.json", pdf_inventory)):
        (args.output / filename).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.public_manifest:
        args.public_manifest.parent.mkdir(parents=True, exist_ok=True)
        args.public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for number in map(int, filter(None, args.png_pages.split(","))):
        document[number - 1].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False).save(args.output / f"original-p{number:03}.png")
    print(json.dumps({"pages": len(document), "kinds": len(by_kind), "exerciseStages": len(by_stage),
                      "selectedPages": len(selected), "originalRows": len(original_rows)}))


if __name__ == "__main__":
    main()
