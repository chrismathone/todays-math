"""Rasterize our code-native test SVGs for visual QA, never calculate math from pixels."""
from pathlib import Path
import hashlib
import io
import json

import fitz
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
native = OUT / 'native'
chosen = [(t, i) for i in [0, 2, 6, 9] for t in ['09', '10']]
contact = Image.new('RGB', (880, 4 * 330), 'white')
draw = ImageDraw.Draw(contact)
rows = []
for index, (type_id, i) in enumerate(chosen):
    svg = native / f'type-{type_id}-triple-{i}.svg'
    with fitz.open(stream=svg.read_bytes(), filetype='svg') as doc:
        png = doc[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).tobytes('png')
    image = Image.open(io.BytesIO(png)).convert('RGB')
    image.thumbnail((420, 292))
    x, y = (index % 2) * 440, (index // 2) * 330
    contact.paste(image, (x + (440 - image.width) // 2, y + 26))
    draw.text((x + 10, y + 5), f'type {type_id} / triple index {i}', fill='black')
    output = native / (svg.stem + '.png')
    output.write_bytes(png)
    rows.append(dict(svg=svg.name, svgSha256=hashlib.sha256(svg.read_bytes()).hexdigest(),
                     png=output.name, pngSha256=hashlib.sha256(png).hexdigest()))
contact.save(OUT / 'contact.png')
(OUT / 'rasterization.json').write_bytes((json.dumps(dict(assets=rows, method='PyMuPDF rasterization of own strict typeset SVGs',
    pixelMathOracle=False, actualQuestionOrApprovedAssetCount=0), indent=2) + '\n').encode('utf-8'))
print(json.dumps(dict(technicalPNGs=len(rows), noQuestionApproval=True)))
