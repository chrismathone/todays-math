"""Private one-page browser check with reduced Node heap; never kill another session."""
from pathlib import Path
import ctypes,json,subprocess,sys
class M(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in
        ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
out=Path(__file__).resolve().parent
revision=sys.argv[1]
p=dict(availableGiB=m.availPhys/1024**3,minimumGiB=2.5,maxOldMiB=384,maxSemiMiB=8,oneBrowserPage=True)
(out/('browser-memory-'+revision+'.json')).write_bytes((json.dumps(p)+'\n').encode('utf-8'))
print(json.dumps(p),flush=True)
if p['availableGiB']<2.5:raise SystemExit(75)
r=subprocess.run(['node','--max-old-space-size=384','--max-semi-space-size=8',str(out/'browser/verify.mjs'),revision],
 capture_output=True,text=True,encoding='utf-8',timeout=180)
(out/('browser-'+revision+'.log')).write_bytes((r.stdout+r.stderr).encode('utf-8'))
print(r.stdout[-3500:]);print(r.stderr[-1000:]);raise SystemExit(r.returncode)
