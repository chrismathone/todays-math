"""Prepare only the frozen 229 answer targets from existing local dumps.

Read-only HWP parsing reuses the existing reader/segmenter, not any solver,
collector or answer comparator. All source-bearing output goes outside Git.
No network, model CLI, browser, DB, COM, render server or production writes.
"""
from __future__ import annotations

import argparse
import collections
import dataclasses
import hashlib
import json
import re
import sys
import unicodedata
import zipfile
import zlib
from pathlib import Path

from review_core import (content_holds, digest, file_record, join_targets, json_bytes,
                         packet_manifest, project, prompt_bytes, require_external, verify_packet, verify_records)

REPO = Path(__file__).resolve().parents[3]
ALLOWED_OUT = Path("/Users/pss/Desktop/creative/display-survey/textbook-answer-review-20261021")
sys.path.insert(0, str(REPO / "scripts/qa/textbook-verify"))
sys.path.insert(0, str(REPO / "scripts/import/textbook"))
import hwp5_flow  # noqa: E402 -- existing local reader, no modification
from segment import segment  # noqa: E402
import olefile  # noqa: E402 -- existing textbook-verify venv dependency


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_json(path, value):
    with path.open("xb") as handle: handle.write(json_bytes(value))


def write_jsonl(path, rows):
    with path.open("x") as handle:
        for row in rows: handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def source_path(value):
    if not re.match(r"^[A-Za-z]:\\", value): raise ValueError("unsupported source path")
    rel = unicodedata.normalize("NFC", value.replace("\\", "/")[3:])
    if ".." in Path(rel).parts: raise ValueError("source traversal")
    return Path("/Volumes/새 볼륨") / rel


def answer_kind(value):
    if not value: return "missing"
    if re.search(r"\[그림\]|\[\[FIG", value): return "image"
    if re.fullmatch(r"[①-⑳\s,]+", value): return "choice_labels"
    if re.search(r"[⑴-⒇]|\([1-9]\d?\)", value): return "subparts"
    if re.fullmatch(r"[$\s+\-−\d.,/{}\\a-z]+", value): return "numeric_or_symbolic"
    return "expression_or_text"


def inspect_source(path, asset_dir):
    """Evidence, not image approval: crops/rotations aren't read by HWP reader."""
    before = file_record(path)
    paras = hwp5_flow.read_paras(path)
    for para in paras:
        if re.match(r"^\[\s*\d{1,3}\s*[~∼\-]\s*\d{1,3}\s*\]", para.text) and "\n" in para.text:
            para.text = re.sub(r"\s*\n\s*", " ", para.text)
    doc = segment(paras)
    owner = collections.defaultdict(list)
    for index, para in enumerate(paras):
        for pic in para.pictures + para.group_pictures:
            owner[id(pic)].append({"para": index, "host": para.host, "parent": para.parent,
                                   "textSha256": digest(para.text.encode())})
    bins = {}
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                if name.lower().startswith("bindata/"):
                    bins[Path(name).stem.upper()] = (name, archive.read(name))
    else:
        with olefile.OleFileIO(str(path)) as ole:
            for item in ole.listdir():
                if len(item) == 2 and item[0] == "BinData":
                    name = "/".join(item)
                    bins[Path(item[1]).stem.upper()] = (name, ole.openstream(item).read())
    problems = collections.defaultdict(list)
    for p in doc.problems:
        figs = []
        for fig in p.figs:
            pic = fig.picture
            evidence = {"picture": dataclasses.asdict(pic), "line": fig.line, "offset": fig.offset,
                        "inTable": fig.in_table, "anchors": owner[id(pic)],
                        "sourceMatch": "segmented_anchor_candidate_only", "presentationVerified": False}
            found = bins.get(pic.bin_id.upper())
            if found:
                name, raw = found
                evidence.update(stream=name, streamBytes=len(raw), streamSha256=digest(raw))
                try:
                    decoded = zlib.decompress(raw, -15); decoding = "raw-deflate"
                except zlib.error:
                    decoded = raw; decoding = "identity"
                sha = digest(decoded)
                dest = asset_dir / (sha + ".bin")
                if not dest.exists(): dest.write_bytes(decoded)
                evidence.update(decodedBytes=len(decoded), decodedSha256=sha, decoding=decoding,
                                auditAsset=str(dest), imageDisclosure="withheld")
            else:
                evidence["streamMissing"] = True
            figs.append(evidence)
        problems[p.key].append({"content": p.text, "markedContent": p.marked_text,
                               "shapes": p.shapes, "tables": p.tables, "figures": figs,
                               "glyphNumber": p.glyph_number,
                               "shapeList": p.shape_list, "lineTables": p.line_tables})
    if file_record(path) != before: raise RuntimeError("frozen SSD source changed while reading")
    return {"source": before, "problems": problems, "paras": len(paras)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", type=Path, required=True)
    parser.add_argument("--freeze", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    out = require_external(args.out, REPO)
    if ALLOWED_OUT.resolve() not in out.parents: raise ValueError("output must be a new run under designated external root")
    freeze = json.loads(args.freeze.read_text())
    changes = verify_records(freeze["files"])
    if changes: raise RuntimeError("STOP: frozen evidence changed: " + json.dumps(changes))
    p = args.inputs
    required = [p / n for n in ["review-20261021.json", "db-20261021.jsonl", "ledger-20261021.jsonl", "orig/problems.jsonl"]]
    frozen_paths = {Path(x["path"]).resolve() for x in freeze["files"]}
    if any(x.resolve() not in frozen_paths for x in required): raise ValueError("input not frozen")
    review = json.loads(required[0].read_text())
    if len(review["answers"]) != 229: raise ValueError("expected exactly 229 answer targets")
    joined = join_targets(review["answers"], *(read_jsonl(x) for x in required[1:]))
    out.mkdir(mode=0o700)  # no overwrite, even on interrupted runs
    for sub in ("audit-assets", "packets", "quarantine", "prompts"):
        (out / sub).mkdir(mode=0o700)
    cache, mappings, vault, packets, figures = {}, [], [], [], []
    for ordinal, row in enumerate(joined, 1):
        target, db, ledger, orig = (row[k] for k in ("target", "db", "ledger", "original"))
        item = {"ordinal": ordinal, "problemCode": target["problemCode"], "externalId": target["externalId"],
                "issues": row["issues"], "packets": []}
        if row["issues"]:
            mappings.append(item);continue
        path = source_path(db["sourceFile"])
        if path.resolve() not in frozen_paths: raise ValueError("SSD source not frozen")
        source_key = str(path)
        if source_key not in cache:
            try: cache[source_key] = inspect_source(path, out / "audit-assets")
            except RuntimeError: raise
            except Exception as error:
                cache[source_key] = {"error": type(error).__name__ + ": " + str(error)}
        source = cache[source_key]
        extracted = source.get("problems", {}).get((orig["section"], orig["number"]), [])
        reread = extracted[0] if len(extracted) == 1 else None
        source_issues = []
        expected_id = "tb-" + hashlib.sha1(db["sourceFile"].encode()).hexdigest()[:16] + f"-{orig['section']}-{orig['number']}"
        if expected_id != target["externalId"]: source_issues.append("source_identity_derivation_mismatch")
        if db["questionNumber"] != orig["number"]: source_issues.append("question_number_mismatch")
        if "error" in source: source_issues.append("hwp_read_error")
        if len(extracted) != 1: source_issues.append("hwp_segment_missing_or_duplicate")
        if reread and reread["content"] != orig["content"]: source_issues.append("hwp_cached_text_mismatch")
        source_figs = reread["figures"] if reread else []
        visual = bool(db["figureUrls"] or any(orig[k] for k in ("figs", "pictures", "shapes", "tables")))
        public = []
        for url in db["figureUrls"]:
            if not url.startswith("/figures/") or ".." in Path(url).parts:
                public.append({"url": url, "status": "not_local_allowlisted"});continue
            local = REPO / "public" / url.lstrip("/")
            if local.is_file():
                record = file_record(local)
                matches = [i for i, f in enumerate(source_figs) if f.get("decodedSha256") == record["sha256"]]
                public.append({"url": url, **record, "exactBinMatches": matches,
                               "originalCorrespondenceVerified": False})
            else: public.append({"url": url, "status": "missing_local", "originalCorrespondenceVerified": False})
        figure_record = {"ordinal": ordinal, "externalId": target["externalId"], "sourcePath": str(path),
                         "sourceFile": source.get("source"), "section": orig["section"], "number": orig["number"],
                         "figures": source_figs, "publicCandidates": public, "needsVisualEvidence": visual,
                         "shapes": orig["shapes"], "tables": orig["tables"], "issues": source_issues,
                         "confirmationPath": "Verify HWP anchor, neighboring problem boundaries, BinData, crop/rotation/flip, grouped labels and table layout; export only student region; seal approved bytes. No COM or browser in stage 1."}
        figures.append(figure_record)
        item.update(bookKey=db["bookKey"], materialKind=db["materialKind"], questionType=db["questionType"],
                    problemType=db["problemType"], sourceFile=db["sourceFile"], ssdPath=str(path),
                    questionNumber=db["questionNumber"], originalSection=orig["section"], originalNumber=orig["number"],
                    body=ledger["body"], bodyReasons=ledger["bodyReasons"], positionAgrees=ledger["positionAgrees"],
                    located=ledger["located"], dbAnswerKind=answer_kind(db["answer"]),
                    originalAnswerKind=answer_kind(orig["answer"]), originalAnswerFrom=orig["answerFrom"],
                    needsVisualEvidence=visual, sourceIssues=source_issues,
                    sourceSha256=source.get("source", {}).get("sha256"))
        vault.append({"ordinal": ordinal, "externalId": target["externalId"],
                      "dbAnswer": db["answer"], "dbSolution": db["solution"],
                      "originalAnswer": orig["answer"], "originalSolution": orig["solution"],
                      "originalQuickKey": orig["quickKey"], "review": target,
                      "authority": "neither answer is ground truth", "release": "after two sealed independent solves per packet"})
        # Never combine divergent bodies. Even old same/notation labels are not
        # a new proof of semantic or equation-structure identity.
        for variant, data in (("db", db), ("original", orig)):
            packet_id = f"q{ordinal:03d}-" + ("a" if variant == "db" else "b")
            holds = list(source_issues) + content_holds(data["content"], original=variant == "original")
            if visual: holds.append("figure_table_shape_correspondence_unverified")
            if ledger["body"] == "different": holds.append("body_difference_separate_review")
            if ledger["positionAgrees"] is not True: holds.append("position_unconfirmed")
            if variant == "original" and not orig["isQuestion"]: holds.append("question_boundary_unconfirmed")
            holds = sorted(set(holds))
            category = "quarantine" if holds else "packets"
            folder = out / category / packet_id;folder.mkdir(mode=0o700)
            student = project(data)
            write_json(folder / "student.json", student)
            manifest = packet_manifest(folder, REPO)
            if json.loads((folder / "student.json").read_text()) != project(data): raise RuntimeError("projection mismatch")
            packet = {"id": packet_id, "ordinal": ordinal, "variant": variant, "folder": str(folder),
                      "status": "hold" if holds else "prepared_for_lead_review", "holds": holds,
                      "manifest": manifest, "sourceContentSha256": digest(data["content"].encode()),
                      "transformation": "none; content bytes preserved inside JSON", "modelCalls": 0,
                      "executionAuthorized": False}
            packets.append(packet);item["packets"].append(packet_id)
        mappings.append(item)
        if ordinal % 40 == 0: print(json.dumps({"progress": ordinal, "of": 229}), flush=True)
    changes = verify_records(freeze["files"])
    if changes: raise RuntimeError("STOP: frozen evidence changed during preparation: " + json.dumps(changes))
    errors = [{"id": p["id"], "errors": verify_packet(Path(p["folder"]), p["manifest"], REPO)} for p in packets]
    errors = [e for e in errors if e["errors"]]
    if errors: raise RuntimeError("packet verification failed")
    def count(field, rows=mappings): return dict(sorted(collections.Counter(x.get(field, "unmapped") for x in rows).items()))
    ready = [x for x in packets if x["status"] == "prepared_for_lead_review"]
    template_path = Path(__file__).parent / "SOLVER-PROMPT.txt"
    template = template_path.read_text()
    prompts = []
    for packet in ready:
        data = (Path(packet["folder"]) / "student.json").read_bytes()
        dest = out / "prompts" / (packet["id"] + ".txt")
        with dest.open("xb") as handle: handle.write(prompt_bytes(template, data))
        prompts.append({"packet": packet["id"], "inputManifestSha256": digest(json_bytes(packet["manifest"])),
                        **file_record(dest), "executionAuthorized": False})
    write_json(out / "prompt-manifests.json", prompts)
    ready_ordinals = {x["ordinal"] for x in ready}
    summary = {"targetCount": len(joined), "mapped": sum(not r["issues"] for r in mappings),
               "joinIssues": sum(bool(r["issues"]) for r in mappings), "books": count("bookKey"),
               "materials": count("materialKind"), "questionTypes": count("questionType"),
               "problemTypes": count("problemType"), "body": count("body"),
               "dbAnswerKinds": count("dbAnswerKind"), "originalAnswerKinds": count("originalAnswerKind"),
               "sourceFiles": len(cache), "sourceRereadIssues": dict(collections.Counter(h for r in mappings for h in r.get("sourceIssues", []))),
               "visualHoldTargets": sum(x.get("needsVisualEvidence", False) for x in mappings),
               "positionUnconfirmedTargets": sum(x.get("positionAgrees") is not True for x in mappings),
               "packets": len(packets), "preparedPackets": len(ready), "preparedVariants": count("variant", ready),
               "targetsWithPreparedVariant": len(ready_ordinals), "targetsFullyHeld": len(joined) - len(ready_ordinals),
               "bothVariantsPrepared": sum(sum(x["ordinal"] == n for x in ready) == 2 for n in ready_ordinals),
               "packetHoldReasons": dict(collections.Counter(h for x in packets for h in x["holds"])),
               "publicCandidateFiles": sum(len(x["publicCandidates"]) for x in figures),
               "publicLocalMissing": sum(x.get("status") == "missing_local" for r in figures for x in r["publicCandidates"]),
               "exactBinPublicMatches": sum(bool(x.get("exactBinMatches")) for r in figures for x in r["publicCandidates"]),
               "sourceFigureCandidates": sum(len(x["figures"]) for x in figures),
               "sourceFigureStreamsMissing": sum(x.get("streamMissing", False) for r in figures for x in r["figures"]),
               "pictureCorrespondenceApproved": 0, "projectionErrors": 0, "manifestErrors": 0,
               "frozenFiles": len(freeze["files"]), "frozenChanges": 0, "modelCalls": 0,
               "executionAuthorized": False, "preparedSolveCallsIfAuthorized": len(ready) * 2,
               "allVariantSolveUpperBound": len(packets) * 2,
               "note": "Prepared is a local text projection, not source truth, isolation proof, visual QA or execution permission."}
    write_jsonl(out / "mapping.jsonl", mappings)
    write_jsonl(out / "answer-vault.jsonl", vault)
    write_jsonl(out / "figure-provenance.jsonl", figures)
    write_json(out / "packet-manifests.json", packets)
    write_json(out / "summary.json", summary)
    samples = []
    for pred in [lambda x: x["status"] == "prepared_for_lead_review" and x["variant"] == "db",
                 lambda x: x["status"] == "prepared_for_lead_review" and x["variant"] == "original",
                 lambda x: "figure_table_shape_correspondence_unverified" in x["holds"],
                 lambda x: "body_difference_separate_review" in x["holds"],
                 lambda x: "native_math_requires_structure_review" in x["holds"]]:
        sample = next((x for x in packets if pred(x)), None)
        if sample: samples.append(sample)
    write_json(out / "sample-manifests.json", samples)
    write_json(out / "evidence-index.json", {"freeze": file_record(args.freeze),
               "artifacts": [file_record(x) for x in sorted(out.glob("*.json*"))],
               "assets": [file_record(x) for x in sorted((out / "audit-assets").iterdir())] + [file_record(x) for x in sorted((out / "prompts").iterdir())],
               "tools": [file_record(x) for x in sorted(Path(__file__).parent.glob("*.py"))] + [file_record(template_path)]})
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
