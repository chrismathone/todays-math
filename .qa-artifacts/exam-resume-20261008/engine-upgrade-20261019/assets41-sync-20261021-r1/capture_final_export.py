from pathlib import Path
import hashlib,json,subprocess
OUT=Path(__file__).resolve().parent
SOURCE=Path('D:/math-figure-editor')
COMMIT='cc0895f'
names=['README.md','patches/07-engine-all.patch','patches/08-editor-all.patch','engine-check/check_engine.py']
names += ['engine-check/expected/'+n+'.json' for n in ['grid','assets','assets-3d','perspective','units','right-refused','solid-object-refused']]
rows=[]
for name in names:
    data=subprocess.check_output(['git','-C',str(SOURCE),'show',COMMIT+':docs/export/todays-math/'+name])
    target=OUT/'source-export-cc0895f'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    rows.append(dict(path=name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
# Data-only old stock SVG fixtures, independent of the matcher or its registry.
fixture={p.stem:p.read_text(encoding='utf-8') for p in sorted((OUT/'before/scripts/figure/assets').glob('*.svg'))}
assert len(fixture)==39
target=Path('src/__tests__/fixtures/figure-assets-legacy-20261021.json');target.parent.mkdir(parents=True,exist_ok=True)
target.write_bytes((json.dumps(dict(sourceRootCommit='29f769985afd2f3c9d6b5fb0e3d4381eaffd5ade',assets=fixture),ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
(OUT/'final-export-manifest.json').write_bytes((json.dumps(dict(sourceCommit=subprocess.check_output(['git','-C',str(SOURCE),'rev-parse',COMMIT],text=True).strip(),files=rows,sourceWrites=0),indent=2)+'\n').encode('utf-8'))
print('Captured final07/08 and seven expected outputs from cc0895f; old39 fixture retained separately.')
