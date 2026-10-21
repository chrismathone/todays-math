"""Rasterize the already rendered SVG with the vendored engine's existing helper."""
from pathlib import Path
import datetime,hashlib,json,sys
sys.path.insert(0,str(Path('vendor/figure-engine').resolve()))
from core.figure_svg import svg_to_png_bytes
out=Path(__file__).resolve().parent
data=json.loads((out/'actual-current.json').read_text(encoding='utf-8'))
rows=[]
for row in data['rows']:
    svg=(out/row['file']).read_text(encoding='utf-8')
    png=svg_to_png_bytes(svg,720)
    assert png is not None,row['id']
    filename=row['file'].replace('.svg','.png')
    with (out/filename).open('xb')as f:f.write(png)
    rows.append(dict(id=row['id'],file=filename,svgSHA256=hashlib.sha256(svg.encode()).hexdigest(),pngSHA256=hashlib.sha256(png).hexdigest()))
with (out/'preview-manifest.json').open('x',encoding='utf-8')as f:
    json.dump(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),actualPublicSVG=True,renderer='vendored core.figure_svg.svg_to_png_bytes / resvg_py',technicalOnly=True,pixelsNotMathOracle=True,rows=rows),f,indent=2);f.write('\n')
print(json.dumps(dict(previews=len(rows))))
