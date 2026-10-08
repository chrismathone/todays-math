"""Bounded HWP5 record reader, never decodes endnote/footnote contents.

Only selected question paragraphs (q2, q3, q15, q21) are decoded.
Record layout reference (upstream parser, read only; no installed dependency):
https://github.com/mete0r/pyhwp/blob/master/src/hwp5/binmodel/tagid69_shape_component_picture.py
The comparison is evidence of selected content, not a complete HWP conversion.
"""
import hashlib
import json
import struct
import sys
import zlib

import fitz
import olefile

from inspect_sources import OUT, digest, save_json

sys.stdout.reconfigure(encoding="utf-8")
sources = {s["id"]: s for s in json.loads((OUT / "source-files.json").read_text(encoding="utf-8"))}
SELECTED = {2, 3, 15, 21}


def records(data):
    pos = 0
    while pos < len(data):
        header_offset = pos
        h = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        tag, level, size = h & 1023, (h >> 10) & 1023, h >> 20
        if size == 4095:
            size = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        assert pos + size <= len(data)
        yield {"tag": tag, "level": level, "header_offset": header_offset,
               "payload": data[pos:pos + size]}
        pos += size


def paragraph_text(payload):
    words = struct.unpack("<" + "H" * (len(payload) // 2), payload)
    extended = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23}
    out, i = [], 0
    while i < len(words):
        c = words[i]
        if c in extended:
            out.append(" ")
            i += 8
        else:
            out.append(chr(c) if c >= 32 else " ")
            i += 1
    return "".join(out).strip()


questions = {q: {"question_number": q, "paragraphs": [], "equations": [], "pictures": []} for q in sorted(SELECTED)}
note_skips, qcount = 0, 0
stop_after_last_picture = False
with olefile.OleFileIO(sources["s5"]["current_path"]) as ole:
    flags = struct.unpack_from("<I", ole.openstream("FileHeader").read(), 36)[0]
    data = ole.openstream("BodyText/Section0").read()
    data = zlib.decompress(data, -15) if flags & 1 else data
    # Top-level paragraph blocks allow anchors to be counted before decoding
    # the main paragraph's text (which precedes the endnote control record).
    blocks, current = [], []
    for rec in records(data):
        if rec["tag"] == 66 and rec["level"] == 0 and current:
            blocks.append(current)
            current = []
        current.append(rec)
    if current:
        blocks.append(current)
    for block in blocks:
        if stop_after_last_picture:
            break
        anchors = [r for r in block if r["tag"] == 71 and r["level"] == 1 and r["payload"][:4][::-1] == b"en  "]
        assert len(anchors) <= 1
        if anchors:
            qcount += 1
        if qcount not in SELECTED:
            continue
        skip_level = None
        for rec in block:
            level, tag, payload = rec["level"], rec["tag"], rec["payload"]
            if skip_level is not None:
                if level > skip_level:
                    continue
                skip_level = None
            if tag == 71 and payload[:4][::-1] in {b"en  ", b"fn  ", b"head", b"foot"}:
                skip_level = level
                note_skips += 1
                continue
            if tag == 67:
                text = paragraph_text(payload)
                if text and not text.startswith(("[중단원]", "[난이도]")) and text != "대구광역시 내신 수학 연구회":
                    questions[qcount]["paragraphs"].append({"offset": rec["header_offset"], "text": text})
            elif tag == 88:
                n = struct.unpack_from("<H", payload, 4)[0]
                text = payload[6:6 + n * 2].decode("utf-16le")
                questions[qcount]["equations"].append({"offset": rec["header_offset"], "script": text})
            elif tag == 85:
                bindata_id = struct.unpack_from("<H", payload, 71)[0]
                stream_name = f"BinData/BIN{bindata_id:04X}.bmp"
                image_bytes = ole.openstream(stream_name).read()
                try:
                    image_bytes = zlib.decompress(image_bytes, -15)
                except zlib.error:
                    pass
                assert image_bytes.startswith(b"BM")
                pix = fitz.Pixmap(image_bytes)
                name = f"s5-hwp-q{qcount}-figure.png"
                pix.save(OUT / name)
                rgb = fitz.Pixmap(fitz.csRGB, pix) if pix.colorspace.n != 3 else pix
                questions[qcount]["pictures"].append({"offset": rec["header_offset"], "stream": stream_name,
                    "file": name, "width": pix.width, "height": pix.height,
                    "decompressed_bmp_sha256": hashlib.sha256(image_bytes).hexdigest(),
                    "rgb_pixels_sha256": hashlib.sha256(rgb.samples).hexdigest(), "png_sha256": digest(OUT / name)})
                if qcount == 21:
                    stop_after_last_picture = True
                    break

result = {"source_id": "s5", "source_sha256": sources["s5"]["sha256"], "question_anchor_count": qcount,
          "selected_question_numbers": sorted(SELECTED), "selected_note_subtrees_skipped": note_skips,
          "stop_offset_after_q21_picture": 99382,
          "answer_or_solution_records_decoded": False, "questions": list(questions.values())}
assert qcount == 21
save_json("hwp-question-only-evidence.json", result)
print(json.dumps(result, ensure_ascii=False, indent=2))
