"""Materialize delivered08 in an inert owned directory, without touching source or index."""
from pathlib import Path
import hashlib,json,re,subprocess
OUT=Path(__file__).resolve().parent
PATCH=OUT.parent/'assets41-sync-20261021-r1/source-export-4ccb0cb/patches/08-editor-all.patch'
text=PATCH.read_text(encoding='utf-8')
names=re.findall(r'^diff --git a/(.+) b/\1$',text,re.M)
assert len(names)==27
incoming=OUT/'incoming';rows=[]
for name in names:
    r=subprocess.run(['git','show','3aa03a021:'+name],capture_output=True)
    target=incoming/name
    if r.returncode==0:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(r.stdout)
    current=Path(name);exists=current.exists()
    if exists:
        before=OUT/'before'/name;before.parent.mkdir(parents=True,exist_ok=True);before.write_bytes(current.read_bytes())
    rows.append(dict(path=name,exists=exists,beforeSHA256=hashlib.sha256(current.read_bytes()).hexdigest() if exists else None))
prefix=incoming.relative_to(Path.cwd()).as_posix()
for check in [True,False]:
    cmd=['git','apply','--ignore-whitespace','--directory='+prefix]
    if check:cmd+=['--check']
    r=subprocess.run(cmd+[str(PATCH)],capture_output=True)
    assert r.returncode==0,(r.stdout+r.stderr).decode('utf-8')
for row in rows:
    path=incoming/row['path'];assert path.is_file();row['incomingSHA256']=hashlib.sha256(path.read_bytes()).hexdigest()
(OUT/'baseline.json').write_bytes((json.dumps(dict(sourceRevision='4ccb0cb',patchSHA256=hashlib.sha256(PATCH.read_bytes()).hexdigest(),files=rows,productionWrites=0,sourceWrites=0),indent=2)+'\n').encode('utf-8'))
print('Prepared27 delivered08 files; production and git index unchanged.')
