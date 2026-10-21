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
files = ['src/lib/middle/m2Pytha.ts', 'src/lib/examStudy/adapters.ts', 'src/__tests__/unit/middleM2PythaGivenFigure.test.ts']
cmds = [('types', 3, ['node', '--max-old-space-size=1024', '--max-semi-space-size=8', str(OUT / 'check_types.mjs')]),
        ('eslint', 1.5, ['node', '--max-old-space-size=384', '--max-semi-space-size=8',
                         'node_modules/eslint/bin/eslint.js', '--format', 'json', '--output-file',
                         str(OUT / 'eslint.json'), *files])]
results = []
for name, floor, cmd in cmds:
    mem = MemoryStatus(); mem.length = ctypes.sizeof(mem)
    assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
    available = mem.availPhys / 1024**3
    print(json.dumps(dict(check=name, availableGiB=round(available, 3), minimumGiB=floor)), flush=True)
    if available < floor:
        sys.exit(75)
    run = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=180)
    (OUT / (name + '.log')).write_bytes((run.stdout + run.stderr).encode('utf-8'))
    results.append(dict(name=name, returncode=run.returncode))
(OUT / 'static-checks.json').write_bytes((json.dumps(results, indent=2) + '\n').encode('utf-8'))
print(json.dumps(results))
sys.exit(any(r['returncode'] for r in results))
