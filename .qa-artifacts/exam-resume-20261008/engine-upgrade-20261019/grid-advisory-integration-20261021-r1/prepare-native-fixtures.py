"""Technical alpha PNG fixtures via the existing engine rasterizer; no install."""
from pathlib import Path
import base64
import hashlib
import json
import sys

sys.path.insert(0, str(Path('vendor/figure-engine').resolve()))
from core.figure_svg import svg_to_png_bytes

OUT = Path(__file__).resolve().parent
lines = [f'<path d="M{10+i*10} 10V90"/>' for i in range(9)]
lines += [f'<path d="M10 {10+i*10}H90"/>' for i in range(9)]
grid = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g stroke="#888" stroke-width="1" fill="none">' + ''.join(lines) + '</g><path d="M30 60L70 30" fill="none" stroke="black" stroke-width="2"/></svg>'
triangle = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><path d="M10 90L80 10L170 90Z" fill="none" stroke="black"/></svg>'
records = {}
for name, svg, width in [('grid', grid, 100), ('triangle', triangle, 200)]:
    png = svg_to_png_bytes(svg, width)
    assert png and png[1:4] == b'PNG'
    (OUT / f'source-{name}-r1.png').write_bytes(png)
    records[name] = dict(svgSHA256=hashlib.sha256(svg.encode()).hexdigest(),
        pngSHA256=hashlib.sha256(png).hexdigest(),
        dataUrl='data:image/png;base64,' + base64.b64encode(png).decode())
target = OUT / 'native-fixtures-r1.json'
assert not target.exists()
target.write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
print(json.dumps(dict(actualNativeRasterizations=2, sourceOrQuestionImagesUsed=0)))
