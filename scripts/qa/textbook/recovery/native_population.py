"""Exact-once original writing-area/PDF-vector accounting on a real student export."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

import pymupdf as fitz
from geometry import TOL, finite_box, horizontal_vectors

ORACLE_SHA = "cac3612a9193b7c27cd04b87601ea92a973b2a9f18e6445e9784f42a10d6969a"
ORIGINAL_SHA = "6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def area_key(source_page, area, question):
    identity = area.get("questionId") if question else f"{area.get('selector')}:{area.get('ordinal')}"
    return (source_page, "question" if question else "free", identity)


def vector_key(page, vector):
    return (page, *(round(vector[k], 6) for k in ("x0", "x1", "y", "thicknessMm")))


def verify_population(pdf, witness, oracle, original_pdf, source_pages=None):
    issues, consumption = [], []

    def fail(code, **details):
        issues.append({"code": code, **details})

    if witness.get("variant") != "student" or not witness.get("sourceComparisonRequired"):
        fail("NATIVE_POPULATION_STUDENT_SOURCE_REQUIRED")
    if witness.get("pdfSha256") != sha(pdf):
        fail("NATIVE_POPULATION_EXPORT_HASH")
    if witness.get("sourceGeometrySha256") != ORACLE_SHA:
        fail("NATIVE_POPULATION_ORACLE_HASH")
    if sha(original_pdf) != ORIGINAL_SHA:
        fail("NATIVE_POPULATION_ORIGINAL_PDF_HASH")

    expected = {}
    original_area_counts, original_vector_counts = Counter(), Counter()
    question_lookup = Counter()
    original_page_ids = [p["physicalPageIndex"] for p in oracle["pages"]]
    if len(original_page_ids) != len(set(original_page_ids)):
        fail("NATIVE_POPULATION_ORACLE_DUPLICATE_PAGE")
    for page in oracle["pages"]:
        source_page = page["physicalPageIndex"]
        for question, field in ((True, "nativeQuestionWritingAreas"), (False, "nativeWritingAreas")):
            for area in page.get(field, []):
                key = area_key(source_page, area, question)
                if key in expected:
                    fail("NATIVE_POPULATION_ORACLE_DUPLICATE_CONTAINER", identity=list(key))
                expected[key] = area
                kind = key[1]
                original_area_counts[kind] += 1
                original_vector_counts[kind] += len(area["referencePdfVectors"])
                if question:
                    question_lookup[area.get("questionId")] += 1
    duplicate_questions = sorted(str(k) for k, count in question_lookup.items() if count != 1)
    if duplicate_questions:
        fail("NATIVE_POPULATION_ORACLE_QUESTION_ID_DUPLICATE", questionIds=duplicate_questions)
    selected = set(original_page_ids if source_pages is None else source_pages)
    if not selected or not selected.issubset(original_page_ids):
        fail("NATIVE_POPULATION_SOURCE_SCOPE")
    expected = {key: value for key, value in expected.items() if key[0] in selected}
    observed = Counter()
    actual_vector_use, original_vector_use = Counter(), Counter()
    actual_sources = [p.get("sourcePage") for p in witness.get("pages", [])]
    if Counter(actual_sources) != Counter(selected):
        fail("NATIVE_POPULATION_SOURCE_PAGES", expected=sorted(selected), actual=actual_sources)

    with fitz.open(pdf) as actual_document, fitz.open(original_pdf) as original_document:
        actual_page_indices = [p.get("pdfPageIndex") for p in witness.get("pages", [])]
        if Counter(actual_page_indices) != Counter(range(1, len(actual_document) + 1)):
            fail("NATIVE_POPULATION_PDF_PAGE_COVERAGE", actual=actual_page_indices,
                 expected=list(range(1, len(actual_document) + 1)))
        original_vectors = {page: horizontal_vectors(original_document[page - 1])[0] for page in selected}
        for page in witness.get("pages", []):
            source_page = page.get("sourcePage")
            pdf_index = page.get("pdfPageIndex")
            if not isinstance(pdf_index, int) or not 1 <= pdf_index <= len(actual_document):
                fail("NATIVE_POPULATION_PDF_PAGE", sourcePage=source_page)
                continue
            vectors = horizontal_vectors(actual_document[pdf_index - 1])[0]
            for writing in page.get("writeBoxes", []):
                if writing.get("writingSpace") != "native-source":
                    continue
                question_id = writing.get("sourceQuestionId")
                question = question_id is not None
                candidate = {"questionId": question_id, "selector": writing.get("nativeSelector"),
                             "ordinal": writing.get("nativeOrdinal")}
                key = area_key(source_page, candidate, question)
                observed[key] += 1
                native = expected.get(key)
                detail = {"identity": list(key), "witnessId": writing.get("id"), "pdfPageIndex": pdf_index}
                if native is None:
                    fail("NATIVE_POPULATION_UNEXPECTED_CONTAINER", **detail)
                    continue
                if writing.get("nativeReference") != native:
                    fail("NATIVE_POPULATION_REFERENCE_IDENTITY", **detail)
                bounds = writing.get("boxMm")
                if not finite_box(bounds):
                    fail("NATIVE_POPULATION_CONTAINER_BOUNDS", **detail)
                    continue
                found = sorted([v for v in vectors if v["x0"] >= bounds[0] - TOL
                                and v["x1"] <= bounds[2] + TOL
                                and bounds[1] - TOL <= v["y"] <= bounds[3] + TOL], key=lambda v: v["y"])
                reference = native["referencePdfVectors"]
                dom_lines = writing.get("nativeLines", [])
                if len(found) != len(reference) or len(dom_lines) != len(reference):
                    fail("NATIVE_POPULATION_VECTOR_COUNT", expected=len(reference),
                         actualPdf=len(found), actualDom=len(dom_lines), **detail)
                vector_records = []
                for ordinal, (actual, original) in enumerate(zip(found, reference)):
                    actual_vector_use[vector_key(pdf_index, actual)] += 1
                    original_vector_use[vector_key(source_page, original)] += 1
                    original_matches = [v for v in original_vectors.get(source_page, [])
                                        if max(abs(v[k] - original[k]) for k in ("x0", "x1", "y", "thicknessMm")) < .0001]
                    if len(original_matches) != 1:
                        fail("NATIVE_POPULATION_ORIGINAL_VECTOR", ordinal=ordinal,
                             originalMatches=len(original_matches), **detail)
                    coordinate_delta = max(abs(actual[k] - original[k]) for k in ("x0", "x1", "y"))
                    thickness_delta = abs(actual["thicknessMm"] - original["thicknessMm"])
                    if coordinate_delta > TOL or thickness_delta > .005:
                        fail("NATIVE_POPULATION_PDF_VECTOR_GEOMETRY", ordinal=ordinal,
                             coordinateDeltaMm=coordinate_delta, thicknessDeltaMm=thickness_delta, **detail)
                    vector_records.append({"ordinal": ordinal, "original": original, "actual": actual,
                                           "coordinateDeltaMm": coordinate_delta, "thicknessDeltaMm": thickness_delta})
                consumption.append({**detail, "originalContainerId": native["id"],
                                    "expectedVectors": len(reference), "actualPdfVectors": len(found),
                                    "actualDomLines": len(dom_lines), "vectors": vector_records})
    missing = [list(key) for key in expected if observed[key] == 0]
    duplicates = [{"identity": list(key), "occurrences": count} for key, count in observed.items() if count > 1]
    if missing:
        fail("NATIVE_POPULATION_MISSING_CONTAINER", identities=missing)
    if duplicates:
        fail("NATIVE_POPULATION_DUPLICATE_CONTAINER", identities=duplicates)
    if any(count != 1 for count in actual_vector_use.values()):
        fail("NATIVE_POPULATION_DUPLICATE_ACTUAL_VECTOR")
    if any(count != 1 for count in original_vector_use.values()):
        fail("NATIVE_POPULATION_DUPLICATE_ORIGINAL_VECTOR")
    expected_vectors = sum(len(area["referencePdfVectors"]) for area in expected.values())
    if len(original_vector_use) != expected_vectors or len(actual_vector_use) != expected_vectors:
        fail("NATIVE_POPULATION_VECTOR_RESIDUAL", expected=expected_vectors,
             originalConsumed=len(original_vector_use), actualConsumed=len(actual_vector_use))
    selected_areas = Counter(key[1] for key in expected)
    selected_vectors = Counter()
    for key, area in expected.items():
        selected_vectors[key[1]] += len(area["referencePdfVectors"])
    return {"status": "failed" if issues else "passed", "issues": issues,
            "pdfSha256": sha(pdf), "originalPdfSha256": sha(original_pdf), "oracleSha256": ORACLE_SHA,
            "scope": "whole-source" if source_pages is None else "focused", "sourcePages": sorted(selected),
            "oracleContainers": dict(original_area_counts), "oracleVectors": dict(original_vector_counts),
            "questionIdsUnique": not duplicate_questions,
            "checked": {"expectedContainers": dict(selected_areas), "expectedVectors": dict(selected_vectors),
                        "observedContainers": sum(observed.values()),
                        "observedContainersByKind": dict(Counter(key[1] for key in observed.elements())),
                        "originalVectorsConsumed": len(original_vector_use),
                        "actualVectorsConsumed": len(actual_vector_use), "missingContainers": len(missing),
                        "duplicateContainers": len(duplicates)},
            "consumption": consumption,
            "limits": ["AI geometry/accounting proof is not human editorial or physical approval."]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--witness", type=Path, required=True)
    parser.add_argument("--oracle", type=Path, required=True)
    parser.add_argument("--original-pdf", type=Path, required=True)
    parser.add_argument("--source-pages", help="Explicit focused source pages; omit only for all oracle pages")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if sha(args.oracle) != ORACLE_SHA:
        raise ValueError("Immutable original writing oracle hash differs")
    witness = json.loads(args.witness.read_text(encoding="utf-8"))
    oracle = json.loads(args.oracle.read_text(encoding="utf-8"))
    selected = [int(p) for p in args.source_pages.split(",")] if args.source_pages else None
    result = verify_population(args.pdf, witness, oracle, args.original_pdf, selected)
    result["witnessSha256"] = sha(args.witness)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": result["status"], "checked": result["checked"], "issues": len(result["issues"])}))
    raise SystemExit(1 if result["issues"] else 0)


if __name__ == "__main__":
    main()
