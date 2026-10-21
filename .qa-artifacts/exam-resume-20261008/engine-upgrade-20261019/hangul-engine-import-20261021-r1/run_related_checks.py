"""One memory-bounded Vitest run; no shared dependency installation or DB."""
from pathlib import Path
import ctypes
import datetime
import json
import os
import subprocess
import sys

class MemoryStatus(ctypes.Structure):
    _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
        (n, ctypes.c_ulonglong) for n in ['totalPhys', 'availPhys', 'totalPageFile', 'availPageFile',
                                         'totalVirtual', 'availVirtual', 'availExtendedVirtual']]

OUT = Path(__file__).resolve().parent
mem = MemoryStatus()
mem.length = ctypes.sizeof(mem)
assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
available = mem.availPhys / 1024**3
print(json.dumps(dict(availableGiB=round(available, 3), requiredGiB=3)), flush=True)
if available < 3:
    print('SKIPPED before starting Node: memory floor not satisfied')
    sys.exit(75)
cmd = ['node', '--max-old-space-size=768', '--max-semi-space-size=8', 'node_modules/vitest/vitest.mjs',
       'run', '--config', str(OUT / 'vitest-related.mts'), '--maxWorkers=1', '--no-file-parallelism',
       '--reporter=json', '--outputFile=' + str(OUT / 'related-tests.json')]
env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONIOENCODING': 'utf-8',
       'NODE_OPTIONS': '--max-old-space-size=768 --max-semi-space-size=8'}
run = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding='utf-8', timeout=240)
(OUT / 'related-tests.log').write_bytes((run.stdout + run.stderr).encode('utf-8'))
print(json.dumps(dict(returncode=run.returncode, utc=datetime.datetime.now(datetime.timezone.utc).isoformat())))
if (OUT / 'related-tests.json').exists():
    data = json.loads((OUT / 'related-tests.json').read_text(encoding='utf-8'))
    print(json.dumps({k: data.get(k) for k in ['numTotalTestSuites', 'numPassedTests', 'numFailedTests', 'numPendingTests']}))
sys.exit(run.returncode)
