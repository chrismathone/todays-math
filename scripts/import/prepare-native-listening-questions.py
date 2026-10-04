"""Stage editable source questions from verified PDFs without writing to the DB.

The source file, question UUIDs and answer UUIDs stay unchanged. Unsupported
regions keep their original full-question image; text or graphics are never
discarded on an uncertain extraction.
"""

from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

CIRCLED = "①②③④⑤"
HEADING = re.compile(r"^(\d{1,2})\.(?!\d)\s*(.*)")
SHARED = re.compile(r"^[【\[]\s*(\d{1,2})\s*[-~～–]\s*(\d{1,2})\s*[】\]]\s*(.*)")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize_chars(chars: list[dict]) -> str:
    """Recover explicit PDF word gaps, without language-model spelling changes."""
    out: list[str] = []
    previous = None
    for char in chars:
        value = char["c"]
        if previous is not None and not previous["c"].isspace() and not value.isspace():
            gap = char["bbox"][0] - previous["bbox"][2]
            width = min(
                char["bbox"][2] - char["bbox"][0],
                previous["bbox"][2] - previous["bbox"][0],
            )
            if gap > max(1.2, min(2.5, width * 0.4)):
                out.append(" ")
        out.append(value)
        previous = char
    return re.sub(r"\s+", " ", "".join(out)).strip()


def page_lines(page: pymupdf.Page) -> list[dict]:
    lines = []
    for block in page.get_text("rawdict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            chars = [c for span in line["spans"] for c in span["chars"]]
            text = normalize_chars(chars)
            if text:
                lines.append({"text": text, "bbox": list(line["bbox"]), "chars": chars})
    return lines


def inside(line: dict, rect: pymupdf.Rect) -> bool:
    box = pymupdf.Rect(line["bbox"])
    return (
        rect.x0 <= box.x0 + 1 < rect.x1 and rect.y0 <= (box.y0 + box.y1) / 2 < rect.y1
    )


def ordered(lines: list[dict]) -> list[dict]:
    return sorted(lines, key=lambda line: (round(line["bbox"][1] / 3), line["bbox"][0]))


def graphics(page: pymupdf.Page, rect: pymupdf.Rect) -> list[pymupdf.Rect]:
    result = []
    for image in page.get_image_info():
        box = pymupdf.Rect(image["bbox"])
        if box.intersects(rect) and (box & rect).get_area() > 10:
            result.append(box & rect)
    for drawing in page.get_drawings():
        # One PDF path can contain a page separator and an unrelated table.
        # Inspect its individual primitives so a broad path box cannot hide the table.
        for item in drawing["items"]:
            if item[0] == "re":
                box = pymupdf.Rect(item[1])
            elif item[0] in {"l", "c"}:
                points = item[1:]
                box = pymupdf.Rect(
                    min(p.x for p in points),
                    min(p.y for p in points),
                    max(p.x for p in points),
                    max(p.y for p in points),
                )
            elif item[0] == "qu":
                box = item[1].rect
            else:
                continue
            if max(box.width, box.height) < 12:
                continue
            if box.height > rect.height * 1.5 or box.width > rect.width * 1.2:
                continue
            box = box + (-0.1, -0.1, 0.1, 0.1)
            if box.intersects(rect) and rect.contains(box):
                result.append(box)
    return result


def text_underline(box: pymupdf.Rect, lines: list[dict]) -> bool:
    """A short rule beneath encoded text is typography, not a separate figure."""
    if box.height > 0.5 or box.width <= 0:
        return False
    return any(
        line["bbox"][0] - 1 <= box.x0
        and box.x1 <= line["bbox"][2] + 1
        and line["bbox"][1] <= box.y0 <= line["bbox"][3] + 2
        for line in lines
    )


def choice_texts(lines: list[dict]) -> tuple[list[str], float]:
    pieces: list[dict] = []
    for line in ordered(lines):
        chars = line["chars"]
        starts = [i for i, char in enumerate(chars) if char["c"] in CIRCLED]
        if not starts:
            pieces.append({"number": None, "text": line["text"], "bbox": line["bbox"]})
            continue
        if starts[0] > 0 and normalize_chars(chars[: starts[0]]):
            raise ValueError("Text precedes a choice marker in the same line")
        for offset, start in enumerate(starts):
            stop = starts[offset + 1] if offset + 1 < len(starts) else len(chars)
            fragment = chars[start:stop]
            pieces.append(
                {
                    "number": CIRCLED.index(fragment[0]["c"]),
                    "text": normalize_chars(fragment[1:]),
                    "bbox": [
                        fragment[0]["bbox"][0],
                        line["bbox"][1],
                        fragment[-1]["bbox"][2],
                        line["bbox"][3],
                    ],
                }
            )
    markers = [piece for piece in pieces if piece["number"] is not None]
    if sorted(piece["number"] for piece in markers) != list(range(5)):
        raise ValueError("Exactly five distinct original choice markers are required")
    first_y = min(piece["bbox"][1] for piece in markers)
    texts: list[list[str]] = [[] for _ in CIRCLED]
    for marker in markers:
        if marker["text"]:
            texts[marker["number"]].append(marker["text"])
    # A wrapped choice line belongs to the preceding marker in its own column.
    for piece in pieces:
        if piece["number"] is not None or piece["bbox"][1] < first_y:
            continue
        preceding = [
            m
            for m in markers
            if m["bbox"][1] <= piece["bbox"][1] + 2
            and abs(m["bbox"][0] - piece["bbox"][0]) < 30
        ]
        if not preceding:
            raise ValueError("Choice continuation has no unambiguous column")
        marker = max(preceding, key=lambda m: m["bbox"][1])
        texts[marker["number"]].append(piece["text"])
    return [" ".join(parts).strip() for parts in texts], first_y


def fallback(
    question: dict, reason: str, page: int = 1, bounds: list[float] | None = None
) -> dict:
    image = copy.deepcopy(question.get("image"))
    if not image:
        raise ValueError("Unsupported native extraction has no original image")
    image["role"] = "question"
    return {
        "questionId": question["id"],
        "sourceNumber": question["sourceNumber"],
        "prompt": question["prompt"],
        **(
            {"instruction": question["instruction"]}
            if "instruction" in question
            else {}
        ),
        "image": image,
        "choices": copy.deepcopy(question["choices"]),
        "answerChoiceId": question["answerChoiceId"],
        "conversion": {
            "method": "original_image_preserved",
            "sourcePage": page,
            "bounds": bounds or [0, 0, image["width"], image["height"]],
            "nativePrompt": False,
            "nativeChoices": False,
            "visualSha256": sha(
                base64.b64decode(image["dataUrl"].split(",")[1], validate=True)
            ),
            "reason": reason,
        },
    }


def extract_question(
    page: pymupdf.Page,
    lines: list[dict],
    heading: dict,
    following: dict | None,
    column: tuple[float, float],
    instruction: str | None,
    shared_top: float | None,
    question: dict,
    page_number: int,
) -> dict:
    x0, x1 = column
    y0 = shared_top if shared_top is not None else heading["bbox"][1] - 3
    y1 = following["bbox"][1] - 3 if following else page.rect.height - 44
    rect = pymupdf.Rect(x0, y0, x1, y1)
    number = question["sourceNumber"]
    selected = ordered([line for line in lines if inside(line, rect)])
    selected = [line for line in selected if not SHARED.match(line["text"])]
    if not selected or "\ufffd" in " ".join(line["text"] for line in selected):
        raise ValueError("Missing or undecodable question text")
    own = [line for line in selected if line["bbox"][1] >= heading["bbox"][1] - 1]
    first_choice = next(
        (i for i, line in enumerate(own) if any(c in line["text"] for c in CIRCLED)),
        len(own),
    )
    stem_lines = own[:first_choice]
    if not stem_lines:
        raise ValueError("No native prompt")
    stem_text = " ".join(line["text"] for line in stem_lines)
    stem_text = re.sub(r"^\d{1,2}\.\s*", "", stem_text).strip()
    graph = [box for box in graphics(page, rect) if not text_underline(box, selected)]
    # Some originals draw the response blank as a vector rule after "Man:".
    # Preserve its meaning in the editable prompt; it is not a picture choice.
    response_blank = bool(
        re.fullmatch(r"(?:Man|Woman):\s*", stem_text)
        and graph
        and all(
            box.height <= 0.5
            and box.width >= 80
            and box.x0 >= stem_lines[-1]["bbox"][2] - 1
            and abs(box.y0 - stem_lines[-1]["bbox"][3]) <= 2
            for box in graph
        )
    )
    if response_blank:
        stem_text += " " + "_" * 48
        graph = []
    prompt_end = re.search(r"(?:고르시오|답하시오|표시하시오)[.!?。]", stem_text)
    actual_stem = []
    total = ""
    for line in stem_lines:
        actual_stem.append(line)
        total += " " + line["text"]
        if re.search(r"(?:고르시오|답하시오|표시하시오)[.!?。]", total):
            break
    actual_bottom = max(line["bbox"][3] for line in actual_stem)
    graph = [box for box in graph if box.y1 > actual_bottom + 0.5]
    if graph:
        # Table/figure labels remain with their graphics; only the actual stem is typed.
        end = prompt_end
        if end is None:
            raise ValueError("Graphic question has no certain prompt boundary")
        stem_text = stem_text[: end.end()]
        prompt_bottom = max(line["bbox"][3] for line in actual_stem)
    else:
        prompt_bottom = max(line["bbox"][3] for line in stem_lines)
    if not stem_text or len(stem_text) > 2000:
        raise ValueError("Native prompt is empty or exceeds the contract")
    marker_lines = [
        line for line in own[first_choice:] if any(c in line["text"] for c in CIRCLED)
    ]
    if not marker_lines and not graph:
        raise ValueError("No choice markers or preserved graphic choices")
    choice_y = min(
        (line["bbox"][1] for line in marker_lines), default=prompt_bottom + 1
    )
    graphic_choices = bool(graph and any(box.y1 > choice_y + 3 for box in graph))
    if graphic_choices:
        markers = [
            char["c"]
            for line in marker_lines
            for char in line["chars"]
            if char["c"] in CIRCLED
        ]
        if markers and sorted(markers) != sorted(CIRCLED):
            raise ValueError(
                "Graphic choices have missing or duplicate original markers"
            )
        texts = [""] * 5
    else:
        texts, choice_y = choice_texts(own[first_choice:])
    meaningful = all(texts) and not graphic_choices
    numeric_dialogues = bool(
        not graph
        and not any(texts)
        and re.search(r"두\s*사람의\s*대화가\s*어색한", stem_text)
    )
    if not graph and not meaningful and not numeric_dialogues:
        raise ValueError("Empty text choices have no source graphic")
    choices = [
        {"id": choice["id"], "text": texts[i] if meaningful else CIRCLED[i]}
        for i, choice in enumerate(question["choices"])
    ]
    if len(choices) != 5 or any(len(choice["text"]) > 2000 for choice in choices):
        raise ValueError("Native choice contract is not satisfied")
    result = {
        "questionId": question["id"],
        "sourceNumber": number,
        "prompt": stem_text,
        **({"instruction": instruction} if instruction else {}),
        "choices": choices,
        "answerChoiceId": question["answerChoiceId"],
        "conversion": {
            "method": "pdf_text",
            "sourcePage": page_number,
            "bounds": [round(v, 4) for v in rect],
            "nativePrompt": True,
            "nativeChoices": meaningful,
            "originalPrompt": question["prompt"],
        },
    }
    if graph:
        bottom = y1 if graphic_choices else choice_y - 1
        visual_rect = pymupdf.Rect(x0, prompt_bottom + 0.5, x1, bottom)
        if visual_rect.height <= 2:
            raise ValueError("Graphic region is empty")
        pix = page.get_pixmap(
            matrix=pymupdf.Matrix(1.8, 1.8), clip=visual_rect, alpha=False
        )
        image_bytes = pix.tobytes("png")
        url = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")
        if len(url) > 300000 or pix.width > 2400 or pix.height > 2400:
            raise ValueError("Visual image exceeds the existing contract")
        result["image"] = {
            "dataUrl": url,
            "width": pix.width,
            "height": pix.height,
            "role": "visual",
        }
        result["conversion"]["visualSha256"] = sha(image_bytes)
        result["conversion"]["visualBounds"] = [round(v, 4) for v in visual_rect]
    return result


def prepare(source_path: Path) -> dict | None:
    source_bytes = source_path.read_bytes()
    payload = json.loads(source_bytes)
    questions = [
        q for group in payload["editableInput"]["groups"] for q in group["questions"]
    ]
    if not questions or payload["verification"].get("audioOnly"):
        return None
    asset = next(
        (
            file
            for file in payload["sourceFiles"]
            if file["kind"] == "questions"
            or (
                file["kind"] == "paper"
                and payload["createInput"].get("source", {}).get("kind") == "mock_exam"
            )
        ),
        None,
    )
    if asset is None:
        return None
    pdf_bytes = Path(asset["path"]).read_bytes()
    if len(pdf_bytes) != asset["bytes"] or sha(pdf_bytes) != asset["sha256"]:
        raise ValueError("Source PDF differs from verified archive")
    prepared: dict[int, dict] = {}
    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as document:
        for page_number, page in enumerate(document, 1):
            lines = page_lines(page)
            anchors = [
                line
                for line in lines
                if HEADING.match(line["text"])
                and "시행" not in line["text"]
                and 1 <= int(HEADING.match(line["text"])[1]) <= 100
            ]
            columns = []
            for anchor in sorted(anchors, key=lambda line: line["bbox"][0]):
                x = anchor["bbox"][0]
                if not any(abs(x - old) < 24 for old in columns):
                    columns.append(x)
            if len(columns) > 4:
                continue
            shared = []
            for line in lines:
                match = SHARED.match(line["text"])
                if not match:
                    continue
                first_anchor = next(
                    (
                        anchor
                        for anchor in anchors
                        if int(HEADING.match(anchor["text"])[1]) == int(match[1])
                        and abs(anchor["bbox"][0] - line["bbox"][0]) < 24
                        and anchor["bbox"][1] > line["bbox"][1]
                    ),
                    None,
                )
                if not first_anchor:
                    continue
                column_index = next(
                    (
                        i
                        for i, x in enumerate(columns)
                        if abs(x - first_anchor["bbox"][0]) < 24
                    ),
                    None,
                )
                if column_index is None:
                    continue
                right = (
                    columns[column_index + 1] - 12
                    if column_index + 1 < len(columns)
                    else page.rect.width - 30
                )
                instruction_lines = ordered(
                    [
                        candidate
                        for candidate in lines
                        if line["bbox"][0] - 4 <= candidate["bbox"][0] < right
                        and line["bbox"][1] - 1
                        <= candidate["bbox"][1]
                        < first_anchor["bbox"][1] - 1
                    ]
                )
                full_text = " ".join(
                    candidate["text"] for candidate in instruction_lines
                )
                shared.append({**line, "text": full_text})
            for anchor in anchors:
                number = int(HEADING.match(anchor["text"])[1])
                if number > len(questions):
                    continue
                if number in prepared:
                    raise ValueError("Duplicate native source question anchor")
                question = questions[number - 1]
                if question["sourceNumber"] != number:
                    raise ValueError("Original question sequence differs")
                column_index = next(
                    i for i, x in enumerate(columns) if abs(x - anchor["bbox"][0]) < 24
                )
                x0 = max(0, columns[column_index] - 4)
                x1 = (
                    columns[column_index + 1] - 12
                    if column_index + 1 < len(columns)
                    else page.rect.width - 30
                )
                next_anchors = [
                    line
                    for line in anchors
                    if abs(line["bbox"][0] - anchor["bbox"][0]) < 24
                    and line["bbox"][1] > anchor["bbox"][1] + 4
                ]
                following = (
                    min(next_anchors, key=lambda line: line["bbox"][1])
                    if next_anchors
                    else None
                )
                if following is None and asset["kind"] == "paper":
                    closing = next(
                        (
                            line
                            for line in ordered(lines)
                            if line["bbox"][1] > anchor["bbox"][1]
                            and "이제듣기문제가끝났습니다"
                            in re.sub(r"\s+", "", line["text"])
                        ),
                        None,
                    )
                    if closing:
                        # The framed end-of-listening notice is outside Q17.
                        following = {
                            **closing,
                            "bbox": [
                                closing["bbox"][0],
                                closing["bbox"][1] - 10,
                                *closing["bbox"][2:],
                            ],
                        }
                instruction = question.get("instruction")
                shared_top = None
                for line in shared:
                    match = SHARED.match(line["text"])
                    if (
                        int(match[1]) <= number <= int(match[2])
                        and abs(line["bbox"][0] - anchor["bbox"][0]) < 24
                    ):
                        instruction = match[3].strip() or instruction
                        if number == int(match[1]):
                            shared_top = line["bbox"][1] - 3
                if following and HEADING.match(following["text"]):
                    next_number = int(HEADING.match(following["text"])[1])
                    next_shared = next(
                        (
                            line
                            for line in shared
                            if int(SHARED.match(line["text"])[1]) == next_number
                            and abs(line["bbox"][0] - following["bbox"][0]) < 24
                        ),
                        None,
                    )
                    if next_shared:
                        following = {**following, "bbox": next_shared["bbox"]}
                try:
                    prepared[number] = extract_question(
                        page,
                        lines,
                        anchor,
                        following,
                        (x0, x1),
                        instruction,
                        shared_top,
                        question,
                        page_number,
                    )
                except ValueError as error:
                    prepared[number] = fallback(
                        question,
                        str(error),
                        page_number,
                        [
                            x0,
                            anchor["bbox"][1] - 3,
                            x1,
                            following["bbox"][1] - 3
                            if following
                            else page.rect.height - 44,
                        ],
                    )
        first_page_bounds = list(document[0].rect)
    regions_path = payload["verification"].get("originalRegionEvidencePath")
    original_regions = (
        {
            row["sourceNumber"]: row
            for row in json.loads(Path(regions_path).read_text("utf8"))
        }
        if regions_path
        else {}
    )
    converted = [
        prepared.get(question["sourceNumber"])
        or fallback(
            question,
            "Source text is outlined or has no reliable numbered boundaries",
            original_regions.get(question["sourceNumber"], {}).get("page", 1),
            original_regions.get(question["sourceNumber"], {}).get(
                "bounds", first_page_bounds
            ),
        )
        for question in questions
    ]
    return {
        "schemaVersion": 1,
        "sourceRecordId": payload["sourceRecordId"],
        "preparedAt": datetime.now(timezone.utc).isoformat(),
        "originalPreparedPath": source_path.resolve().as_posix(),
        "originalPreparedSha256": sha(source_bytes),
        "sourceQuestionPdfSha256": asset["sha256"],
        "questions": converted,
        "conversion": {
            "parser": "verified_pdf_character_geometry_v1",
            "questionCount": len(questions),
            "nativeCount": sum(
                q["conversion"]["method"] != "original_image_preserved"
                for q in converted
            ),
            "preservedImageCount": sum(
                q["conversion"]["method"] == "original_image_preserved"
                for q in converted
            ),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--source-id")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write local staging only; never writes to a database",
    )
    args = parser.parse_args()
    root = args.root.resolve() / "output/listening-assessments"
    paths = sorted(
        [
            *root.glob("prepared-registration/ebs*.json"),
            *root.glob("prepared-historical-registration/ebs*.json"),
        ]
    )
    if args.source_id:
        paths = [path for path in paths if path.stem == args.source_id]
        if len(paths) != 1:
            raise ValueError("Expected exactly one original prepared source")
    summaries = []
    errors = []
    destination = root / "prepared-native-registration"
    for path in paths:
        try:
            result = prepare(path)
        except ValueError as error:
            errors.append({"sourceRecordId": path.stem, "error": str(error)})
            continue
        if result is None:
            continue
        summaries.append(
            {
                "sourceRecordId": result["sourceRecordId"],
                **result["conversion"],
                "fallbacks": [
                    {
                        "number": q["sourceNumber"],
                        "reason": q["conversion"].get("reason"),
                    }
                    for q in result["questions"]
                    if q["conversion"]["method"] == "original_image_preserved"
                ],
            }
        )
        if args.write:
            destination.mkdir(parents=True, exist_ok=True)
            target = destination / (result["sourceRecordId"] + ".json")
            temp = target.with_suffix(".json.tmp")
            temp.write_text(json.dumps(result, ensure_ascii=False, indent=2), "utf8")
            temp.replace(target)
    report = {
        "preparedAt": datetime.now(timezone.utc).isoformat(),
        "databaseWritten": False,
        "files": summaries,
        "errors": errors,
        "totals": {
            "assessments": len(summaries),
            "questions": sum(row["questionCount"] for row in summaries),
            "native": sum(row["nativeCount"] for row in summaries),
            "preservedImages": sum(row["preservedImageCount"] for row in summaries),
        },
    }
    if args.write:
        destination.mkdir(parents=True, exist_ok=True)
        (destination / "manifest.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), "utf8"
        )
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
