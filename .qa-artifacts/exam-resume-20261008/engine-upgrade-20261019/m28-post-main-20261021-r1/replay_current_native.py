"""Low-memory current-renderer replay after unrelated main integration.

The captured API is not called again: require identical 104-module closure,
recheck its 532 printed tasks, and actually compile/sanitize 64 current SVGs.
"""
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import subprocess

B=Path('.qa-artifacts/exam-resume-20261008')
E=B/'engine-upgrade-20261019'
OUT=Path(__file__).resolve().parent
I=B/'m28-current-api-audit-20261021-r1'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def git(*a): return subprocess.check_output(['git',*a],text=True).strip()
data=read(I/'own-actual-outputs.json')
before={p:sha(p) for p in data['moduleHashesAtFirstImport']}
assert before==data['moduleHashesAtFirstImport']
pybefore=read(I/'own-python-first-import-hashes.json')['beforeFirstImport']
assert all(sha(p)==h for p,h in pybefore.items())
spec=importlib.util.spec_from_file_location('m28_independent_checker',I/'own-check-v2.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
prior=read(I/'own-calculations.json')['specToNativeSVG']
cache={}
for row in data['rows']:
    assert hashlib.sha256(row['serializedOutput'].encode()).hexdigest()==row['outputSHA256']
    m.math_check(row)
    digest=hashlib.sha256(json.dumps(row['figureSpec'],sort_keys=True,separators=(',',':')).encode()).hexdigest()
    if digest not in cache:
        svg,checked=m.svg_check(row['figureSpec'])
        assert checked['svgSHA256']==prior[digest]['svgSHA256']
        cache[digest]=checked
assert len(data['rows'])==532 and len(cache)==64
assert all(sha(p)==h for p,h in before.items()) and all(sha(p)==h for p,h in pybefore.items())
head,main=git('rev-parse','HEAD'),git('rev-parse','origin/main')
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
old=read(E/'m28-figure-preview-20261021-r2/checkpoint-validation.json')
assert all(sha(r['path'])==r['sha256'] for r in old['code'])
v={**old,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':head,'main':main,
   'currentMainRelatedPassed':64,'currentMainRelatedFailed':0,
   'currentMainRelatedScope':'Actually recompiled/sanitized 64 native SVGs after main; 532 captured printed tasks rechecked with exact identical104Node/5Python source closure. No fresh API calls.',
   'previousPublicVitest139BeforeLatestUnrelatedMain':old['parentRelated'],
   'latestMainVitest':'Not run: 3GiB preflight floor not met. Incoming SRS unit was included in prepared config but never executed.',
   'codeClosureUnchanged':True,'nativeOutputByteEquality':True,'currentNative':cache,
   'strictArcPrecisionStillHeld':True,'freshAPICalls':0,'newNativeAuthoredOrApprovedFigures':0,
   'dbWrites':0}
target=OUT/'checkpoint-validation.json'
assert not target.exists()
target.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(currentNativeReplays=64,capturedPrintedTaskRechecks=532,unchangedSourceClosure=True,freshAPICalls=0,dbWrites=0)))
