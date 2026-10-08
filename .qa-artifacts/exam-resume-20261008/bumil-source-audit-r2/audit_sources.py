"""Read-only question-source audit. All writes stay in this new evidence root.

HWP note/header/footer subtrees are skipped without text decoding. PDF page5
is never loaded. Full scan renders are reviewer-only, not author inputs.
"""
import hashlib
import json
import pathlib
import struct
import subprocess
import sys
import zlib

import fitz
import olefile

sys.stdout.reconfigure(encoding="utf-8")
OUT = pathlib.Path(__file__).resolve().parent
ROOT = OUT.parents[2]
PRIOR = ROOT / ".qa-artifacts/exam-resume-20261008/bumil-authoring-r1/source-identity"
PARENT = pathlib.Path("C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008")
OLD = pathlib.Path("C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003")
SELECTED = [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20]


def sha(path):
    h = hashlib.sha256()
    with pathlib.Path(path).open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest()


def save(name, value):
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def records(data):
    pos = 0
    index = 0
    while pos < len(data):
        start = pos
        word = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        tag, level, size = word & 1023, (word >> 10) & 1023, word >> 20
        if size == 4095:
            size = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        assert pos + size <= len(data)
        index += 1
        yield {"record": index, "tag": tag, "level": level, "offset": start,
               "end_offset": pos + size, "payload": data[pos:pos + size]}
        pos += size


def paragraph(payload):
    words = struct.unpack("<" + "H" * (len(payload) // 2), payload)
    extended = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23}
    result = []
    i = 0
    while i < len(words):
        c = words[i]
        if c in extended:
            result.append(" ")
            i += 8
        else:
            result.append(chr(c) if c >= 32 else " ")
            i += 1
    return "".join(result).strip()


def inline_template(payload):
    words = struct.unpack("<" + "H" * (len(payload) // 2), payload)
    extended = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23}
    parts = []
    text = []
    i = 0
    while i < len(words):
        c = words[i]
        if c in extended:
            control_id = payload[i * 2 + 2:i * 2 + 6][::-1]
            if control_id == b"eqed":
                parts.append("".join(text))
                text = []
                parts.append({"equation_slot_at_utf16_index": i})
            else:
                text.append(" ")
            i += 8
        else:
            text.append(chr(c) if c >= 32 else " ")
            i += 1
    parts.append("".join(text))
    return parts


def reconstruct(question):
    active = {}
    paragraphs = []
    for r in question["records"]:
        if r["kind"] == "main_paragraph":
            active = {level: p for level, p in active.items() if level < r["level"]}
            p = {"record_1based": r["record_1based"], "offset": r["offset"],
                 "level": r["level"], "parts": r["inline_template"], "equations": []}
            active[r["level"]] = p
            paragraphs.append(p)
        elif r["kind"] == "equation":
            candidates = [level for level in active if level < r["level"]]
            assert candidates, (question["question_number"], r)
            active[max(candidates)]["equations"].append({"offset": r["offset"],
                                                        "record_1based": r["record_1based"],
                                                        "script": r["script"]})
    for p in paragraphs:
        slots = [x for x in p["parts"] if isinstance(x, dict)]
        assert len(slots) == len(p["equations"]), (question["question_number"], p["offset"], len(slots), len(p["equations"]))
        j = 0
        pieces = []
        for part in p.pop("parts"):
            if isinstance(part, str):
                pieces.append(part)
            else:
                pieces.append("⟦" + p["equations"][j]["script"] + "⟧")
                j += 1
        p["reconstructed_main_question_paragraph"] = "".join(pieces).strip()
    question["reconstructed_paragraphs"] = paragraphs
    question["all_inline_equation_slots_resolved"] = True


def extract_hwp(source, write_images):
    qs = {n: {"question_number": n, "records": [], "pictures": [], "boundary": {},
              "document_header_records": [], "document_header_pictures": []} for n in SELECTED}
    skipped = 0
    count = 0
    stop = None
    with olefile.OleFileIO(source["current_path"]) as ole:
        flags = struct.unpack_from("<I", ole.openstream("FileHeader").read(), 36)[0]
        raw = ole.openstream("BodyText/Section0").read()
        data = zlib.decompress(raw, -15) if flags & 1 else raw
        blocks = []
        current = []
        for r in records(data):
            if r["tag"] == 66 and r["level"] == 0 and current:
                blocks.append(current)
                current = []
            current.append(r)
        if current:
            blocks.append(current)
        for block in blocks:
            anchors = [r for r in block if r["tag"] == 71 and r["level"] == 1
                       and r["payload"][:4][::-1] == b"en  "]
            assert len(anchors) <= 1
            if anchors:
                count += 1
            if count == 21:
                stop = block[0]["offset"]
                break  # q21 and everything after it are immutable/outside r2.
            if count not in qs:
                continue
            q = qs[count]
            q["boundary"].setdefault("first_block_offset", block[0]["offset"])
            q["boundary"]["last_block_end_offset"] = block[-1]["end_offset"]
            skip = None
            for r in block:
                tag, level, payload = r["tag"], r["level"], r["payload"]
                if skip is not None:
                    if level > skip:
                        continue
                    skip = None
                if tag == 71 and payload[:4][::-1] in {b"en  ", b"fn  ", b"head", b"foot"}:
                    skip = level
                    skipped += 1
                    continue
                locator = {"record_1based": r["record"], "offset": r["offset"], "tag": tag, "level": level}
                if tag == 67:
                    t = paragraph(payload)
                    template = inline_template(payload)
                    if (t or any(isinstance(x, dict) for x in template)) and not t.startswith(("[중단원]", "[난이도]")) and t != "대구광역시 내신 수학 연구회":
                        target = "document_header_records" if count == 1 and r["offset"] in {9692, 10303, 10934, 11561} else "records"
                        q[target].append({**locator, "kind": "main_paragraph", "text": t,
                                          "inline_template": template})
                elif tag == 88:
                    length = struct.unpack_from("<H", payload, 4)[0]
                    t = payload[6:6 + length * 2].decode("utf-16le")
                    q["records"].append({**locator, "kind": "equation", "script": t})
                elif tag == 85:
                    binid = struct.unpack_from("<H", payload, 71)[0]
                    stream = f"BinData/BIN{binid:04X}.bmp"
                    image = ole.openstream(stream).read()
                    try:
                        image = zlib.decompress(image, -15)
                    except zlib.error:
                        pass
                    assert image.startswith(b"BM")
                    pix = fitz.Pixmap(image)
                    rgb = fitz.Pixmap(fitz.csRGB, pix) if pix.colorspace.n != 3 else pix
                    if rgb.alpha:
                        rgb = fitz.Pixmap(rgb, 0)
                    is_banner = count == 1 and binid == 1
                    name = "question-only/identity/hwp-banner.png" if is_banner else f"question-only/q{count:02}/hwp-figure-{len(q['pictures'])+1}.png"
                    if write_images:
                        (OUT / name).parent.mkdir(parents=True, exist_ok=True)
                        rgb.save(OUT / name)
                    target = "document_header_pictures" if is_banner else "pictures"
                    q[target].append({**locator, "stream": stream, "file": name,
                                          "width": rgb.width, "height": rgb.height,
                                          "decompressed_bmp_sha256": hashlib.sha256(image).hexdigest(),
                                          "rgb_pixels_sha256": hashlib.sha256(rgb.samples).hexdigest()})
    assert count == 21 and stop is not None
    for q in qs.values():
        reconstruct(q)
    return {"source_id": source["id"], "source_sha256": source["sha256"],
            "stream": "BodyText/Section0", "question_anchor_count_at_stop": count,
            "stop_before_q21_block_offset": stop, "selected_note_subtrees_skipped": skipped,
            "answer_or_solution_text_decoded": False, "questions": list(qs.values())}


def prepare():
    sources = json.loads((PRIOR / "source-files.json").read_text(encoding="utf-8"))
    for s in sources:
        p = pathlib.Path(s["current_path"])
        assert p.exists() and sha(p) == s["sha256"] and p.stat().st_size == s["bytes"], s["id"]
        s["manifest_path_exists"] = pathlib.Path(s["manifest_path"]).exists()
        s["current_path_exists"] = p.exists()
    save("source-files.json", sources)
    byid = {s["id"]: s for s in sources}
    first = extract_hwp(byid["s1"], False)
    work = extract_hwp(byid["s5"], True)
    assert first["questions"] == work["questions"]
    save("hwp-question-only-records.json", {"hwp_copies_decoded_and_semantically_compared": True,
                                           "selected_main_records_and_image_content_equal": True,
                                           "sources": [first, work]})
    renders = []
    for sid in ("s4", "s6", "s3"):
        with fitz.open(byid[sid]["current_path"]) as doc:
            for pn in (1, 2, 3, 4):
                page = doc[pn - 1]
                origrot = page.rotation
                if sid == "s3":
                    page.set_rotation(90 if pn in (1, 3) else 270)
                folder = "reviewer-only/scans" if sid == "s3" else "question-only/pages"
                name = f"{folder}/{sid}-page-{pn}.png"
                (OUT / name).parent.mkdir(parents=True, exist_ok=True)
                clip = fitz.Rect(0, 150, page.rect.width, page.rect.height) if sid == "s3" and pn == 1 else page.rect
                page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), clip=clip, alpha=False).save(OUT / name)
                renders.append({"file": name, "source_id": sid, "source_sha256": byid[sid]["sha256"],
                                "physical_pdf_page_1based": pn, "clip_points": list(clip),
                                "original_rotation": origrot, "render_rotation": page.rotation,
                                "scale": 1.5, "sha256": sha(OUT / name),
                                "author_input_allowed": sid != "s3",
                                "incidental_handwriting_possible": sid == "s3"})
    save("page-render-records.json", renders)
    protected = []
    folders = ["bumil-authoring-r1/source-identity", "bumil-review-r1/blind-results",
               "bumil-review-r1/verification-results", "bumil-review-r4/blind-results-source",
               "bumil-review-r4/verification-results-source"]
    for folder in folders:
        names = subprocess.run(["git", "ls-files", "--", ".qa-artifacts/exam-resume-20261008/" + folder],
                               cwd=ROOT, capture_output=True, text=True, check=True).stdout.splitlines()
        for name in names:
            p = ROOT / name
            protected.append({"path": str(p), "sha256": sha(p), "kind": "immutable_prior_worker_evidence"})
    ledgerdir = "scripts/qa/reports/refresh-engine-content"
    ledgernames = ["exam-hold-pilot81-20261003.json", "exam-lock-gyeongsanyeo19-20261003.json",
                   "exam-draft-review-bank-decide-20261003.json"]
    for directory in (ROOT, PARENT, pathlib.Path("D:/todays-math")):
        for name in ledgernames:
            p = directory / ledgerdir / name
            if p.exists():
                protected.append({"path": str(p), "sha256": sha(p), "kind": "protected_82_three_ledgers"})
    for name in ("source-comparison-bumil.json", "source-hashes-pilot.json",
                 "extraction-job-manifest.json", "extraction-job-manifest-reviewed.json",
                 "extraction-job-manifest-pilot-hashes.json"):
        p = OLD / name
        protected.append({"path": str(p), "sha256": sha(p), "kind": "read_only_original_artifact"})
    if not (OUT / "preservation-baseline.json").exists():
        save("preservation-baseline.json", protected)
    save("authority-and-scope.json", {
        "worker_id": "orca-codex-exam-twin-source-identity-20261008",
        "remaining_question_numbers": SELECTED, "prior_immutable_question_numbers": [2, 3, 15, 21],
        "parent_head_observed": subprocess.run(["git", "rev-parse", "HEAD"], cwd=PARENT,
                                                capture_output=True, text=True, check=True).stdout.strip(),
        "authority_paths": ["D:/todays-math/AGENTS.md",
                            str(PARENT / "docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-1.md"),
                            str(PARENT / "docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-2.md")],
        "pdf_pages_allowed": [1, 2, 3, 4], "pdf_page5_loaded": False,
        "scan_author_inputs_allowed": False, "rights_or_custody_approval": False,
        "no_new_workers": True, "no_candidate_or_answer_review_in_this_task": True,
        "render_runtime": "installed PyMuPDF; Poppler command unavailable; no installation"})
    print(json.dumps({"questions": SELECTED, "hwp_pictures": sum(len(q["pictures"]) for q in work["questions"]),
                      "renders": len(renders), "preserved_files": len(protected)}, ensure_ascii=False))


if __name__ == "__main__":
    prepare()
