"""Stream the coordinator's immutable snapshot; emit identifiers, hashes and counts only.

Usage: python type-audit-textbook.py SNAPSHOT_DIR PRIVATE_CHECKS_DIR REPORT_JSON
No database, network, provider, import or source mutation is performed.
"""
import collections
import hashlib
import json
import re
import statistics
import sys
from pathlib import Path


def digest(value):
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(data.encode()).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def fig(row):
    return bool(row["figureSvg"] or row["figureUrls"])


def bundle(row):
    return digest({key: row[key] for key in ["content", "answer", "solution", "figureSvg", "figureUrls", "figureDims", "figureSourceMm", "choiceFigureIndex"]})


def count(rows, key):
    return dict(sorted(collections.Counter(str(row.get(key)) for row in rows).items()))


def features(row):
    prompt = row["content"]
    masked = re.sub(r"\$[^$]*\$", "", prompt)
    return {
        "promptChars": len(prompt), "solutionChars": len(row["solution"] or ""),
        "mathSpans": len(re.findall(r"\$[^$\n]+\$", prompt)),
        "subquestionMarkers": len(re.findall(r"[⑴-⒇]|\([1-9]\d?\)", masked)),
        "conditionPhrases": len(re.findall(r"일 때|인 경우|조건|단[, )]|서로 다른|적어도|이상|이하|미만|초과", masked)),
        "reasoningWord": bool(re.search(r"증명|설명하|이유", masked)),
        "solutionMathSpans": len(re.findall(r"\$[^$\n]+\$", row["solution"] or "")),
    }


def complexity(rows):
    if not rows:
        return {"rows": 0}
    fs = [r.get("features") or features(r) for r in rows]
    return {
        "rows": len(rows), "difficulty": count(rows, "difficulty"),
        "problemTypes": count(rows, "problemType"), "questionTypes": count(rows, "questionType"),
        "median": {key: statistics.median(f[key] for f in fs) for key in ["promptChars", "solutionChars", "mathSpans", "subquestionMarkers", "conditionPhrases", "solutionMathSpans"]},
        "multipleSubquestionMarkers": sum(f["subquestionMarkers"] > 1 for f in fs),
        "reasoningWordRows": sum(f["reasoningWord"] for f in fs),
        "applicationMetadataRows": sum(r.get("problemType") == "활용" for r in rows),
    }


def main():
    root, checks, output = map(Path, sys.argv[1:])
    read = lambda name: json.loads((root / name).read_text())
    meta = read("snapshot-meta.json")
    assert meta["readOnly"] and meta["isolation"] == "RepeatableRead"
    assert file_hash(root / "snapshot.jsonl") == meta["sha256"]
    units = {r["id"]: r for r in read("units.json")}
    materials = {r["id"]: r for r in read("materials.json")}
    families = {(r["unitId"], r["familyKey"]): r for r in read("families.json")}
    books = {r["id"]: r for r in read("books.json")} if (root / "books.json").exists() else {}
    extra = {r["id"]: r for r in read("materials-extra.json")} if (root / "materials-extra.json").exists() else {}
    extra_differences = []
    for mid, mat in materials.items():
        if mid in extra:
            changed = [key for key in mat if mat[key] != extra[mid].get(key)]
            if changed:
                extra_differences.append({"id": mid, "fields": changed})
            materials[mid] = {**extra[mid], **mat}
    originals, engine, linked = {}, [], []
    total = 0
    for line in (root / "snapshot.jsonl").open():
        r = json.loads(line)
        total += 1
        if r["source"] == "school_textbook":
            originals[r["id"]] = r
        elif r["source"] == "manual" and (r["familyKey"] or "").startswith(("mid:", "elem:", "native-desc:")):
            engine.append({**{key: r[key] for key in ["id", "unitId", "familyKey", "eligible", "difficulty", "problemType", "questionType"]}, "features": features(r)})
        if r["originProblemId"]:
            linked.append(r)
    assert total == meta["total"]
    children = [r for r in linked if r["originProblemId"] in originals]
    by_parent, by_unit, by_material, by_book, engine_units = [collections.defaultdict(list) for _ in range(5)]
    for row in engine:
        engine_units[row["unitId"]].append(row)
    for row in children:
        by_parent[row["originProblemId"]].append(row)
    for row in originals.values():
        by_unit[row["unitId"]].append(row)
        by_material[row["sourceMaterialId"]].append(row)
        if row["sourceMaterialId"] in materials:
            by_book[materials[row["sourceMaterialId"]]["bookId"]].append(row)
    regen = json.loads((checks / "regeneration.json").read_text())
    high = json.loads((checks / "high-reference-private.json").read_text())
    high_entries = high["entries"]
    bindings = {r["externalId"]: r for r in regen["bindings"]}
    pairs, original_inventory, edges, issues = {}, [], [], []
    for row in sorted(originals.values(), key=lambda r: r["id"]):
        slots = [r for r in by_parent[row["id"]] if r["source"] == "transformed" and r["externalId"] in [f'tb-retry-v1:{row["id"]}:1', f'tb-retry-v1:{row["id"]}:2']]
        ready = [r for r in slots if r["eligible"] and r["unitId"] == row["unitId"]]
        pairs[row["id"]] = len(ready)
        if len(ready) > 2:
            raise ValueError("duplicate designated slots")
        family = families.get((row["unitId"], row["familyKey"]))
        original_inventory.append({
            "id": row["id"], "code": row["problemCode"], "unitId": row["unitId"],
            "materialId": row["sourceMaterialId"], "familyKey": row["familyKey"],
            "eligible": row["eligible"], "rowSha256": digest(row), "payloadSha256": bundle(row),
            "readySlots": len(ready), "children": [c["id"] for c in by_parent[row["id"]]],
            "features": features(row),
        })
        if row["originProblemId"] or row["unitId"] not in units or row["sourceMaterialId"] not in materials or not family:
            issues.append({"id": row["id"], "kind": "source-reference-or-registry"})
        elif row["problemCode"].split("-")[-2] != family["familyCode"]:
            issues.append({"id": row["id"], "kind": "family-code"})
    numeric = re.compile(r"\d+(?:\.\d+)?")
    skeleton = lambda text: re.sub(r"\s", "", numeric.sub("#", text))
    for row in sorted(children, key=lambda r: r["id"]):
        parent = originals[row["originProblemId"]]
        designated = row["externalId"] in [f'tb-retry-v1:{parent["id"]}:1', f'tb-retry-v1:{parent["id"]}:2']
        evidence = bindings.get(row["externalId"])
        mismatches = [k for k in ["unitId", "familyKey", "sourceMaterialId", "questionType", "difficulty", "problemType"] if row[k] != parent[k]]
        edges.append({
            "id": row["id"], "code": row["problemCode"], "parentId": parent["id"],
            "designated": designated, "eligible": row["eligible"], "payloadSha256": bundle(row),
            "mismatches": mismatches,
            "promptSame": re.sub(r"\s", "", row["content"]) == re.sub(r"\s", "", parent["content"]),
            "numericTokensSame": numeric.findall(row["content"]) == numeric.findall(parent["content"]),
            "numericSkeletonSame": skeleton(row["content"]) == skeleton(parent["content"]),
            "answerSame": row["answer"] == parent["answer"], "solutionSame": row["solution"] == parent["solution"],
            "sourceFigure": fig(parent), "childFigure": fig(row),
            "sourceFigureSha256": digest({k: parent[k] for k in ["figureSvg", "figureUrls", "choiceFigureIndex"]}),
            "childFigureSha256": digest({k: row[k] for k in ["figureSvg", "figureUrls", "choiceFigureIndex"]}),
            "solutionChars": len(row["solution"] or ""),
            "exactRecipe": evidence["recipe"] if evidence else None,
            "regenerationPayloadMatch": not evidence["differences"] if evidence else None,
        })

    def stats(rows):
        ids = {r["id"] for r in rows}
        ch = [r for r in children if r["originProblemId"] in ids]
        return {
            "originals": len(rows), "eligible": sum(r["eligible"] for r in rows),
            "held": sum(not r["eligible"] for r in rows),
            "soloFamilies": len({r["familyKey"] for r in rows if (r["familyKey"] or "").startswith("solo:")}),
            "semanticEngineMappedOriginals": sum((r["familyKey"] or "").startswith(("mid:", "elem:")) for r in rows),
            "withFigure": sum(fig(r) for r in rows),
            "readyPairs": sum(pairs[r["id"]] == 2 for r in rows),
            "eligibleWithoutPair": sum(r["eligible"] and pairs[r["id"]] != 2 for r in rows),
            "linkedVariants": len(ch), "eligibleVariants": sum(r["eligible"] for r in ch),
        }

    unit_inventory = []
    for uid, rows in sorted(by_unit.items()):
        erows = engine_units[uid]
        unit_inventory.append({
            **units[uid], **stats(rows),
            "engineRowsSameUnit": len(erows), "eligibleEngineRowsSameUnit": sum(r["eligible"] for r in erows),
            "engineFamilyCountSameUnit": len({r["familyKey"] for r in erows}),
            "sourceComplexity": complexity(rows), "engineComplexity": complexity(erows),
            "registeredHighTypesExactSection": sum(e["unitSection"] == units[uid]["section"] for e in high_entries) if units[uid]["grade"] == "공통수학1" else 0,
        })
    material_inventory = []
    for mid, mat in sorted(materials.items()):
        material_inventory.append({
            **{k: mat[k] for k in ["id", "externalKey", "bookId", "kind"]},
            "sourceFileSha256": digest(mat["sourceFile"]),
            "hasUnitRaw": bool(mat["unitRaw"]), "hasLevelRaw": bool(mat["levelRaw"]),
            "chapterNo": mat.get("chapterNo"), "middleNo": mat.get("middleNo"), "sectionNo": mat.get("sectionNo"),
            **stats(by_material[mid]),
        })
    book_inventory = []
    for bid, rows in sorted(by_book.items()):
        book_inventory.append({"id": bid, "metadata": books.get(bid), **stats(rows), "materials": sum(m["bookId"] == bid for m in materials.values()), "grades": dict(collections.Counter(units[r["unitId"]]["grade"] for r in rows))})
    grades = collections.defaultdict(list)
    for row in originals.values():
        grades[units[row["unitId"]]["grade"]].append(row)
    repeated_numbers = []
    for mid, rows in by_material.items():
        q = collections.Counter(r["questionNumber"] for r in rows if r["questionNumber"] is not None)
        repeated = {n for n, qty in q.items() if qty > 1}
        if repeated:
            repeated_numbers.append({"materialId": mid, "repeatedNumbers": len(repeated), "rows": sum(q[n] for n in repeated)})
    exact = [r for r in edges if r["regenerationPayloadMatch"]]
    edge_groups = {}
    for name, subset in [("designated", [r for r in edges if r["designated"]]), ("recovery", [r for r in edges if not r["designated"]])]:
        edge_groups[name] = {
            "total": len(subset), "eligible": sum(r["eligible"] for r in subset),
            "promptSame": sum(r["promptSame"] for r in subset),
            "numericTokensSame": sum(r["numericTokensSame"] for r in subset),
            "numericSkeletonSame": sum(r["numericSkeletonSame"] for r in subset),
            "answerSame": sum(r["answerSame"] for r in subset),
            "solutionSame": sum(r["solutionSame"] for r in subset),
            "figureTransitions": dict(collections.Counter(f'{int(r["sourceFigure"])}->{int(r["childFigure"])}' for r in subset)),
            "mismatchFields": dict(collections.Counter(k for r in subset for k in r["mismatches"])),
        }
    math_reports = {}
    for name in ["core", "geometry", "calculus"]:
        path = checks / f"{name}-math.json"
        if path.exists():
            data = json.loads(path.read_text())
            math_reports[name] = {"sha256": file_hash(path), "summary": {k: v for k, v in data.items() if isinstance(v, (str, int, bool))}, "failureCount": len(data.get("failures", []))}
    # Bounded actual-text rereads; these are observations, not an inferred source map.
    comparisons = [
        ("7d3eb474-bbc0-4cd8-b5f7-94055f7e348c", "265662e7-2f5b-4eee-8919-813435427732", "문자식의 문맥 해석과 네 진술 판정 대 사다리꼴 넓이 식 한 개. 원문은 틀린 두 진술을 바로잡고, 엔진은 공식과 식을 제시한다. 같은 차시지만 동일 세부 목표는 아니다."),
        ("d7ed757b-fafd-4aed-b644-68d3912b2e4b", "24de8b35-9aaa-4458-a738-cfafd1cf0b9c", "원문은 두 단일 사건과 동시 사건을 세 소문항으로 연결한다. 엔진은 다른 표본공간의 독립 사건을 한 물음으로 결합한다. 두 해설 모두 독립성과 곱의 근거를 제시한다."),
        ("f72e7506-a13a-4a08-bc1b-73ae5e5d715c", "3faed81e-ae20-4471-8b57-08c93d17ccac", "원문은 여러 도형에서 합동의 충분조건을 판정하고, 엔진은 합동을 가정한 대응각을 계산한다. 원문 해설은 맞는 보기만 설명하며 반례는 생략한다. 같은 기본 난이도라도 요구 사고가 다르다."),
        ("ab3cc3fb-9c21-4890-828f-4c644b52375b", "e3fda641-f766-4e42-931f-72562c211730", "원문은 밑이 같은 곱셈을 네 소문항으로 변주하고, 엔진은 나눗셈과 음의 지수 차이를 한 물음으로 다룬다. 두 해설의 짧음은 같은 의미가 아니며, 서로 다른 지수법칙이다."),
        ("5f2f428e-64c6-428d-95b4-d6950fbdd33f", "12a8ffc3-4e21-4555-be1d-b870a03bf11b", "원문은 이항 후 차수와 항등식을 구분한다. 엔진은 분모를 없애는 최소 배수를 찾는다. 두 해설은 각 목표에 필요한 근거를 제시하지만 같은 차시만으로 대체할 수 없다."),
        ("da91df9d-99dd-4fc1-aec7-12cce53e6c30", "0098b56c-d826-4d99-ae87-9eda88420b7d", "두 문항 모두 소인수분해를 요구하고 답의 소인수 곱을 재계산해 일치를 확인했다. 원문 네 수 대 엔진 한 수이므로 문항 수와 연습량을 같은 수로 세지 않는다."),
        ("cbdc2852-eefa-45d8-a427-e72f93276f97", "e85eaa39-d15f-4830-9b7e-bc645813be05", "원문은 두 문맥을 방정식으로 표현한다. 엔진은 주어진 순서쌍이 두 방정식을 모두 만족하는지 판정한다. 보기별 재대입에서 기록 답은 맞지만 엔진 해설은 일반 방법만 있고 각 보기의 계산과 판정은 없다."),
    ]
    comparison_ids = {value for pair in comparisons for value in pair[:2]}
    reference_rows = {}
    for line in (root / "snapshot.jsonl").open():
        row = json.loads(line)
        if row["id"] in comparison_ids:
            reference_rows[row["id"]] = row
    comparison_notes = []
    for sid, eid, rationale in comparisons:
        src, ref = reference_rows[sid], reference_rows[eid]
        assert src["unitId"] == ref["unitId"] and src["eligible"] and ref["eligible"]
        comparison_notes.append({"kind": "stored-same-unit-agent-reread", "sourceId": sid, "engineId": eid, "unitId": src["unitId"], "sourcePayloadSha256": bundle(src), "enginePayloadSha256": bundle(ref), "sourceDifficulty": src["difficulty"], "engineDifficulty": ref["difficulty"], "rationale": rationale})
    high_sources = [
        ("2f30b5a2-0c54-4ce9-a08b-87f251c907e6", "공통수학1|다항식의 연산|01", "원문은 한 다항식을 두 기준으로 정리한다. 생성 참조는 다항식 관계식에서 미지 다항식을 푼다. 해당 표본은 원문 연산/엔진 응용으로, 같은 차시 안에서도 후자가 더 많은 조작을 요구한다."),
        ("23dcb438-7c59-4508-8d76-53ac099c59a0", "공통수학1|복소수|09", "원문은 네 작은 거듭제곱 합, 생성 참조는 가중된 긴 합을 네 항 주기로 묶는다. 주기라는 목표를 공유하지만 추론 부담과 연습 구성이 다르다. 두 풀이의 주기 합은 재계산과 일치한다."),
        ("05764bcf-e4fd-4341-a2ad-a361cc9f7218", "공통수학1|행렬|06", "원문은 두 수치 행렬의 양방향 곱과 비가환성을 확인한다. 생성 참조는 근과 계수 관계를 행렬 곱에 결합한다. 둘 다 기본으로 기록됐지만 필요한 선행 지식이 다르다. 성분 계산과 최종값을 다시 확인했다."),
        ("258f4198-51d5-43c6-a3ab-4014b3c2c065", "공통수학1|경우의 수와 순열|01", "원문은 세 문맥의 곱의 법칙, 생성 참조는 겹치지 않는 두 주사위 사건의 합의 법칙을 다룬다. 원문과 생성 참조의 풀이가 각각 충분해도 동일 세부 목표로 세지 않는다."),
    ]
    for sid, key, rationale in high_sources:
        src = originals[sid]
        ref = next(e for e in high["examples"] if e["key"] == key)
        assert units[src["unitId"]]["section"] == ref["unitSection"]
        comparison_notes.append({"kind": "fresh-generated-reference-agent-reread", "sourceId": sid, "sourcePayloadSha256": bundle(src), "engineKey": key, "seed": ref["seed"], "variant": ref["variant"], "engineOutputSha256": digest(ref), "sourceDifficulty": src["difficulty"], "engineDifficulty": ref["difficulty"], "rationale": rationale})
    visual_path = checks / "figures" / "visual-evidence.json"
    visual = json.loads(visual_path.read_text()) if visual_path.exists() else None
    result = {
        "schema": "math-type-audit-textbook-v1", "snapshot": meta,
        "inputs": {name: file_hash(root / name) for name in ["snapshot-meta.json", "units.json", "families.json", "materials.json"] + (["books.json"] if books else []) + (["materials-extra.json", "metadata-extra.json"] if extra else [])},
        "digestConvention": "SHA-256 of UTF-8 compact sorted-key JSON, ensure_ascii=False, including nulls; snapshot byte hash comes from coordinator.",
        "scope": {**stats(list(originals.values())), "children": len(children), "materials": len(materials), "books": len(by_book), "units": len(by_unit)},
        "byGrade": {grade: stats(rows) for grade, rows in sorted(grades.items())},
        "questionTypes": count(list(originals.values()), "questionType"),
        "problemTypes": count(list(originals.values()), "problemType"),
        "solutionSources": count(list(originals.values()), "solutionSource"),
        "materialKinds": {kind: stats([r for r in originals.values() if materials[r["sourceMaterialId"]]["kind"] == kind]) for kind in sorted({m["kind"] for m in materials.values()})},
        "readiness": dict(collections.Counter(str(pairs[r["id"]]) for r in originals.values())),
        "edgeSummary": edge_groups,
        "registryIssues": issues, "repeatedQuestionNumbers": repeated_numbers,
        "supplementalMetadata": {"measurement": read("metadata-extra.json") if extra else None, "overlappingFieldsDiffer": extra_differences, "missingFields": {k: sum(m.get(k) is None for m in materials.values()) for k in ["chapterNo", "middleNo", "sectionNo", "unitRaw", "semester", "round", "sequence"]}},
        "complexity": {"textbook": complexity(list(originals.values())), "engine": complexity(engine), "unitsBothSources": sum(bool(engine_units[uid]) for uid in by_unit), "unitsTextbookOnly": sum(not engine_units[uid] for uid in by_unit), "heuristicOnly": "String lengths/markers and stored difficulty are descriptive proxies. They do not score reasoning quality, prove objectives, or calibrate learning levels."},
        "boundedComparisons": comparison_notes,
        "candidateRereads": {
            "sameNumericTokensEligible": {"count": 22, "status": "reread-all-current-prompts-parents-answers-solutions", "finding": "Signs, Korean number words, domains, interval endpoints, operators, symbol choices and matrix dimensions can change while Arabic numeral lists stay identical. No unchanged prompt or newly confirmed wrong answer follows from this flag.", "limit": "Agent mathematical reread for 21, exact CAS recomputation also applies to the remaining one; not a calibrated model evaluation."},
            "shortSolutions": {"count": 153, "recipes": dict(collections.Counter(r["exactRecipe"] for r in edges if r["solutionChars"] <= 50)), "finding": "All are exact-substitution, finite-count or prime-factor questions with freshly recomputed answers. Length alone is not evidence of an incorrect or insufficient solution; CAS answer agreement is not a proof of every explanatory step."},
            "blockedFigureLoss": {"count": 7, "finding": "All seven recovery rows contain replacement text/table/condition statements, rather than an absent picture placeholder alone. The absent original images were not reread for these seven; correspondence remains pending, and all remain ineligible."},
            "blockedQuestionTypeChange": {"count": 1, "id": "ff58ab6f-770c-4b93-a16e-56a83ab212b4", "finding": "Parent text is truncated and the recovery child supplies a short-answer geometry question; both are blocked, so this does not inflate ready inventory."},
        },
        "figureReread": {"sha256": file_hash(visual_path), "evidence": visual, "reread": "All 15 sheets (15 imported originals with 16 raster assets, 30 current inline SVG children) were visually inspected. No published page was opened. Graph direction/labels, table cells, prime-cell shapes and question conditions were compared; no general proof of all graph geometry or all mathematical answers is claimed.", "confirmedLocalLayoutFinding": "Two current inline condition-box SVGs have text extending outside their rectangular border. Both reproduce in Chromium SVG DOM geometry; text stays inside the SVG viewBox and is also present in the prompt, so no missing-condition or wrong-answer conclusion follows."} if visual else None,
        "exactCorrespondence": {"supported": regen["supported"], "storedPayloadsMatched": len(exact), "storedPairsMatched": len(exact) // 2, "supportedSlotsMissing": [r for r in regen["bindings"] if r["childId"] is None], "storedMismatches": [r for r in regen["bindings"] if r["childId"] and r["differences"]], "sourceDigestLimit": regen["sourceDigestLimit"], "independentRecomputation": math_reports},
        "candidateIds": {
            "sameNumericTokens": [r["id"] for r in edges if r["numericTokensSame"]],
            "solutionAtMost50Chars": [r["id"] for r in edges if r["solutionChars"] <= 50],
            "missingSourceFigure": [r["id"] for r in edges if r["sourceFigure"] and not r["childFigure"]],
            "questionTypeChanged": [r["id"] for r in edges if "questionType" in r["mismatches"]],
        },
        "limits": [
            "All original families are solo identifiers, not a semantic taxonomy; unit overlap is not provenance or same-objective proof.",
            "Published books, original HWP/HWPX/PDF, and off-machine machine-review packets were not opened by this audit.",
            "Fresh independent arithmetic proof covers only the recorded exact-template payloads, not the other linked variants or all original solutions.",
            "Source/figure byte correspondence and feature flags alone do not establish geometric correctness, curriculum-standard alignment or measured learning effects.",
        ],
        "bookInventory": book_inventory, "materialInventory": material_inventory,
        "unitInventory": unit_inventory, "originalInventory": original_inventory, "variantInventory": edges,
    }
    assert result["scope"]["originals"] == meta["sources"]["school_textbook"]["total"]
    assert result["scope"]["eligible"] == meta["sources"]["school_textbook"]["eligible"]
    assert sum(r["originals"] for r in result["byGrade"].values()) == len(originals)
    assert sum(r["originals"] for r in material_inventory) == len(originals)
    assert sum(r["originals"] for r in unit_inventory) == len(originals)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"scope": result["scope"], "edgeSummary": edge_groups, "exactMatched": len(exact), "outputBytes": output.stat().st_size}, ensure_ascii=False))


if __name__ == "__main__":
    main()
