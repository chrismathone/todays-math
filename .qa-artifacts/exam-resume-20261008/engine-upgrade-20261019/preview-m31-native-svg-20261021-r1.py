"""Rasterize native vector previews for human inspection; no pixel math oracle."""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import fitz
from PIL import Image, ImageDraw

B = Path('.qa-artifacts/exam-resume-20261008')
OUT = B / 'engine-upgrade-20261019/m31-vector-visual-check-20261021-r1'
assert not OUT.exists()
OUT.mkdir()
sheet = Image.new('RGB', (1120, 600), 'white')
draw = ImageDraw.Draw(sheet)
bindings = []
for index, n in enumerate(range(5, 13)):
    source = B / f'm31-outline-current-audit-20261021-r1/own-rendered/n{n}.svg'
    raw = source.read_bytes()
    document = fitz.open(stream=raw, filetype='svg')
    png = document[0].get_pixmap(matrix=fitz.Matrix(1.15, 1.15), alpha=False).tobytes('png')
    target = OUT / f'n{n}.png'
    target.write_bytes(png)
    x, y = (index % 4) * 280, (index // 4) * 300
    draw.text((x + 12, y + 8), f'n = {n}; boundary only', fill='black')
    sheet.paste(Image.open(BytesIO(png)).convert('RGB'), (x + 10, y + 28))
    bindings.append(dict(n=n, source=source.as_posix(), sourceSha256=hashlib.sha256(raw).hexdigest(),
        preview=target.as_posix(),previewSha256=hashlib.sha256(png).hexdigest()))
sheet.save(OUT / 'contact.png')
(OUT / 'manifest.json').write_bytes((json.dumps(dict(kind='engine-vector-preview-visual-check/v1',
    rasterizer='PyMuPDF', sourceNativeRenderer='project strict renderFigureSpec',
    previews=bindings, pixelMathOracle=False, physicalPrintReview=False,
    nativeGradeRightsOrReleaseApproval=False),indent=2)+'\n').encode('utf-8'))
print(str(OUT / 'contact.png'))
