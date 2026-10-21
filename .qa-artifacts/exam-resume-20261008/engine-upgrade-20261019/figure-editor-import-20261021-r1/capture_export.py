"""Capture the authorized export read-only, then check/apply owned patch copies."""
from pathlib import Path
import datetime
import hashlib
import json
import shutil
import subprocess
import sys

SRC=Path('D:/math-figure-editor/docs/export/todays-math')
OUT=Path(__file__).resolve().parent
TARGET=OUT/'source-export'
assert not TARGET.exists()
files=[]
for p in sorted(SRC.rglob('*')):
    if not p.is_file(): continue
    raw=p.read_bytes();rel=p.relative_to(SRC)
    target=TARGET/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
    files.append(dict(path=rel.as_posix(),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
protected=['vendor/figure-engine/core/figure_scene.py','vendor/figure-engine/core/figure_solid.py',
           'src/lib/middle/m2Quad.ts','src/lib/middle/m2Pytha.ts']
before={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in protected}
receipt=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceRoot=str(SRC),
 sourceRepositoryWrites=0,sourceHead=subprocess.check_output(['git','-C',str(SRC.parents[2]),'rev-parse','HEAD'],text=True).strip(),
 sourceFiles=files,preservedFiles=before,patches=[])
for name in ['01-editor-grid-labels.patch','02-engine-grid.patch','03-engine-label-markup-escape.patch']:
    patch=TARGET/'patches'/name
    for check in [True,False]:
        cmd=['git','apply','--ignore-whitespace']+(['--check'] if check else [])+[str(patch)]
        r=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8')
        receipt['patches'].append(dict(name=name,checkOnly=check,exitcode=r.returncode,stdout=r.stdout,stderr=r.stderr))
        if r.returncode:
            (OUT/'apply-failure.json').write_bytes((json.dumps(receipt,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
            raise SystemExit(r.returncode)
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in before.items())
test=Path('src/__tests__/unit/figureGridLabels.test.ts')
assert not test.exists()
test.write_bytes((TARGET/'reference/figureGridLabels.test.ts').read_bytes())
receipt['protectedFilesUnchanged']=True
(OUT/'apply-receipt.json').write_bytes((json.dumps(receipt,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(capturedFiles=len(files),patchesApplied=3,protectedFilesUnchanged=True,externalWrites=0)))
