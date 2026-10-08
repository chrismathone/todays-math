import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,datetime,subprocess,shutil
R=Path(__file__).resolve().parent;REPO=R.parents[2];P=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def put(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
assert not (R/'review-freeze.json').exists(),'Seal once;validate subsequently'
for src,name in [(Path('D:/todays-math/AGENTS.md'),'AGENTS.md'),(P/'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-6.md','addendum-6.md')]:
 dest=R/'evidence/instructions'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);assert sha(src)==sha(dest)
put(R/'evidence/judgment-design.json',{'projectSkill':'evidence/repository/.agents/skills/typesafe-ai/SKILL.md','liveDocsRead':['https://docs.typesafe.ai/llms.txt','https://docs.typesafe.ai/confidence','https://docs.typesafe.ai/cookbooks/hierarchical_classification','https://docs.typesafe.ai/concepts/how-to-build-with-system-one'],'readDate':'2026-10-08','method':'Narrow12checks/7surfaces. Deterministic exact calculations/bindings in code. Explicit no-match. Confidence/registry/school not truth or grade permission. No model/API calls.','bankCapturedAt':'2026-10-08 13:00:16.891043+00','snapshotOnly':True,'notWholePolicyAudit':True,'localReviewRuntimeCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(),'reviewedOriginalR1Only':True,'q22RepairRead':False})
for f in read(R/'evidence/preservation.json')['files']:assert sha(REPO/f['path'])==f['sha256'],f['path']
results=read(R/'evidence/review-results.json');assert results['verified']==2 and results['pending']==22 and results['rejected']==0
files=[{'path':p.relative_to(R).as_posix(),'rawSha256':sha(p),'bytes':p.stat().st_size} for p in sorted(R.rglob('*')) if p.is_file() and p.name!='review-freeze.json']
put(R/'review-freeze.json',{'schemaVersion':1,'sealedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'independent-solve-then-review','verifierId':'orca-codex-exam-twin-author-geometry-20261008','preExposureSolveCommit':'c8f8aeadfb28becb1d7447240fd4e28b6702fc4c','parentVerificationManifestRawSha256':sha(R/'evidence/verification/verification-manifest.json'),'counts':{k:results[k] for k in ['reviewed','mathematicalAnswersAndNewSolutionsPassed','sevenStudentSurfacesGradePassed','choiceQualityPassed','choiceQualityHeld','verified','pending','rejected','supportedFamilyProposals','semanticFamilyWithDifficultyHold','points','rightsCleared','nativeApproved','loadable']},'allOriginalRawSolvesAndOld743Unchanged':True,'q22DuplicateFindingUnchanged':True,'rootQ22RepairRead':False,'files':files,'bindings':read(R/'evidence/bindings.json')['rows']})
print('Sealed24 originalr1 reviews;2 dimensional verified,22 pending,0 rejected/rights/native/load;old743 unchanged.')
