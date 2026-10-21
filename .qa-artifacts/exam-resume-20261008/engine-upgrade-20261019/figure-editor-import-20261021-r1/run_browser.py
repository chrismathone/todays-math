from pathlib import Path
import ctypes,json,subprocess,sys
class M(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in
        ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
out=Path(__file__).resolve().parent
p=dict(availableGiB=m.availPhys/1024**3,minimumGiB=3,maxOldMiB=768,maxSemiMiB=8,oneBrowserPage=True)
(out/'browser-memory.json').write_bytes((json.dumps(p)+'\n').encode('utf-8'));print(json.dumps(p),flush=True)
if p['availableGiB']<3:raise SystemExit(75)
revision=sys.argv[1] if len(sys.argv)>1 else 'r1'
r=subprocess.run(['node','--max-old-space-size=768','--max-semi-space-size=8',str(out/'browser/verify.mjs'),revision],
 capture_output=True,text=True,encoding='utf-8',timeout=180)
(out/('browser.log' if revision=='r1' else 'browser-'+revision+'.log')).write_bytes((r.stdout+r.stderr).encode('utf-8'))
print(r.stdout[-3500:]);print(r.stderr[-1000:]);raise SystemExit(r.returncode)
