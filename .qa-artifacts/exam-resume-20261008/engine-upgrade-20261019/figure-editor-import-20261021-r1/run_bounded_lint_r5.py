from pathlib import Path
import ctypes,json,subprocess,sys
class M(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in
        ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
out=Path(__file__).resolve().parent
p=dict(availableGiB=m.availPhys/1024**3,minimumGiB=1.5,maxOldMiB=192,maxSemiMiB=8)
(out/'bounded-lint-memory-r5.json').write_bytes((json.dumps(p)+'\n').encode('utf-8'));print(json.dumps(p),flush=True)
if p['availableGiB']<1.5:raise SystemExit(75)
r=subprocess.run(['node','--max-old-space-size=192','--max-semi-space-size=8',str(out/'lint_changed_r5.mjs')],
 capture_output=True,text=True,encoding='utf-8',timeout=120)
(out/'bounded-lint-r5.log').write_bytes((r.stdout+r.stderr).encode('utf-8'))
print(r.stdout);print(r.stderr[-1000:]);raise SystemExit(r.returncode)
