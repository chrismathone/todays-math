"""One related suite, one worker, reduced 384 MiB Node heap, private cache."""
from pathlib import Path
import ctypes,datetime,hashlib,json,os,subprocess,sys
class M(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in
        ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
out=Path(__file__).resolve().parent
h=out.parent/'hangul-engine-import-20261021-r1'
label=sys.argv[1]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
memory=dict(availableGiB=m.availPhys/1024**3,minimumGiB=2,maxOldMiB=384,maxSemiMiB=8,oneWorker=True)
print(json.dumps(memory),flush=True)
if memory['availableGiB']<2:raise SystemExit(75)
files=json.loads((out/'typescript-root-files.json').read_text(encoding='utf-8'))
before={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files}
cmd=['node','--max-old-space-size=384','--max-semi-space-size=8','node_modules/vitest/vitest.mjs','run',
 '--config',str(h/('vitest-'+label+'.mts')),'--maxWorkers=1','--no-file-parallelism',
 '--reporter=json','--outputFile='+str(h/(label+'-tests.json'))]
r=subprocess.run(cmd,env={**os.environ,'NODE_OPTIONS':'--max-old-space-size=384 --max-semi-space-size=8',
 'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},capture_output=True,text=True,encoding='utf-8',timeout=240)
(h/(label+'-tests.log')).write_bytes((r.stdout+r.stderr).encode('utf-8'))
same=before=={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files}
record=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),memory=memory,sourceSHA256=before,
 sourcesUnchanged=same,exitcode=r.returncode,dbWrites=0)
(out/(label+'-execution.json')).write_bytes((json.dumps(record,indent=2)+'\n').encode('utf-8'))
p=h/(label+'-tests.json')
if p.exists():
 data=json.loads(p.read_text(encoding='utf-8'));print(json.dumps({k:data.get(k) for k in ['numPassedTestSuites','numPassedTests','numFailedTests']}))
assert same
raise SystemExit(r.returncode)
