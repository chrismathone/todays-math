#!/usr/bin/env python3
"""Offline, deterministic family/overlap inventory; never reads credentials or a DB.

First run the TS companion against a completed snapshot. This program only commits
IDs, labels, hashes and counts to --out; parsed textbook text stays in --private.
--reviews can point at a previous taxonomy.json to carry authored review decisions.
"""
import argparse
import collections
import hashlib
import itertools
import json
from pathlib import Path
import re


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def skeleton(value):
    # A deliberately lossy candidate key, never a semantic identity decision.
    return re.sub(r"[0-9]+(?:\.[0-9]+)?", "#", value)


def family(row):
    key = (row.get("familyKey") or "").strip()
    return (row["unitId"], key or "solo:" + row["id"])


def namespace(key):
    if key.startswith("mid:judge:"):
        return "judge"
    if "::" in key and key.startswith("mid:"):
        return "middle-combo"
    return next((name for prefix, name in [("elem:", "elementary"), ("mid:", "middle"),
                ("native-desc:", "native-descriptive"), ("solo:", "solo"), ("textbook:", "textbook-keyed")]
                if key.startswith(prefix)), "other-keyed")


def signatures(row):
    return {
        "payload-exact": row["payload"],
        "content-figure-exact": row["contentExact"],
        "content-only-exact": row["contentOnly"],
        "numeric-content-solution": digest([skeleton(row["content"]), skeleton(row["solution"])]),
        "numeric-question-solution": digest([skeleton(row["question"]), skeleton(row["solution"])]),
    }


def trigrams(text):
    text = re.sub(r"\s+", "", skeleton(text))
    return {text[i:i + 3] for i in range(max(0, len(text) - 2))}


def similarity(a, b):
    return len(a & b) / len(a | b) if a or b else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--snapshot-dir", required=True, type=Path)
    ap.add_argument("--private", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--reviews", type=Path)
    ap.add_argument("--asset-root", type=Path, help="Local public/ folder for reviewed figure-file hashes")
    ap.add_argument("--explain", help="Print private candidate members; do not commit this output")
    args = ap.parse_args()
    meta = json.loads((args.snapshot_dir / "snapshot-meta.json").read_text())
    parse_meta = json.loads((args.private / "parse-meta.json").read_text())
    assert parse_meta["snapshotSha256"] == meta["sha256"]
    units = {u["id"]: u for u in json.loads((args.snapshot_dir / "units.json").read_text())}
    registry = json.loads((args.private / "registry.json").read_text())
    repo = Path(__file__).resolve().parents[3]
    catalogs = {}
    for kind, filename in [("middle", "rpm-type-catalog.json"), ("high", "rpm-high-type-catalog.json")]:
        catalog = json.loads((repo / "scripts" / "rpm" / filename).read_text())
        catalogs[kind] = {book + "|" + t["minor"] + "|" + t["number"]: t
                          for book, entry in catalog.items() for t in entry["types"]}
    reviews = json.loads(args.reviews.read_text()).get("reviewDecisions", []) if args.reviews else []
    rows = []
    groups = {mode: collections.defaultdict(list) for mode in signatures(dict(
        payload="", contentExact="", contentOnly="", content="", solution="", question=""))}
    families = collections.defaultdict(list)
    row_by_id = {}
    for line in (args.private / "parsed.jsonl").open():
        row = json.loads(line)
        row["family"] = family(row)
        row["signatures"] = signatures(row)
        ix = len(rows)
        rows.append(row)
        row_by_id[row["id"]] = row
        families[row["family"]].append(ix)
        for mode, key in row["signatures"].items():
            groups[mode][key].append(ix)
    assert len(rows) == meta["total"]
    assert sum(r["eligible"] for r in rows) == meta["eligible"]
    family_keys = sorted(families)
    family_ix = {f: i for i, f in enumerate(family_keys)}
    registrations_by_family = collections.defaultdict(list)
    for reg in registry["registrations"]:
        if reg.get("familyKey"):
            registrations_by_family[reg["familyKey"]].append(reg)

    inventory = []
    for f in family_keys:
        own = [rows[i] for i in families[f]]
        eligible = [r for r in own if r["eligible"]]
        u = units[f[0]]
        regs = [r for r in registrations_by_family[f[1]] if r.get("grade") == u["grade"]]
        inventory.append({
            "ref": family_ix[f], "unitId": f[0], "key": f[1], "grade": u["grade"],
            "section": u["section"], "namespace": namespace(f[1]),
            "registeredLabels": sorted(set(r["label"] for r in regs)),
            "storedRows": len(own), "eligibleRows": len(eligible),
            "eligibleParsedQuestions": len(set(r["questionHash"] for r in eligible)),
            "eligibleExactPayloads": len(set(r["payload"] for r in eligible)),
            "eligibleNumericQuestionSolutionShapes": len(set(r["signatures"]["numeric-question-solution"] for r in eligible)),
            "formats": dict(sorted(collections.Counter(r["questionType"] or "null" for r in eligible).items())),
            "difficulties": dict(sorted(collections.Counter(r["difficulty"] for r in eligible).items())),
            "sources": dict(sorted(collections.Counter(r["source"] for r in own).items())),
            "representativeId": min(eligible or own, key=lambda r: r["id"])["id"],
        })

    candidates = []
    mode_summary = {}
    family_candidate_modes = collections.defaultdict(collections.Counter)
    candidate_pairs = set()
    for mode, keyed in groups.items():
        counts = collections.Counter()
        touched = set()
        affected_rows = set()
        for key, indices in sorted(keyed.items()):
            by_family = collections.defaultdict(list)
            for ix in indices:
                by_family[rows[ix]["family"]].append(rows[ix])
            if len(by_family) < 2:
                continue
            group_id = mode + ":" + key[:20]
            if args.explain == group_id:
                print(json.dumps({"id": group_id, "rows": [rows[ix] for ix in indices]}, ensure_ascii=False, indent=2))
                return
            members = []
            for f, rs in sorted(by_family.items()):
                eligible = [r for r in rs if r["eligible"]]
                r = min(eligible or rs, key=lambda r: r["id"])
                members.append({"familyRef": family_ix[f], "rows": len(rs), "eligibleRows": len(eligible),
                                "id": r["id"], "payloadSha256": r["payload"]})
                family_candidate_modes[f][mode] += 1
            unit_ids = set(f[0] for f in by_family)
            same_unit_pairs = sum(n * (n - 1) // 2 for n in collections.Counter(f[0] for f in by_family).values())
            pair_count = len(members) * (len(members) - 1) // 2
            # A second, different family might be ineligible; count selectable collisions separately.
            eligible_families = [f for f, rs in by_family.items() if any(r["eligible"] for r in rs)]
            eligible_same_unit_pairs = sum(n * (n - 1) // 2 for n in collections.Counter(f[0] for f in eligible_families).values())
            ns = sorted(set(namespace(f[1]) for f in by_family))
            a, b = members[:2]
            candidates.append({
                "id": group_id, "mode": mode, "signatureSha256": key,
                "decision": "uncertain", "reviewRequired": True,
                "scope": "same-unit" if len(unit_ids) == 1 else "cross-unit-or-mixed",
                "namespaces": ns, "rows": len(indices), "eligibleRows": sum(rows[i]["eligible"] for i in indices),
                "familyPairs": pair_count, "sameUnitPairs": same_unit_pairs,
                "eligibleSameUnitPairs": eligible_same_unit_pairs,
                "figureHashes": len(set(rows[i]["figure"] for i in indices)),
                "answerHashes": len(set(rows[i]["answerHash"] for i in indices)),
                "solutionHashes": len(set(rows[i]["solutionHash"] for i in indices)),
                "representativePairSha256": digest(sorted([a["payloadSha256"], b["payloadSha256"]])),
                "members": members,
            })
            counts["groups"] += 1
            counts["familyPairsWithMultiplicity"] += pair_count
            counts["sameUnitPairsWithMultiplicity"] += same_unit_pairs
            counts["eligibleSameUnitPairsWithMultiplicity"] += eligible_same_unit_pairs
            counts["groupsWithSolo"] += "solo" in ns
            counts["groupsWithSchoolTextbook"] += any(rows[i]["source"] == "school_textbook" for i in indices)
            counts["groupsWithEngine"] += any(n in ns for n in ["elementary", "middle", "middle-combo", "judge", "native-descriptive"])
            touched.update(by_family)
            affected_rows.update(indices)
            for a_ref, b_ref in itertools.combinations(sorted(family_ix[f] for f in by_family), 2):
                candidate_pairs.add((a_ref, b_ref))
        mode_summary[mode] = {**dict(counts), "families": len(touched), "rows": len(affected_rows)}
    if args.explain:
        raise SystemExit("Unknown candidate ID")

    # Wording changes need an additional, explicitly heuristic screen. Inspect the
    # four most frequent question+solution shapes per engine family, within units.
    # Keep task choices for this screen: a generic MC lead is insufficient evidence.
    representatives = {}
    engine_by_unit = collections.defaultdict(list)
    compared_shape_pairs = 0
    for f in family_keys:
        if namespace(f[1]) == "solo":
            continue
        own = [rows[i] for i in families[f] if rows[i]["eligible"]]
        shapes = collections.defaultdict(list)
        for row in own:
            shape = digest([skeleton(row["content"]), skeleton(row["solution"])])
            shapes[shape].append(row)
        selected = sorted(shapes, key=lambda s: (-len(shapes[s]), s))[:4]
        representatives[f] = [(min(shapes[s], key=lambda r: r["id"]),
                               trigrams(shapes[s][0]["content"]), trigrams(shapes[s][0]["solution"])) for s in selected]
        engine_by_unit[f[0]].append(f)
    lexical = []
    for unit_id in sorted(engine_by_unit):
        for fa, fb in itertools.combinations(engine_by_unit[unit_id], 2):
            best = None
            for a, aq, az in representatives[fa]:
                for b, bq, bz in representatives[fb]:
                    compared_shape_pairs += 1
                    q_score = similarity(aq, bq)
                    if q_score < 0.60:
                        continue
                    s_score = similarity(az, bz)
                    score = 0.65 * q_score + 0.35 * s_score
                    if score < 0.65:
                        continue
                    rank = (score, q_score, s_score, a["id"], b["id"])
                    if best is None or rank > best[0]:
                        best = (rank, a, b)
            if best is not None:
                rank, a, b = best
                lexical.append({"id": "lexical:" + digest([fa, fb])[:20], "decision": "uncertain",
                                "familyRefs": [family_ix[fa], family_ix[fb]], "ids": [a["id"], b["id"]],
                                "questionSimilarity": round(rank[1], 6), "solutionSimilarity": round(rank[2], 6),
                                "score": round(rank[0], 6), "figureHashesEqual": a["figure"] == b["figure"],
                                "payloadSha256": [a["payload"], b["payload"]],
                                "pairSha256": digest(sorted([a["payload"], b["payload"]]))})
    lexical.sort(key=lambda c: (-c["score"], c["id"]))

    # A complete row-level ledger stays private; durable evidence stores only representative hashes.
    for r in reviews:
        rs = [row_by_id[i] for i in r["ids"]]
        r["familyRefs"] = [family_ix[x["family"]] for x in rs]
        r["payloadSha256"] = [x["payload"] for x in rs]
        r["pairSha256"] = digest(sorted(x["payload"] for x in rs))
        r["candidateIds"] = sorted(c["id"] for c in candidates if all(any(m["familyRef"] == family_ix[x["family"]] for m in c["members"]) for x in rs)
                                   and all(x["signatures"][c["mode"]] == c["signatureSha256"] for x in rs))
    reviewed_ids = set(i for r in reviews for i in r["ids"])
    reviewed_family_refs = set(f for r in reviews for f in r["familyRefs"])
    row_evidence = {}
    asset_root = (args.asset_root or args.snapshot_dir.parent.parent / "public").resolve()
    if reviewed_ids:
        for line in (args.snapshot_dir / "snapshot.jsonl").open():
            row = json.loads(line)
            if row["id"] not in reviewed_ids:
                continue
            files = []
            for url in row.get("figureUrls") or []:
                target = (asset_root / url.lstrip("/")).resolve()
                files.append({"url": url, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()
                              if target.is_relative_to(asset_root) and target.is_file() else None})
            row_evidence[row["id"]] = {
                **{k: row.get(k) for k in ["id", "unitId", "familyKey", "source", "sourceMaterialId", "questionNumber", "originProblemId", "externalId"]},
                "unit": {k: units[row["unitId"]][k] for k in ["grade", "chapter", "section"]},
                "contentSha256": hashlib.sha256(row["content"].encode()).hexdigest(),
                "answerSha256": hashlib.sha256((row.get("answer") or "").encode()).hexdigest(),
                "solutionSha256": hashlib.sha256((row.get("solution") or "").encode()).hexdigest(),
                "figureSvgSha256": hashlib.sha256(row["figureSvg"].encode()).hexdigest() if row.get("figureSvg") else None,
                "figureFiles": files,
            }
        for r in reviews:
            assert r["decision"] in ["same", "different", "uncertain"]
            r["rowEvidence"] = [row_evidence[i] for i in r["ids"]]
            r["unitScope"] = "same-unit" if len({e["unitId"] for e in r["rowEvidence"]}) == 1 else "cross-unit"
    inherited = [r for r in rows if r.get("originProblemId")]
    inheritance_mismatches = [r["id"] for r in inherited if r["originProblemId"] in row_by_id
                              and r["family"] != row_by_id[r["originProblemId"]]["family"]]
    registered = []
    for reg in registry["registrations"]:
        match = [f for f in family_keys if reg.get("familyKey") == f[1] and reg.get("grade") == units[f[0]]["grade"]]
        index_entry = catalogs.get(reg["kind"], {}).get(reg.get("key"))
        index_label = {"status": "not-index-key"} if index_entry is None else {
            "status": "exact-label" if reg["label"] == index_entry["title"] else "different-label",
            "label": index_entry["title"], "page": index_entry["page"]}
        registered.append({**reg, "storedFamilyRefs": [family_ix[f] for f in match],
                           "indexLabel": index_label,
                           "storedRows": sum(inventory[family_ix[f]]["storedRows"] for f in match),
                           "eligibleRows": sum(inventory[family_ix[f]]["eligibleRows"] for f in match)})
    for f, item in zip(family_keys, inventory):
        item["candidateGroups"] = dict(sorted(family_candidate_modes[f].items()))
        item["semanticReview"] = "representative-pair-reviewed" if family_ix[f] in reviewed_family_refs else "unreviewed"
    ns_summary = {}
    for ns in sorted(set(f["namespace"] for f in inventory)):
        fs = [f for f in inventory if f["namespace"] == ns]
        ns_summary[ns] = {"families": len(fs), "eligibleFamilies": sum(f["eligibleRows"] > 0 for f in fs),
                          "rows": sum(f["storedRows"] for f in fs), "eligibleRows": sum(f["eligibleRows"] for f in fs)}
    stored_registry = json.loads((args.snapshot_dir / "families.json").read_text())
    registry_set = {(r["unitId"], r["familyKey"].strip()) for r in stored_registry}
    output = {
        "schemaVersion": 1, "snapshot": meta, "sourceHead": registry["sourceHead"],
        "scope": "All snapshot rows and all current elementary/middle/combo/judge/high/native registrations; label inventory is not original exam evidence",
        "normalization": {
            "payload-exact": "SHA256 JS JSON [content,answer,solution,figureSvg,figureUrls,choiceFigureIndex], raw bytes preserved",
            "content-figure-exact": "NFC and whitespace-only normalization of content plus exact figure/URL/choice-index digest; answer and solution may differ",
            "content-only-exact": "Normalized content only; figure, answer and solution may differ",
            "numeric-content-solution": "Numeric tokens replaced with # in normalized full content and solution; no semantic/figure inference",
            "numeric-question-solution": "Numeric tokens replaced with # in shared-parser question and solution; choice tasks may need choices to distinguish them",
            "pairSha256": "SHA256 compact UTF-8 JSON of lexicographically sorted payload SHA256 strings",
        },
        "coverage": {
            "automatedRows": len(rows), "automatedEligibleRows": sum(r["eligible"] for r in rows),
            "parserErrors": parse_meta["parseErrors"], "storedFamilyIdentities": len(inventory),
            "storedFamilyRegistryEntries": len(stored_registry), "emptyRegistryEntries": len(registry_set - set(family_keys)),
            "familyIdentitiesMissingRegistry": len(set(family_keys) - registry_set),
            "registeredTypes": len(registered), "registeredByKind": dict(collections.Counter(r["kind"] for r in registered)),
            "candidatePairUnion": len(candidate_pairs),
            "semanticReviewPairs": len(reviews), "semanticReviewRows": len(reviewed_ids),
            "semanticReviewFamilies": len(reviewed_family_refs),
            "semanticDecisions": dict(collections.Counter(r["decision"] for r in reviews)),
            "semanticReviewIsExhaustive": False,
            "lexicalComparedShapePairs": compared_shape_pairs, "lexicalCandidatePairs": len(lexical),
            "originChildren": len(inherited), "originFamilyMismatches": inheritance_mismatches,
            "originsOutsideSnapshot": sum(r["originProblemId"] not in row_by_id for r in inherited),
            "blankOrNullFamilyKeys": sum(not (r["familyKey"] or "").strip() for r in rows),
        },
        "namespaceSummary": ns_summary, "overlapSummary": mode_summary,
        "indexLabelSummary": {kind: {"catalogKeys": len(catalogs[kind]),
                                     "registered": sum(r["kind"] == kind for r in registered),
                                     "statuses": dict(collections.Counter(r["indexLabel"]["status"] for r in registered if r["kind"] == kind)),
                                     "evidence": "Index labels only; not original questions or exam proof"} for kind in catalogs},
        "indexCatalog": {kind: [{"key": key, "label": entry["title"], "page": entry["page"],
                                  "registered": any(r.get("key") == key and r["kind"] == kind for r in registered)}
                                 for key, entry in sorted(catalog.items())] for kind, catalog in catalogs.items()},
        "reviewDecisions": reviews, "families": inventory,
        "registrations": registered, "highHolds": registry["highHolds"],
        "elementaryCombos": registry["elementaryCombos"], "candidateGroups": candidates,
        "lexicalScreen": {"scope": "Within-unit eligible engine families; four most frequent full content+solution numeric shapes per family",
                          "method": "Character-trigram Jaccard; question>=0.60; 0.65*question+0.35*solution>=0.65; candidate only",
                          "candidatePairs": lexical},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    (args.private / "summary.json").write_text(json.dumps({k: output[k] for k in ["coverage", "namespaceSummary", "overlapSummary"]}, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"out": str(args.out), **output["coverage"], "overlapSummary": mode_summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
