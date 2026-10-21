"""Add a white SVG preview canvas; preserve the actual transparent SVG bytes."""
from pathlib import Path
import datetime,hashlib,json,sys,xml.etree.ElementTree as ET
sys.path.insert(0,str(Path('vendor/figure-engine').resolve()))
from core.figure_svg import svg_to_png_bytes
out=Path(__file__).resolve().parent
data=json.loads((out/'actual-current.json').read_text(encoding='utf-8'));rows=[]
for row in data['rows']:
    svg=(out/row['file']).read_text(encoding='utf-8')
    x,y,w,h=ET.fromstring(svg).attrib['viewBox'].split()
    end=svg.index('>')+1
    display=svg[:end]+f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="white"/>'+svg[end:]
    png=svg_to_png_bytes(display,720);assert png
    filename=row['file'].replace('.svg','-white.png')
    with(out/filename).open('xb')as f:f.write(png)
    rows.append(dict(id=row['id'],file=filename,actualSVG_SHA256=hashlib.sha256(svg.encode()).hexdigest(),previewSVG_SHA256=hashlib.sha256(display.encode()).hexdigest(),pngSHA256=hashlib.sha256(png).hexdigest()))
with(out/'preview-white-manifest.json').open('x',encoding='utf-8')as f:
    json.dump(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),actualSVGUnchanged=True,onlyPreviewCanvasAdded=True,renderer='vendored core.figure_svg.svg_to_png_bytes / resvg_py',pixelAnswerOracle=False,physicalPrintApproval=False,rows=rows),f,indent=2);f.write('\n')
print(json.dumps(dict(previews=len(rows))))
