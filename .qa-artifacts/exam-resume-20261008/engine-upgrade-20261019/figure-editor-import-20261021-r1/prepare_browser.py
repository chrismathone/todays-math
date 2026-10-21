"""Prepare a private actual-component fixture; no API or bank records."""
from pathlib import Path
import hashlib
import json
import sys

OUT=Path(__file__).resolve().parent
ROOT=Path.cwd()
sys.path.insert(0,str(ROOT/'scripts/figure'))
from engine_path import ensure_on_path
ensure_on_path()
from graph_scene import render_graph
from core.figure_quality import sanitize_svg
spec=dict(version='graph-1',xRange=[0,8],yRange=[0,5],axes=False,grid=dict(step=1),
 segments=[{'from':[1,1],'to':[4,4],'arrow':True},{'from':[5,4],'to':[7,1],'arrow':True}],
 labels=[dict(at=[2.5,2.5],text='$\\vec{AB}$',dx=-18),dict(at=[6,2.5],text='$\\vec{a}$',dx=18)])
svg=sanitize_svg(render_graph(spec))
(OUT/'browser/fixture-source.json').write_bytes((json.dumps(dict(svg=svg,technicalCalibrationOnly=True,newAuthoredQuestions=0),ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
raw=(ROOT/'src/app/globals.css').read_bytes();css=raw.decode('utf-8')
assert css.count('@import "tailwindcss";')==1
css=css.replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "'+(ROOT/'src/components/unified/figure-editor').as_posix()+'";',1)
css+='\n@font-face{font-family:QA-Pretendard;src:url("/fonts/PretendardVariable.woff2") format("woff2");font-weight:45 920;font-display:swap;}\n:root{--font-pretendard:QA-Pretendard;}\n'
(OUT/'browser/globals-bounded.css').write_bytes(css.encode('utf-8'))
(OUT/'browser/fixture-origin.json').write_bytes((json.dumps(dict(globalCSSSHA256=hashlib.sha256(raw).hexdigest(),
 onlyCSSAdaptation='Disable automatic repository scan; scan actual figure-editor sources only',
 sourceSpec=spec,sourceSVGSHA256=hashlib.sha256(svg.encode()).hexdigest(),sourceRepositoryWrites=0,dbWrites=0),indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(fixturePrepared=True,newAuthoredOrApprovedQuestions=0,dbWrites=0)))
