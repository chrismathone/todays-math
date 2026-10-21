from pathlib import Path
import datetime,hashlib,json,subprocess
OUT=Path(__file__).resolve().parent
names=['vendor/figure-engine/core/figure_svg.py','vendor/figure-engine/core/figure_scene.py',
       'src/lib/middle/m2Quad.ts','src/lib/examStudy/adapters.ts','scripts/figure/build_catalog.py',
       'scripts/figure/engine-catalog.json','src/__tests__/unit/middleM2QuadAngleFigure.test.ts',
       'scripts/figure/test_scene_assets.py']
rows=[]
assert not (OUT/'before-change.json').exists()
for name in names:
    p=Path(name);raw=p.read_bytes();target=OUT/'before'/name
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
    rows.append(dict(path=name,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw)))
(OUT/'before-change.json').write_bytes((json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),files=rows,
    engine8FixtureRevision='4ccb0cb',sourceWrites=0,DBWrites=0),indent=2)+'\n').encode('utf-8'))
print('Snapshotted8 owned implementation/test files before any M28 production mutation.')
