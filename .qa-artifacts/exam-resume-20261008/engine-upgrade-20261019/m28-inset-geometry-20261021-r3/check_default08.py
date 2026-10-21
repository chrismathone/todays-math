"""Replay unique default08 shapes through pinned old and actual current engines."""
from pathlib import Path
import hashlib,json,os,subprocess,sys
OUT=Path(__file__).resolve().parent;REV='b432105893bcd91288cc3afa2453a220be15d765'
assert not (OUT/'default08-native-comparison.json').exists()
target=OUT/'legacy-engine/core';target.mkdir(parents=True,exist_ok=True)
bindings={}
for p in Path('vendor/figure-engine/core').glob('*.py'):
    raw=subprocess.check_output(['git','show',REV+':'+p.as_posix()])
    (target/p.name).write_bytes(raw);bindings[p.name]=hashlib.sha256(raw).hexdigest()
baseline=json.loads(Path('src/__tests__/fixtures/m2Quad-before-inset-20261021.json').read_text(encoding='utf-8'))
specs={json.dumps(row['output']['figureSpec'],sort_keys=True):row['output']['figureSpec'] for row in baseline['old08']}
values=list(specs.values())
program='''import sys,json
sys.path.insert(0,sys.argv[1])
from core.figure_scene import render_figure_spec
from core.figure_quality import sanitize_svg
print(json.dumps([sanitize_svg(render_figure_spec(s)) for s in json.load(sys.stdin)],ensure_ascii=False))
'''
results=[]
for label,folder in [('old',target.parent),('current',Path('vendor/figure-engine'))]:
    r=subprocess.run([sys.executable,'-B','-c',program,str(folder.resolve())],input=json.dumps(values).encode('utf-8'),
        capture_output=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},timeout=60)
    assert r.returncode==0,r.stderr.decode('utf-8')
    svg=json.loads(r.stdout);results.append(svg)
    for i,text in enumerate(svg):(OUT/(f'default08-{label}-{i}.svg')).write_bytes(text.encode('utf-8'))
same=[a.encode('utf-8')==b.encode('utf-8') for a,b in zip(*results)]
report=dict(pinnedEngineCommit=REV,oldCoreSHA256=bindings,baselineAPICases=32,uniqueSpecs=len(values),
    actualOldNativeCalls=len(values),actualCurrentNativeCalls=len(values),rawByteMatches=sum(same),
    exactAll=all(same),DBWrites=0,sourceRepositoryWrites=0)
(OUT/'default08-native-comparison.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(APICases=32,uniqueDefault08Shapes=len(values),rawByteMatches=sum(same))))
assert all(same)
