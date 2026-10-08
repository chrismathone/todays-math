import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parent;REPO=R.parents[2]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
freeze=read(R/'review-freeze.json')
for f in freeze['files']:assert sha(R/f['path'])==f['rawSha256'],f['path']
for f in read(R/'evidence/preservation.json')['files']:assert sha(REPO/f['path'])==f['sha256'],f['path']
reports=[read(p) for p in (R/'reports').glob('q*.json')];assert len(reports)==24
for q in reports:
 assert set(q['checks'])==set(read(R/'evidence/bindings.json')['requiredChecks']);assert len(q['curriculumSurfaces'])==7
 assert all(s['status']=='passed' for s in q['curriculumSurfaces'].values());assert q['method']=='independent-solve-then-review';assert not q['gates']['loadable'] and not q['evidence']['q22RepairRead']
 if q['status']=='verified':assert all(q['checks'].values()) and not q['holds']
assert sorted(q['questionNumber'] for q in reports if q['status']=='verified')==[2,8]
q22=next(q for q in reports if q['questionNumber']==22);assert q22['status']=='pending' and not q22['checks']['choicesCorrect'];assert q22['evidence']['answerComparison']['semanticDuplicateChoices']==[[2,3]]
print('24 sealed reports/12checks/7surfaces;old743/raw solves/q22 original finding unchanged;load0.')
