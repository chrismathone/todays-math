"""Seal owned post-exposure reviews; original evidence is read-only."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,datetime,subprocess,shutil
R=Path(__file__).resolve().parent;REPO=R.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def put(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
assert not (R/'review-freeze.json').exists(),'Seal once; later use validate.py.'
P=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
for src,name in [(Path('D:/todays-math/AGENTS.md'),'AGENTS.md'),(P/'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-6.md','addendum-6.md'),(REPO/'src/lib/math/katexRender.ts','katexRender.ts.txt')]:
 dest=R/'evidence/instructions'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);assert sha(src)==sha(dest)
put(R/'evidence/judgment-design.json',{'projectSkill':'evidence/repository/.agents/skills/typesafe-ai/SKILL.md','liveDocsRead':['https://docs.typesafe.ai/llms.txt','https://docs.typesafe.ai/confidence','https://docs.typesafe.ai/cookbooks/hierarchical_classification','https://docs.typesafe.ai/concepts/how-to-build-with-system-one'],'readDate':'2026-10-08','application':'Narrow check dimensions and explicit no-match. Code owns exact arithmetic/bindings/control flow. Confidence is not mathematical truth or grade/rights permission. Snapshot labels remain timestamped. No model calls or AI probability approval.','modelCalls':0,'snapshotTimestamp':'2026-10-08 13:00:16.891043+00','scope':'22 units/302 live families/82 protected locks, zero identity/correction mismatches and writes; limited frozen parent read, not current DB assertion','renderObservation':'q22 Korean units rendered correctly at70mm. Local strict:error experiment raised unicodeTextInMathMode; actual project UI_KATEX_OPTIONS strict:false. No student math hold from this warning.'})
reports=[read(p) for p in sorted((R/'reports').glob('q*.json'))];assert len(reports)==7
for p in read(R/'evidence/preservation-before-main.json')['files']:assert sha(REPO/p['path'])==p['sha256'],p['path']
files=[{'path':p.relative_to(R).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(R.rglob('*')) if p.is_file() and p.name!='review-freeze.json']
put(R/'review-freeze.json',{'schemaVersion':1,'sealedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'independent-solve-then-review','verifierId':'orca-codex-exam-twin-author-geometry-20261008','preExposureSolveCommit':'cd14f37024e3eb872ddfe9a685db7b4da78f98a0','counts':{'reviewed':7,'mathematicsAndSevenStudentSurfacesPassed':7,'verified':0,'pending':7,'rejected':0,'familyAssignments':0,'rightsCleared':0,'nativeApproved':0,'loadable':0},'rawSolvesAndOld680Unchanged':True,'files':files,'bindings':read(R/'evidence/bindings.json')['rows']})
print('Sealed7 owned post-exposure reviews; math7/pass, classification7/held; zero loadable.')
