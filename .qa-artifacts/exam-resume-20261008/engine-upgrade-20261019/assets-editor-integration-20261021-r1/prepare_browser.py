"""Actual Root editor, technical vector/grid/stock fixture; no source exam or API."""
from pathlib import Path
import hashlib,json,sys
out=Path(__file__).resolve().parent;root=Path.cwd();browser=out/'browser';browser.mkdir(exist_ok=True)
prior=out.parent/'figure-editor-import-20261021-r1/browser'
for name in ['index.html','fixture.tsx','globals-bounded.css']:(browser/name).write_bytes((prior/name).read_bytes())
sys.path.insert(0,str(root/'scripts/figure'))
from render_spec import render_json
spec=dict(version='graph-1',xRange=[0,8],yRange=[0,5],axes=False,grid=dict(step=1),
 segments=[{'from':[1,1],'to':[4,4],'arrow':True},{'from':[5,4],'to':[7,1],'arrow':True}],
 labels=[dict(at=[2.5,2.5],text='$\\vec{AB}$',dx=-18),dict(at=[6,2.5],text='$\\vec{a}$',dx=18),dict(at=[4,.5],text='30 m')],
 assets=[dict(asset='house',at=[6,.5],width=.75)])
result=render_json(json.dumps(spec));assert 'svg' in result,result
(browser/'fixture-source.json').write_bytes((json.dumps(dict(svg=result['svg'],technicalCalibrationOnly=True,newAuthoredQuestions=0),ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
(browser/'fixture-origin.json').write_bytes((json.dumps(dict(sourceSpec=spec,sourceSVG_SHA256=hashlib.sha256(result['svg'].encode()).hexdigest(),
 sourceRepositoryWrites=0,dbWrites=0,originalExamUsed=False),indent=2)+'\n').encode('utf-8'))
wrapper=(out.parent/'figure-editor-import-20261021-r1/run_browser_bounded.py').read_bytes()
(out/'run_browser_bounded.py').write_bytes(wrapper)
print('Prepared actual editor asset action fixture')
