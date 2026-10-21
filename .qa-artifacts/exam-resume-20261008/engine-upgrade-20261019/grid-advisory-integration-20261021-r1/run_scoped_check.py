"""One bounded scoped check, with source hashes and no shared cache writes."""
from pathlib import Path
import ctypes
import datetime
import hashlib
import json
import re
import subprocess
import sys

OUT=Path(__file__).resolve().parent
kind=sys.argv[1]
assert kind in {'types','eslint'}
revision='-'+sys.argv[2] if len(sys.argv)>2 else ''
label=kind+revision
class Memory(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in
        ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
m=Memory();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
print(json.dumps(dict(availableGiB=m.availPhys/1024**3,minimumGiB=2.5)),flush=True)
if m.availPhys<2.5*1024**3:raise SystemExit(75)
paths=OUT/'typescript-root-files.json'
if not paths.exists():
    raw=subprocess.check_output(['git','diff','--name-only','--diff-filter=AM'],text=True).splitlines()
    raw+=subprocess.check_output(['git','ls-files','--others','--exclude-standard','src'],text=True).splitlines()
    files=sorted(set(p for p in raw if p.endswith(('.ts','.tsx'))))
    assert len(files)==12 and 'src/lib/figure/assetCatalog.ts' in files
    paths.write_bytes((json.dumps(files,indent=2)+'\n').encode('utf-8'))
files=json.loads(paths.read_text(encoding='utf-8'))
before={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files}
if kind=='types':
    args=[str(OUT/'check_types.mjs')]
else:
    args=['node_modules/eslint/bin/eslint.js',*files,'--format','json']
r=subprocess.run(['node','--max-old-space-size=512','--max-semi-space-size=8',*args],
    capture_output=True,text=True,encoding='utf-8',timeout=180)
(OUT/(label+'.log')).write_bytes((r.stdout+r.stderr).encode('utf-8'))
if kind=='eslint':
    (OUT/(label+'.json')).write_bytes(r.stdout.encode('utf-8'))
assert before=={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files}
record=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),kind=kind,exitcode=r.returncode,
    sourceSHA256=before,sourcesUnchanged=True,dbWrites=0)
(OUT/(label+'-execution.json')).write_bytes((json.dumps(record,indent=2)+'\n').encode('utf-8'))
print(r.stdout if kind=='types' else json.dumps(dict(files=len(files),exitcode=r.returncode)))
if r.stderr:print(r.stderr[-1200:])
raise SystemExit(r.returncode)
