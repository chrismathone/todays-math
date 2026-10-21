from pathlib import Path
import io
import json
import hashlib
import fitz
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
contact = Image.new('RGB', (860, 3 * 270), 'white')
draw = ImageDraw.Draw(contact)
rows = []
for i, beta in enumerate([9,16,72]):
    path = OUT / 'native-once' / f'beta-{beta}.svg'
    with fitz.open(stream=path.read_bytes(), filetype='svg') as document:
        png = document[0].get_pixmap(matrix=fitz.Matrix(2,2), alpha=False).tobytes('png')
    image = Image.open(io.BytesIO(png)).convert('RGB')
    image.thumbnail((820,225))
    contact.paste(image, ((860-image.width)//2, i*270+30))
    draw.text((14, i*270+5), f'candidate only: B/D angle {beta} degrees', fill='black')
    (path.with_suffix('.png')).write_bytes(png)
    rows.append(dict(beta=beta, svgSha256=hashlib.sha256(path.read_bytes()).hexdigest()))
contact.save(OUT/'contact.png')
(OUT/'rasterization.json').write_bytes((json.dumps(dict(technicalOnly=True,assets=rows,pixelMathOracle=False),indent=2)+'\n').encode('utf-8'))
