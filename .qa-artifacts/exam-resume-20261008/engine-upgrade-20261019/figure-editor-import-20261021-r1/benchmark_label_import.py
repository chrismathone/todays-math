"""Isolated cold label-module initialization; not end-to-end generation timing."""
from pathlib import Path
import datetime
import hashlib
import json
import statistics
import subprocess
import sys

OUT=Path(__file__).resolve().parent
if len(sys.argv)>1:
    import time
    import types
    raw=Path(sys.argv[1]).read_bytes()
    module=types.ModuleType('qa_cold_label')
    sys.modules[module.__name__]=module
    start=time.perf_counter()
    exec(compile(raw,str(Path(sys.argv[1])),'exec'),module.__dict__)
    print(json.dumps(dict(seconds=time.perf_counter()-start,
        httpModules=[k for k in sys.modules if k=='http' or k.startswith('http.')],
        saxLoaded='xml.sax.saxutils' in sys.modules)))
    raise SystemExit()
before=subprocess.check_output(['git','show','c5f40ffb1:vendor/figure-engine/core/label_markup.py'])
after=Path('vendor/figure-engine/core/label_markup.py').read_bytes()
(OUT/'baseline-label-markup.py').write_bytes(before)
(OUT/'current-label-markup.py').write_bytes(after)
samples={'baseline':[],'current':[]}
for i in range(5):
    for name in (['baseline','current'] if i%2==0 else ['current','baseline']):
        r=subprocess.run([sys.executable,'-B',str(Path(__file__).resolve()),str(OUT/f'{name}-label-markup.py')],
            capture_output=True,text=True,encoding='utf-8',check=True,timeout=30)
        samples[name].append(json.loads(r.stdout))
report=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),method='Alternated cold subprocesses, same compile/exec timing scope after common harness imports; five per version',
 beforeSHA256=hashlib.sha256(before).hexdigest(),afterSHA256=hashlib.sha256(after).hexdigest(),samples=samples,
 medianSeconds={k:statistics.median(r['seconds'] for r in v) for k,v in samples.items()},
 endToEndOrAIModelLatencyMeasured=False,exporterTimingReproductionClaim=False,dbWrites=0,externalRepositoryWrites=0)
assert all(not r['saxLoaded'] and not r['httpModules'] for r in samples['current'])
(OUT/'label-initialization-benchmark.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps(report['medianSeconds']))
