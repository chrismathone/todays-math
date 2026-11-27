"""Generate phone-like JPEGs and geometry truth from local product PDFs."""
import hashlib
import json
import math
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps
import pypdfium2

SEED = 261127
FONTS = ["Gaegu-Regular.ttf", "NanumPenScript-Regular.ttf", "HiMelody-Regular.ttf"]
# (long edge, half bend angle, paper luminance range, RGB tint, blur, noise, JPEG)
PROFILES = {
    "flat-warm": (3000, 0, (187, 200), (9, 2, -9), .55, 1.3, 90),
    "left-shadow": (3400, 0, (140, 198), (4, 0, -5), .85, 2.1, 75),
    "right-bend": (3800, .30, (151, 200), (-7, 0, 8), 1.0, 2.7, 68),
    "tilted-bend": (4000, .52, (140, 191), (7, 0, -8), 1.35, 3.4, 60),
}
# Source suffix: (correct, partial where meaningful, misconception).
# Vertical bars are intentional physical line breaks in roomy B/D slots.
PROSE = {
    "1-c1": ("모양과 크기가 같아서|포개면 완전히 겹친다.", "모양이 같다.", "넓이만 같으면 합동이다."),
    "1-xc2": ("한 도형을 본떠서|다른 도형에 포갠다.|완전히 겹치는지 본다.", "종이에 본뜬다.", "둘레만 재서 비교한다."),
    "1-xc10": ("포개면 완전히 겹쳐서|넓이와 둘레가 모두 같다.", "넓이가 같다.", "넓이는 같지만 둘레는 항상 다르다."),
    "1-c3": ("합동이 아니다.|넓이는 둘 다 12지만|변의 길이가 달라 겹치지 않는다.", "합동이 아니다.", "넓이가 같아서 항상 합동이다."),
    "2-c1": ("합동인 두 도형을 포갰을 때|겹치는 두 점이다.", "서로 짝이 되는 점이다.", "한 도형에서 마주 보는 점이다."),
    "2-c2": ("합동인 두 도형을 포갰을 때|겹치는 두 변이다.", "길이가 같은 변이다.", "한 도형에서 마주 보는 변이다."),
    "2-c4": ("대응변의 길이는 서로 같고|대응각의 크기도 서로 같다.", "대응변의 길이는 같다.", "대응변의 길이와 대응각의 크기가 다르다."),
    "2-c5": ("한 도형을 돌려 포갠 뒤|겹치는 점과 변과 각을 찾는다.", "한 도형을 돌려 본다.", "위치가 서로 반대인 것끼리 짝짓는다."),
    "1-xa1": ("합동", None, "닮음"),
    "2-xa3": ("꼭짓점, 변, 각이 각각 6개이고 포개면 짝이 된다.", "각각 6개이다.", "변만 6개이다."),
    "1-f1.line1": ("합동인 두 도형", None, "닮은 두 도형"),
    "1-f1.line2": ("크기를 바꾸지 않고 옮겨 포갤 수 있다.", "옮길 수 있다.", "크기를 바꾸어야 포갤 수 있다."),
    "2-f1.line1": ("꼭짓점 ㅁ", None, "꼭짓점 ㅂ"),
    "2-f1.line2": ("변 ㄹㅂ", None, "변 ㄹㅁ"),
    "1-xo1.mark": ("○", None, "×"),
    "1-xo1.reason": ("포개면 꼭 맞게 겹친다.", None, "포개면 크기가 달라서 겹치지 않는다."),
    "2-xo1.mark": ("○", None, "×"),
    "2-xo1.reason": ("꼭짓점이 셋이다.", None, "꼭짓점이 넷이다."),
}
WRONG_BLANK = {
    "겹치는": "마주 보는", "합동": "닮음", "포개어": "나란히",
    "겹치는지": "떨어지는지", "크기": "모양", "같다": "다르다",
    "아니다": "이다", "대응점": "꼭짓점", "대응변": "짝변", "길이": "넓이",
}


def answers(page, variant):
    targets = {sid: target for target in page["targets"] for sid in target["slotIds"]}
    question_ids = {q["id"]: q["sourceId"].removeprefix("e5-2-3-") for q in page["questions"]}
    for i, slot in enumerate(page["slots"]):
        sid, kind = slot["id"], slot["kind"]
        key = question_ids[slot["questionId"]]
        correct = targets[sid]["referenceAnswer"]
        if kind == "cloze":
            choices = (correct, None, WRONG_BLANK[correct])
        elif kind in {"ox-mark", "ox-reason", "figure-line"}:
            choices = PROSE[key + "." + sid.rsplit(".", 1)[1]]
        else:
            choices = PROSE[key]
        index = (variant + i) % 4
        if index == 1 and choices[1] is None:
            index = 0
        text = (*choices, "")[index]
        yield sid, kind, ("맞음", "부분", "오개념", "빈칸")[index], text


def union(boxes):
    return [min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes)]


def corners(box):
    l, t, r, b = box
    return [(l, t), (r, t), (r, b), (l, b)]


def xy(box):
    return [box["x"], box["y"], box["x"] + box["width"], box["y"] + box["height"]]


def bend(x, width, angle):
    if not angle:
        return x
    radius = width / (2 * angle)
    return width / 2 + radius * np.sin((x - width / 2) / radius)


def homography(matrix, x, y):
    a, b, c, d, e, f, g, h, i = matrix.ravel()
    div = g * x + h * y + i
    return (a * x + b * y + c) / div, (d * x + e * y + f) / div


def geometry(points, project):
    return {"mm": points, "px": [project(x, y) for x, y in points]}


def box_truth(boxes, scale, project):
    by_mm = [[x / scale[0], y / scale[1], r / scale[0], b / scale[1]]
             for x, y, r, b in boxes]
    bounds = union(by_mm)
    rectangles = np.asarray(by_mm)
    x, y = project(rectangles[:, [0, 2, 2, 0]], rectangles[:, [1, 1, 3, 3]])
    return {"mm": bounds, "px": [float(x.min()), float(y.min()), float(x.max()), float(y.max())]}


def occupied_spans(mask, x, y):
    """Pixel-edge bounds of occupied rows. Same-row endpoints suffice for the box extrema."""
    spans = []
    for row, values in enumerate(np.asarray(mask)):
        pixels = np.flatnonzero(values)
        if pixels.size:
            spans.append([x + int(pixels[0]), y + row, x + int(pixels[-1]) + 1, y + row + 1])
    return spans


def merge_ink(layer, mask, x, y):
    patch = (x, y, x + mask.width, y + mask.height)
    layer.paste(ImageChops.lighter(layer.crop(patch), mask), (x, y))
    return occupied_spans(mask, x, y)


def write_line(layer, value, font_path, size, x, y, slope, rng, ghost=False):
    start, boxes = x, []
    for char in value:
        font = ImageFont.truetype(str(font_path), max(7, round(size * rng.uniform(.86, 1.14))))
        if char.isspace():
            x += font.getlength(char) * rng.uniform(.8, 1.35)
            continue
        left, top, right, bottom = font.getbbox(char, anchor="ls")
        padding = 5
        glyph = Image.new("L", (right - left + 2 * padding, bottom - top + 2 * padding))
        strength = int(rng.integers(95, 195) if not ghost else rng.integers(10, 26))
        ImageDraw.Draw(glyph).text((padding - left, padding - top), char, fill=strength,
                                   font=font, anchor="ls", stroke_width=int(not ghost and rng.random() < .27))
        glyph = glyph.rotate(float(rng.uniform(-10, 10)), resample=Image.Resampling.BICUBIC)
        gx = round(x + left - padding + rng.uniform(-2, 2))
        gy = round(y + slope * (x - start) + top - padding + rng.uniform(-2, 2))
        boxes.extend(merge_ink(layer, glyph, gx, gy))
        x += font.getlength(char) * rng.uniform(.86, 1.08)
    if not boxes:
        raise ValueError(f"No ink for {value!r}")
    return boxes


def handwriting(blank, source, variant, font_path, rng, project):
    layout = source["layout"]
    sx, sy = blank.width / layout["width"], blank.height / layout["height"]
    layer = Image.new("L", blank.size)
    boxes = {slot["slotId"]: slot["box"] for slot in layout["slots"]}
    slots = []
    for i, (sid, kind, intent, text) in enumerate(answers(source["page"], variant)):
        box = boxes[sid]
        l, t, r, b = xy(box)
        row = {"id": sid, "kind": kind, "intent": intent,
               "corners": geometry(corners([l, t, r, b]), project),
               "lines": [], "erasures": [], "overrun": False}
        slots.append(row)
        if not text:
            continue
        if kind == "ox-mark":
            # Mark the printed option with a pencil tick.
            tick = Image.new("L", (45, 45))
            ImageDraw.Draw(tick).line([(4, 23), (17, 36), (40, 7)],
                                      fill=int(rng.integers(105, 180)), width=4)
            center = l + (3.97 if text == "○" else r - l - 3.97)
            edits = merge_ink(layer, tick, round(center * sx - 22), round((b + t) * sy / 2 - 22))
            ink = box_truth(edits, (sx, sy), project)
            row["lines"].append({"text": text, "struckBefore": None, "ink": ink, "fullInk": ink})
            continue
        lines = text.split("|")
        compact = b - t < 9
        size = min(4.9 if compact else 5.6, (b - t) * .91) * sx
        slope = float(rng.uniform(-.055, .055))
        baseline = (b - .45 if compact else t + 6.9) * sy
        if source["form"] == "D":
            baseline = (t + 9.5) * sy
        for j, line in enumerate(lines):
            advance = ImageFont.truetype(str(font_path), round(size)).getlength(line)
            # Fit the line before jitter. Deliberate overrun uses the right edge.
            line_size = min(size, size * ((r - l - 2) * sx) / max(advance, 1))
            advance *= line_size / size
            x = (l + (0.6 if compact else 2.5)) * sx
            if j == 0 and (variant + i) % 7 == 2:
                x = r * sx - advance + 1.9 * sx
                if not compact:
                    # Controlled short overrun without crushing the last syllable against the image edge.
                    x = max(x, l * sx)
            y = baseline + float(rng.uniform(-.25, .25)) * sy
            crossed = None
            strike = []
            if j == 0 and not compact and (variant + i) % 5 == 1:
                crossed = "넓이"
                strike = write_line(layer, crossed, font_path, line_size, x, y, slope, rng)
                left, top, right, bottom = union(strike)
                mask = Image.new("L", (right - left + 7, bottom - top + 8))
                draw = ImageDraw.Draw(mask)
                for frac in (.34, .66):
                    cy = round(4 + frac * (bottom - top))
                    draw.line((1, cy + 1, right - left + 5, cy - 2), fill=176, width=3)
                strike.extend(merge_ink(layer, mask, left - 3, top - 4))
                x = right + 5 * sx
                row["erasures"].append({"kind": "strike", "text": crossed, "line": j,
                                         "ink": box_truth(strike, (sx, sy), project)})
            edits = write_line(layer, line, font_path, line_size, x, y, slope, rng)
            active_ink = box_truth(edits, (sx, sy), project)
            full_ink = box_truth(strike + edits, (sx, sy), project) if strike else active_ink
            il, it, ir, ib = full_ink["mm"]
            row["overrun"] |= il < l or ir > r or it < t or ib > b
            row["lines"].append({"text": line, "struckBefore": crossed, "ink": active_ink, "fullInk": full_ink})
            baseline += float(rng.uniform(6.5, 9.0)) * sy
        if not compact and (variant + i) % 4 == 0:
            ghost_text = "모양"
            edits = write_line(layer, ghost_text, font_path, size * .85, (l + 8) * sx,
                               baseline, slope, rng, ghost=True)
            row["erasures"].append({"kind": "ghost", "text": ghost_text, "line": None,
                                     "ink": box_truth(edits, (sx, sy), project)})
    return ImageChops.multiply(blank, ImageOps.invert(layer)), slots


def photograph(paper, width_mm, height_mm, width, height, inverse, profile, rng):
    _, angle, light, tint, blur, noise, _ = profile
    # Inverse sample in strips to bound memory. Pixel centres follow the existing product convention.
    output = np.empty((height, width, 3), dtype=np.uint8)
    source = np.asarray(paper)
    grain = rng.uniform(0, math.tau)
    x = np.arange(width, dtype=np.float32)[None, :] + .5
    for top in range(0, height, 192):
        y = np.arange(top, min(top + 192, height), dtype=np.float32)[:, None] + .5
        cx, cy = homography(inverse, x, y)
        if angle:
            radius = width_mm / (2 * angle)
            cx = width_mm / 2 + radius * np.arcsin(np.clip((cx - width_mm / 2) / radius, -1, 1))
        ink = cv2.remap(source, (cx * paper.width / width_mm - .5).astype(np.float32),
                        (cy * paper.height / height_mm - .5).astype(np.float32),
                        cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        lit = np.clip(.62 * cx / width_mm + .38 * cy / height_mm, 0, 1)
        if light[0] < 160:
            # A soft cast shadow across the diagonal, including the target dim-paper range.
            lit = .24 * lit + .76 / (1 + np.exp(np.clip(-(lit - .50) * 19, -50, 50)))
        luminance = light[0] + (light[1] - light[0]) * lit
        mask = (cx >= 0) & (cx <= width_mm) & (cy >= 0) & (cy <= height_mm)
        wood = 6 * np.sin(x * .032 + np.sin(y * .008) + grain) + 3 * np.sin(x * .21 + y * .015)
        desk = wood[..., None] + np.array([109, 83, 61], dtype=np.float32)
        reflected = (luminance[..., None] + np.array(tint, dtype=np.float32)) * (ink[..., None] / 255)
        output[top:top + len(y)] = np.where(mask[..., None], reflected, desk).clip(0, 255)
    output = cv2.GaussianBlur(output, (0, 0), blur)
    for top in range(0, height, 192):
        strip = output[top:top + 192]
        strip[:] = np.clip(strip + rng.normal(0, noise, strip.shape), 0, 255)
    return Image.fromarray(output)


def make_photo(blank, source, source_index, variant, font, out):
    section, form, layout = (source[k] for k in ("section", "form", "layout"))
    profile = list(PROFILES)[variant]
    settings = PROFILES[profile]
    height, angle, *_ = settings
    width = round(height * .79)
    wm, hm = layout["width"], layout["height"]
    rng = np.random.default_rng([SEED, source_index, variant])
    quad = [
        [( .09, .08), (.90, .08), (.90, .92), (.09, .92)],
        [( .12, .10), (.91, .07), (.92, .90), (.16, .94)],
        [( .11, .07), (.90, .10), (.85, .94), (.08, .89)],
        [( .18, .06), (.93, .14), (.83, .94), (.06, .85)],
    ][variant]
    src = np.float32([(bend(x, wm, angle), y) for x, y in corners([0, 0, wm, hm])])
    dst = np.float32(quad) * np.float32([width, height])
    matrix = cv2.getPerspectiveTransform(src, dst)
    inverse = np.linalg.inv(matrix)

    def project(x, y):
        return homography(matrix, bend(x, wm, angle), y)

    sheet, slots = handwriting(blank, source, (variant + (int(section[-1]) - 1)) % 4, font, rng, project)
    name = f"{section}-{form}-{profile}"
    photo = photograph(sheet, wm, hm, width, height, inverse, settings, rng)
    photo.save(out / f"{name}.jpg", quality=settings[-1])
    truth = {
        "version": 1, "seed": SEED, "photo": f"{name}.jpg", "sourceIndex": source_index,
        "bankFingerprint": source["bankFingerprint"], "blank": f"blank-{source_index}.png",
        "profile": profile, "font": font.name, "fontSha256": hashlib.sha256(font.read_bytes()).hexdigest(),
        "widthMm": wm, "heightMm": hm, "widthPx": width, "heightPx": height,
        "paperLuminanceRange": settings[2], "tintRgb": settings[3],
        "blurSigmaPx": settings[4], "noiseSigma": settings[5], "jpegQuality": settings[6],
        "angle": angle, "homography": matrix.ravel().tolist(),
        "inverseHomography": inverse.ravel().tolist(),
        "markers": geometry([(m["x"], m["y"]) for m in layout["markers"]], project),
        "qr": {"version": source["qrVersion"], "url": source["url"],
               "outer": geometry(corners(xy(layout["qr"])), project),
               "data": geometry([(q["x"], q["y"]) for q in source["qrDataCorners"]], project)},
        "slots": slots,
    }
    (out / f"{name}.json").write_text(json.dumps(truth, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return name


def comparisons(out, references, names):
    stats = []
    for form, ref in [("C", "c"), ("B", "db")]:
        real = Image.open(references / f"paper-{ref}.jpg").convert("RGB")
        for profile in ("flat-warm", "left-shadow"):
            name = next(n for n in names if n == f"2-3-1-{form}-{profile}")
            synthetic = Image.open(out / f"{name}.jpg").convert("RGB")
            truth = json.loads((out / f"{name}.json").read_text(encoding="utf-8"))
            # Page overview plus enlarged answer-area crops. Real assets are blank mockup inputs.
            points = truth["slots"][0]["corners"]["px"]
            l, t, r, b = union([[x, y, x, y] for x, y in points])
            real_crop = real.crop((55, 230, 1140, 540))
            synth_crop = synthetic.crop((int(l - 130), int(t - 70), int(max(r + 130, l + 550)), int(max(b + 55, t + 310))))
            canvas = Image.new("RGB", (1120, 1110), (240, 239, 238))
            label = ImageDraw.Draw(canvas)
            for column, (full, crop, title) in enumerate([
                (real, real_crop, f"Reference paper-{ref}.jpg"),
                (synthetic, synth_crop, name),
            ]):
                x = 560 * column + 16
                label.text((x, 12), title, fill="black")
                canvas.paste(ImageOps.contain(full, (528, 775)), (x, 33))
                canvas.paste(ImageOps.contain(crop, (528, 278)), (x, 822))
                gray = np.asarray(crop.convert("L"))
                stats.append({"comparison": name, "side": title, "cropLumaP05P50P95":
                              np.percentile(gray, [5, 50, 95]).round(1).tolist(),
                              "p01": round(float(np.percentile(gray, 1)), 1)})
            canvas.save(out / f"compare-{form}-{profile}.jpg", quality=91)
    (out / "comparison-stats.json").write_text(json.dumps(stats, indent=2) + "\n")


def main():
    out, font_dir, references = map(Path, sys.argv[1:])
    for filename in FONTS:
        ImageFont.truetype(str(font_dir / filename), 30)
    sources = json.loads((out / "sources.json").read_text(encoding="utf-8"))
    names = []
    for source_index, source in enumerate(sources):
        pdf = pypdfium2.PdfDocument(out / source["pdf"])
        page = pdf[source["pdfIndex"]]
        blank = page.render(scale=300 / 72).to_pil().convert("L")
        blank.save(out / f"blank-{source_index}.png")
        page.close()
        pdf.close()
        for variant in range(len(PROFILES)):
            # Both D pages participate, alternating by profile to balance the four forms at eight photos each.
            if source["form"] == "D" and (source["page"]["number"] - 3) != variant % 2:
                continue
            font = font_dir / FONTS[(source_index + variant) % len(FONTS)]
            names.append(make_photo(blank, source, source_index, variant, font, out))
    if len(names) != 32 or len(set(names)) != len(names):
        raise ValueError("Expected 32 distinct photos")
    comparisons(out, references, names)
    (out / "photos.json").write_text(json.dumps(names, indent=2) + "\n")


if __name__ == "__main__":
    main()
