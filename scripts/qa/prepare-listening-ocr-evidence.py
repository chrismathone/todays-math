"""Local OCR/visual evidence staging. Never changes questions, answers or a DB.

The Windows OCR bridge emits unreviewed observations only. The original image,
question/choice/answer UUIDs and source hashes remain available for every row.
"""
from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def checked_image(image: dict) -> bytes:
    prefix, encoded = image["dataUrl"].split(",", 1)
    if prefix != "data:image/png;base64":
        raise ValueError("Original image must be PNG")
    data = base64.b64decode(encoded, validate=True)
    with Image.open(io.BytesIO(data)) as decoded:
        if decoded.format != "PNG" or decoded.size != (image["width"], image["height"]):
            raise ValueError("Original image dimensions differ")
        decoded.verify()
    return data


def evidence_row(stage: dict, question: dict, original: dict, destination: Path) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", stage["sourceRecordId"]):
        raise ValueError("Invalid source evidence name")
    if question["questionId"] != original["id"] or question["sourceNumber"] != original["sourceNumber"]:
        raise ValueError("Question identity differs from original")
    if [c["id"] for c in question["choices"]] != [c["id"] for c in original["choices"]]:
        raise ValueError("Choice identity/order differs from original")
    if len(original["choices"]) != 5 or question["answerChoiceId"] != original["answerChoiceId"]:
        raise ValueError("Original five choices/answer identity differ")
    choice_ids = [c["id"] for c in original["choices"]]
    if len(set(choice_ids)) != 5 or original["answerChoiceId"] not in choice_ids:
        raise ValueError("Original choice/answer identity is invalid")
    original_bytes = checked_image(original["image"])
    key = f'{stage["sourceRecordId"]}-q{question["sourceNumber"]:02}'
    image_path = destination / "original-images" / (key + ".png")
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(original_bytes)
    return {
        "key": key, "sourceRecordId": stage["sourceRecordId"],
        "sourceNumber": question["sourceNumber"], "questionId": question["questionId"],
        "choiceIds": [c["id"] for c in original["choices"]],
        "answerChoiceId": original["answerChoiceId"],
        "imagePath": image_path.resolve().as_posix(), "imageSha256": sha(original_bytes),
        "width": original["image"]["width"], "height": original["image"]["height"],
        "sourceQuestionPdfSha256": stage["sourceQuestionPdfSha256"],
        "originalPreparedSha256": stage["originalPreparedSha256"],
        "conversion": question["conversion"], "originalInstruction": original.get("instruction"),
        "decision": "unreviewed", "databaseWritten": False,
    }


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf8")
    temporary.replace(path)


def stage_reviewed_questions(source: Path, destination: Path, review_path: Path) -> dict:
    """Explicit visual transcriptions only; raw OCR never supplies approved text."""
    review_bytes = review_path.read_bytes()
    review = json.loads(review_bytes)
    if review.get("databaseWritten") is not False or not review.get("reviewBasis"):
        raise ValueError("Explicit local visual-review basis required")
    evidence = json.loads((destination / "outlined-manifest.json").read_text("utf8"))
    by_key = {(r["sourceRecordId"], r["sourceNumber"]): r for r in evidence["items"]}
    staged, delta, seen = {}, [], set()
    for supplied in review["questions"]:
        identity = (supplied["sourceRecordId"], supplied["sourceNumber"])
        if identity in seen: raise ValueError("Duplicate reviewed question")
        seen.add(identity)
        row = by_key[identity]
        source_path = source / (identity[0] + ".json")
        document = staged.setdefault(identity[0], json.loads(source_path.read_text("utf8")))
        question = next(q for q in document["questions"] if q["questionId"] == row["questionId"])
        if question["conversion"]["method"] != "original_image_preserved":
            raise ValueError("Reviewed source is no longer a fallback")
        original = Path(row["imagePath"]).read_bytes()
        ocr_path = destination / "ocr" / (row["key"] + ".json")
        recognized = json.loads(ocr_path.read_text("utf8"))
        if sha(original) != row["imageSha256"] or recognized["imageSha256"] != row["imageSha256"]:
            raise ValueError("Reviewed image no longer matches evidence")
        question["prompt"] = supplied["prompt"]
        if not question["prompt"].strip(): raise ValueError("Reviewed prompt is empty")
        conversion = copy.deepcopy(question["conversion"])
        conversion.update({"method": "original_image_visual_transcription", "nativePrompt": True, "originalImageSha256": row["imageSha256"], "windowsOcrEvidenceSha256": sha(ocr_path.read_bytes()), "visualReviewSha256": sha(review_bytes), "visualReviewBasis": review["reviewBasis"]})
        conversion.pop("reason", None)
        if supplied.get("visualBoundsPixels"):
            with Image.open(io.BytesIO(original)) as image:
                x0, y0, x1, y1 = supplied["visualBoundsPixels"]
                if not (0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height):
                    raise ValueError("Reviewed visual crop is outside original")
                visual = image.crop((x0, y0, x1, y1))
                buffer = io.BytesIO()
                visual.save(buffer, "PNG")
                data = buffer.getvalue()
            question["image"] = {"dataUrl": "data:image/png;base64," + base64.b64encode(data).decode(), "width": x1 - x0, "height": y1 - y0, "role": "visual"}
            conversion.update({"nativeChoices": False, "visualBoundsPixels": [x0, y0, x1, y1], "visualSha256": sha(data)})
        else:
            if len(supplied["choices"]) != 5 or any(not text.strip() for text in supplied["choices"]):
                raise ValueError("Five visually verified choice texts required")
            for choice, text in zip(question["choices"], supplied["choices"]): choice["text"] = text
            question.pop("image", None)
            conversion.update({"nativeChoices": True})
            conversion.pop("visualSha256", None)
        question["conversion"] = conversion
        if [c["id"] for c in question["choices"]] != row["choiceIds"] or question["answerChoiceId"] != row["answerChoiceId"]:
            raise ValueError("Reviewed question changed answer identities")
        delta.append({"sourceRecordId": identity[0], "sourceNumber": identity[1], "question": copy.deepcopy(question), "originalImagePath": row["imagePath"]})
    for source_id, document in staged.items():
        document["conversion"]["parser"] = "verified_pdf_character_geometry_plus_explicit_visual_transcription_v1"
        document["conversion"]["nativeCount"] = sum(q["conversion"]["method"] != "original_image_preserved" for q in document["questions"])
        document["conversion"]["preservedImageCount"] = len(document["questions"]) - document["conversion"]["nativeCount"]
        write_json(destination / "manual-reviewed-staging" / (source_id + ".json"), document)
    result = {"schemaVersion": 1, "databaseWritten": False, "questions": delta, "visuallyReviewedNativeCount": len(delta), "unreviewedOcrAutomaticNativeCount": 0}
    write_json(destination / "manual-reviewed-delta.json", result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-directory", type=Path, required=True)
    parser.add_argument("--output-directory", type=Path, required=True)
    parser.add_argument("--manual-review-file", type=Path, help="Apply explicit, separate local visual transcriptions; never raw OCR")
    args = parser.parse_args()
    destination = args.output_directory.resolve()
    items, native_visuals = [], []
    for path in sorted(args.source_directory.glob("ebs*.json")):
        stage = json.loads(path.read_text("utf8"))
        original_bytes = Path(stage["originalPreparedPath"]).read_bytes()
        if sha(original_bytes) != stage["originalPreparedSha256"]:
            raise ValueError(f"Original prepared source changed: {path.stem}")
        payload = json.loads(original_bytes)
        original_questions = {q["id"]: q for g in payload["editableInput"]["groups"] for q in g["questions"]}
        pdfs = [f for f in payload["sourceFiles"] if f["kind"] in {"questions", "paper"}]
        if len(pdfs) != 1 or sha(Path(pdfs[0]["path"]).read_bytes()) != stage["sourceQuestionPdfSha256"]:
            raise ValueError(f"Original PDF changed: {path.stem}")
        for question in stage["questions"]:
            if question["conversion"]["method"] == "original_image_preserved":
                row = evidence_row(stage, question, original_questions[question["questionId"]], destination)
                row["outlinedText"] = question["conversion"].get("reason", "").startswith("Source text is outlined")
                items.append(row)
            elif question.get("image"):
                native_visuals.append({"sourceRecordId": stage["sourceRecordId"], "sourceNumber": question["sourceNumber"], "stagePath": path.resolve().as_posix()})
    write_json(destination / "manifest.json", {"schemaVersion": 1, "databaseWritten": False, "items": items, "nativeVisuals": native_visuals})
    write_json(destination / "outlined-manifest.json", {"schemaVersion": 1, "databaseWritten": False, "items": [row for row in items if row["outlinedText"]]})
    if args.manual_review_file:
        reviewed = stage_reviewed_questions(args.source_directory, destination, args.manual_review_file)
        print(json.dumps({"visuallyReviewedNativeCount": reviewed["visuallyReviewedNativeCount"], "unreviewedOcrAutomaticNativeCount": 0, "databaseWritten": False}))
    print(json.dumps({"originalFallbacks": len(items), "outlinedOcrInputs": sum(row["outlinedText"] for row in items), "nativeVisuals": len(native_visuals), "databaseWritten": False}))


if __name__ == "__main__":
    main()
