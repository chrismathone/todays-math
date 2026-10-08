import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parent;REPO=R.parents[2]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
freeze=read(R/'review-freeze.json')
for f in freeze['files']:assert sha(R/f['path'])==f['sha256'],f['path']
for f in read(R/'evidence/preservation-before-main.json')['files']:assert sha(REPO/f['path'])==f['sha256'],f['path']
for p in (R/'reports').glob('q*.json'):
 q=read(p);assert set(q['checks'])==set(read(R/'evidence/bindings.json')['requiredChecks']);assert len(q['curriculumSurfaces'])==7
 assert q['status']=='pending' and not q['checks']['unitFamilyFit'];assert q['method']=='independent-solve-then-review';assert not q['gates']['loadable']
print('Review sealed bytes,12 checks,7 surfaces,680 old files validated.')
