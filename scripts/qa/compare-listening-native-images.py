"""Build original/native or original/OCR PNG contact sheets, without DB writes."""
from __future__ import annotations
import argparse
import base64
import io
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FONT = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 20)
SMALL = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 16)


def wrapped(text: str, width=560) -> list[str]:
    result, current = [], ""
    for letter in text:
        if letter == "\n" or FONT.getlength(current + letter) > width:
            result.append(current)
            current = "" if letter == "\n" else letter
        else: current += letter
    if current: result.append(current)
    return result


def panel(question: dict, raw: Image.Image | None = None) -> Image.Image:
    lines = []
    for text in [question.get("instruction", ""), question.get("prompt", ""), *[f'{i + 1}. {c["text"]}' for i, c in enumerate(question.get("choices", []))]]:
        if text: lines += wrapped(text)
    if raw is None and question.get("image"):
        raw = Image.open(io.BytesIO(base64.b64decode(question["image"]["dataUrl"].split(",")[1]))).convert("RGB")
    if raw:
        raw = raw.copy()
        raw.thumbnail((590, 850))
    result = Image.new("RGB", (600, max(50, len(lines) * 29) + (raw.height + 12 if raw else 0)), "white")
    draw = ImageDraw.Draw(result)
    y = 6
    for text in lines:
        draw.text((8, y), text, font=FONT, fill="black")
        y += 29
    if raw: result.paste(raw, (5, y + 8))
    return result


def save_sheets(rows: list[tuple[str, Image.Image, Image.Image]], directory: Path, prefix: str, per=4, right_heading="STAGED / UNREVIEWED OCR") -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for start in range(0, len(rows), per):
        chunk = rows[start:start + per]
        heights = [max(left.height, right.height) + 64 for _, left, right in chunk]
        image = Image.new("RGB", (1230, sum(heights)), "white")
        draw = ImageDraw.Draw(image)
        y = 0
        for (label, left, right), height in zip(chunk, heights):
            draw.text((10, y + 6), label, font=SMALL, fill="#1b4280")
            draw.text((10, y + 27), "ORIGINAL", font=SMALL, fill="#666666")
            draw.text((625, y + 27), right_heading, font=SMALL, fill="#666666")
            image.paste(left, (10, y + 52))
            image.paste(right, (625, y + 52))
            draw.line((612, y, 612, y + height), fill="#bbbbbb")
            draw.line((0, y + height - 1, 1230, y + height - 1), fill="#bbbbbb")
            y += height
        image.save(directory / f"{prefix}-{start // per + 1:02}.png")


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--evidence-directory", type=Path, required=True)
    options = args.parse_args()
    root = options.evidence_directory
    manifest = json.loads((root / "manifest.json").read_text("utf8"))
    ocr_rows, other_rows, native_rows = [], [], []
    for row in manifest["items"]:
        raw = Image.open(row["imagePath"]).convert("RGB")
        if row["outlinedText"]:
            recognized = json.loads((root / "ocr" / (row["key"] + ".json")).read_text("utf8"))
            if recognized["imageSha256"] != row["imageSha256"]: raise ValueError("OCR evidence no longer matches original")
            right = panel({"prompt": recognized["text"]})
            ocr_rows.append((row["key"], raw, right))
        else:
            other_rows.append((row["key"], raw, panel({"prompt": row["conversion"]["reason"]})))
    source_ids = {"ebs-middle-1-2018-1", "ebs-middle-3-2020-2", "ebs-middle-1-2026-2", "ebs-middle-2-2026-2", "ebs-middle-3-2026-2", "ebsi-high-1-2026-2", "ebsi-high-2-2026-2", "ebsi-high-3-2026-2"}
    for row in manifest["nativeVisuals"]:
        if row["sourceRecordId"] not in source_ids: continue
        stage = json.loads(Path(row["stagePath"]).read_text("utf8"))
        question = next(q for q in stage["questions"] if q["sourceNumber"] == row["sourceNumber"])
        payload = json.loads(Path(stage["originalPreparedPath"]).read_text("utf8"))
        original = next(q for g in payload["editableInput"]["groups"] for q in g["questions"] if q["id"] == question["questionId"])
        original_image = Image.open(io.BytesIO(base64.b64decode(original["image"]["dataUrl"].split(",")[1]))).convert("RGB")
        native_rows.append((f'{row["sourceRecordId"]}-q{row["sourceNumber"]:02}', original_image, panel(question)))
    directory = root / "contact-sheets"
    save_sheets(ocr_rows, directory, "outlined-ocr")
    save_sheets(other_rows, directory, "fallback")
    save_sheets(native_rows, directory, "native-visual")
    print(json.dumps({"ocrPairs": len(ocr_rows), "fallbackImages": len(other_rows), "nativeVisualPairs": len(native_rows), "databaseWritten": False}))


if __name__ == "__main__": main()
