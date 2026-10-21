from pathlib import Path
import ctypes
import json
import subprocess
import sys

class MemoryStatus(ctypes.Structure):
    _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
        (n, ctypes.c_ulonglong) for n in ['totalPhys', 'availPhys', 'totalPageFile', 'availPageFile',
                                         'totalVirtual', 'availVirtual', 'availExtendedVirtual']]
OUT = Path(__file__).resolve().parent
if (OUT / 'bounded-native.log').exists() and not (OUT / 'bounded-native-preparation-failure-r1.log').exists():
    (OUT / 'bounded-native-preparation-failure-r1.log').write_bytes((OUT / 'bounded-native.log').read_bytes())
mem = MemoryStatus(); mem.length = ctypes.sizeof(mem)
assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
available = mem.availPhys / 1024**3
(OUT / 'bounded-memory-probe.json').write_bytes((json.dumps(dict(availableGiB=available, minimumGiB=1.5,
    maxOldMiB=192, maxSemiMiB=8, heavyVitestStarted=False)) + '\n').encode('utf-8'))
print(json.dumps(dict(availableGiB=round(available,3), minimumGiB=1.5)), flush=True)
if available < 1.5:
    sys.exit(75)
r = subprocess.run(['node','--max-old-space-size=192','--max-semi-space-size=8',str(OUT/'native-once.cjs')],
                   capture_output=True,text=True,encoding='utf-8',timeout=100)
(OUT/'bounded-native.log').write_bytes((r.stdout+r.stderr).encode('utf-8'))
print(r.stdout); print(r.stderr[-1000:]);sys.exit(r.returncode)
