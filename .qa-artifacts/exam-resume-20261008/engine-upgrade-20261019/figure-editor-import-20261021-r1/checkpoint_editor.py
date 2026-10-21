"""Create additive r54; preserve historical ledgers and replace only the pointer."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008')
out=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
binding=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
old=B/'engine-upgrades-progress-r53.json';new=B/'engine-upgrades-progress-r54.json'
assert not new.exists()
d=json.loads(old.read_text(encoding='utf-8'));d=copy.deepcopy(d)
d.update(kind='exam-engine-upgrades-progress/v54',version=54,createdAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
 previous=binding(old),report='docs/planning/tracks/reports/exam-engine-figure-editor-import-20261021.md')
ts=json.loads((out/'typescript-root-files.json').read_text(encoding='utf-8'))
paths=list(dict.fromkeys([r['path'] for r in d['code']]+ts+['scripts/figure/graph_scene.py','scripts/figure/engine-catalog.json',
 'scripts/figure/test_grid.py','vendor/figure-engine/core/figure_quality.py','vendor/figure-engine/core/label_markup.py']))
d['code']=[binding(p) for p in paths]
h=out.parent/'hangul-engine-import-20261021-r1'
d['figureEditorImport']=dict(status='IMPLEMENTED_BOUNDED_TECHNICAL_CHECKS_MAIN_INTEGRATION_RECHECK_PENDING',
 source=binding(out/'apply-receipt.json'),frontend=binding(h/'editor-frontend-r4-tests.json'),frontendFiles=9,frontendPassed=90,
 priorEngine=binding(h/'editor-engine-tests.json'),priorEnginePassed=109,priorEngineIsNotFreshPostMain=True,
 scopedTypes=binding(out/'types-next-ambient-r5.json'),scopedTypeRoots=20,rootTypeErrors=0,
 changedLint=binding(out/'eslint-r5-bounded.json'),changedLintFiles=5,unchangedPriorLintFiles=15,
 browser=binding(out/'browser/browser-results-r3.json'),browserViewportsPassed=8,
 independentR4=binding(B/'figure-editor-import-audit-20261021-r4/own-report.json'),independentR4DOMChecks=86,
 noAutoSnap=True,noUncertaintyToPassed=True,finalComparisonRetained=True,wholeWorkspaceOrPrintCertified=False,
 existingQuestionChanges=0,newAuthoredOrApprovedQuestions=0,dbWrites=0)
d['nextAuthorizedWork']=dict(instruction='Latest owner requires 06-engine-all.patch engine integration and exact six-case comparison; then bounded grid measurement support and remaining engine cards',
 entrypoint='D:/math-figure-editor/docs/export/todays-math/README.md',sourceRepositoryReadOnly=True,
 patch='patches/06-engine-all.patch',sixCaseByteEqualityNotYetClaimed=True,preserveExistingVerificationAndAheadScene=True,
 preserveDraftFigureReviewContract=True,noUncertaintyToPass=True,operationalDBOrDeploymentAuthorized=False)
new.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
index=B/'continuation-index.json';raw=index.read_bytes()
prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],d['createdAt']),(prior['progress'],str(new).replace('\\','/')),(prior['sha256'],sha(new))]:
 oldbytes=a.encode('utf-8');assert raw.count(oldbytes)==1,(a,raw.count(oldbytes));raw=raw.replace(oldbytes,z.encode('utf-8'),1)
index.write_bytes(raw)
assert json.loads(raw)['latestEngineCheckpoint']['sha256']==sha(new)
print(json.dumps(dict(progress=str(new),codeFiles=len(paths),manualLedgerChanged=False,dbWrites=0)))
