"""Read-only bounded source inspection; writes only beside this script.

No source edits, answer-page rendering, HWP conversion, or candidate reads.
"""
import hashlib
import json
import pathlib
import sys

import fitz

sys.stdout.reconfigure(encoding="utf-8")
OUT = pathlib.Path(__file__).resolve().parent
ORIGINAL = pathlib.Path("C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003")
EXAM_ID = "personal-9967cfbb759aa6d369883bac4c986aaa"


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def save_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def render(doc, page, name, box=None, scale=2):
    p = doc[page - 1]
    clip = fitz.Rect(box) if box else p.rect
    p.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=clip, alpha=False).save(OUT / name)
    return {"file": name, "page": page, "clip_points": list(clip), "scale": scale,
            "sha256": digest(OUT / name)}


if __name__ == "__main__":
    comparison = json.loads((ORIGINAL / "source-comparison-bumil.json").read_text(encoding="utf-8-sig"))
    manifest_records = []
    raw_job = None
    for name in ["extraction-job-manifest.json", "extraction-job-manifest-reviewed.json", "extraction-job-manifest-pilot-hashes.json"]:
        doc = json.loads((ORIGINAL / name).read_text(encoding="utf-8-sig"))
        job = next(j for j in doc["jobs"] if j["examId"] == EXAM_ID)
        raw_job = raw_job or job
        record = {"path": str(ORIGINAL / name), "sha256": digest(ORIGINAL / name),
                  "job_index": doc["jobs"].index(job), "selected_job": job}
        manifest_records.append(record)
        print(json.dumps({"manifest": name, "status": job["status"], "selection": job.get("selectedPair"),
                          "hold_reasons": job["holdReasons"]}, ensure_ascii=False))
    save_json("manifest-question-source-excerpts.json", manifest_records)

    files = []
    for i, entry in enumerate(raw_job["files"]):
        old = pathlib.Path(entry["path"])
        current = old
        if not current.exists() and "기출작업\\196차" in str(current):
            current = pathlib.Path(str(current).replace("기출작업\\196차", "기출작업\\이전차수\\196차"))
        source_id = "s" + str(i + 1)
        record = {"id": source_id, "manifest_path": str(old), "manifest_path_exists": old.exists(),
                  "current_path": str(current), "current_path_exists": current.exists(),
                  "manifest_role": entry["role"], "extension": entry["ext"]}
        if current.exists():
            record.update(bytes=current.stat().st_size, sha256=digest(current))
            if current.suffix.lower() == ".pdf":
                with fitz.open(current) as doc:
                    record.update(page_count=len(doc), page_sizes=[list(p.rect) for p in doc])
        files.append(record)
        print(json.dumps(record, ensure_ascii=False))
    save_json("source-files.json", files)
    metadata_sources = ["source-comparison-bumil.json", "source-hashes-pilot.json"]
    save_json("prior-reports-integrity.json", [{"path": str(ORIGINAL / n), "sha256": digest(ORIGINAL / n)} for n in metadata_sources])
