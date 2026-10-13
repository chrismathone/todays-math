"""Gather the official 2015 middle-school math provisions and restrictions that earlier
reviews already extracted from the MOE HWP/PDF, into one file the reviewers can cite.

No new extraction: every row keeps the evidence file it came from. Rows with the same id
and the same clause text are merged; a differing text for the same id is kept as a
conflict instead of being silently chosen.
"""
import hashlib, json, pathlib, re, sys

sys.dont_write_bytecode = True
sys.stdout.reconfigure(encoding="utf-8")
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]  # .qa-artifacts/exam-resume-20261008


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


rows, conflicts, scanned = {}, [], []
for p in sorted(ROOT.rglob("*.json")):
    if any(part in ("reviewer-only", "claude-review-r1", "node_modules") for part in p.parts):
        continue
    try:
        text = p.read_text(encoding="utf-8-sig")
    except (UnicodeDecodeError, OSError):
        continue
    if '"hwp"' not in text:
        continue
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        continue
    found = 0

    def walk(x):
        global found
        if isinstance(x, dict):
            hwp = x.get("hwp")
            if isinstance(x.get("id"), str) and isinstance(hwp, dict) and isinstance(hwp.get("text"), str):
                key = x["id"]
                # Earlier reviews rendered the HWP field separator as nothing or as a space.
                clause = " ".join(hwp["text"].replace("\u001e", " ").split()).replace("] ", "]")
                rec = {
                    "id": key,
                    "text": clause,
                    "kind": "standard" if re.match(r"^\[?\d수\d\d-\d\d", key) else "restriction-or-note",
                    "hwpRecord1based": hwp.get("record1based"),
                    "pdfPrintedPage": x.get("pdfPrintedPage"),
                    "wholeClausePDFMatch": x.get("wholeClausePDFMatch"),
                }
                rel = p.relative_to(ROOT).as_posix()
                prev = rows.get(key)
                if prev is None:
                    rows[key] = rec | {"evidenceFiles": [rel]}
                elif prev["text"] == clause:
                    if rel not in prev["evidenceFiles"]:
                        prev["evidenceFiles"].append(rel)
                else:
                    conflicts.append({"id": key, "kept": prev["text"], "other": clause, "otherFile": rel})
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)

    walk(data)
    scanned.append({"path": p.relative_to(ROOT).as_posix(), "sha256": sha(p)})

# Primary source: the paragraph dump of the official HWP (MOE 2020-236 book 8) that the
# curriculum worker extracted on 2026-10-08. Its worktree was cleaned up on 2026-10-12;
# the dump survives in the cleanup archive. Standards and «다루지 않는다» lines of the
# middle-school (9수) and grade-6 measurement (6수03) sections are added from it.
import re

PARAGRAPHS = pathlib.Path(
    "C:/Users/user/orca/artifacts/outputs/worktree-cleanup-20261012-r1/exam-twin-curriculum-20261008"
    "/local-evidence/.qa-artifacts/exam-resume-20261008/sources/moe-2020-236-paragraphs.json"
)
paragraph_source = None
if PARAGRAPHS.exists():
    paragraph_source = {"path": PARAGRAPHS.as_posix(), "sha256": sha(PARAGRAPHS)}
    paras = json.loads(PARAGRAPHS.read_text(encoding="utf-8"))
    in_middle = False
    for para in paras:
        text = " ".join(str(para.get("text", "")).split())
        m = re.match(r"^\[((?:9수\d\d|6수03)-\d\d)\]", text)
        if m:
            in_middle = m.group(1).startswith("9수")
            key = m.group(1)
            clause = text.replace("] ", "]")
            prev = rows.get(key)
            if prev is None:
                rows[key] = {"id": key, "text": clause, "kind": "standard", "hwpRecord1based": para.get("record_1based"),
                             "pdfPrintedPage": None, "wholeClausePDFMatch": None, "evidenceFiles": ["paragraphs:moe-2020-236"]}
            elif prev["text"] == clause:
                prev["evidenceFiles"].append("paragraphs:moe-2020-236")
            else:
                conflicts.append({"id": key, "kept": prev["text"], "other": clause, "otherFile": "paragraphs:moe-2020-236"})
        # Middle-school math «교수·학습 및 평가» notes sit right after the standards
        # (HWP records ~4000–4700 in this dump); elsewhere the phrase belongs to other subjects.
        elif in_middle and 4000 <= int(para.get("record_1based") or 0) <= 4700 and "다루지 않는다" in text and len(text) < 160:
            known = next((r for r in rows.values() if r["text"] == text), None)
            if known:
                known["evidenceFiles"].append("paragraphs:moe-2020-236")
            else:
                key = f"para-{para.get('record_1based')}"
                rows[key] = {"id": key, "text": text, "kind": "restriction-or-note", "hwpRecord1based": para.get("record_1based"),
                             "pdfPrintedPage": None, "wholeClausePDFMatch": None, "evidenceFiles": ["paragraphs:moe-2020-236"]}

out = {
    "kind": "official-provisions-collected/v1",
    "paragraphSource": paragraph_source,
    "note": "Collected from earlier reviews' extractions of the official 2015 curriculum (MOE notice 2015-74 / 2020-236 book 8, mathematics). Cite by id; the HWP record and PDF page come from those reviews.",
    "provisions": sorted(rows.values(), key=lambda r: (r["kind"], r["id"])),
    "conflicts": conflicts,
    "scannedEvidenceFiles": scanned,
}
(HERE / "official-provisions.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(len(rows), "provisions;", len(conflicts), "conflicts;", len(scanned), "files")
for r in out["provisions"]:
    print(r["kind"], r["id"], r["text"][:60])
