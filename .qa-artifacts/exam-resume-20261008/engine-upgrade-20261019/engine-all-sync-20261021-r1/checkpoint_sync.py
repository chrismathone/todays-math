"""Bind current merge, independent controls and unchanged authored ledger; create r56."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');out=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
old=B/'engine-upgrades-progress-r55.json';new=B/'engine-upgrades-progress-r56.json'
assert not new.exists()
d=copy.deepcopy(json.loads(old.read_text(encoding='utf-8')))
incoming=json.loads((out/'baseline.json').read_text(encoding='utf-8'))
paths=list(dict.fromkeys([r['path'] for r in d['code']]+[r['path'] for r in incoming['targets']]+['scripts/figure/test_scene_assets.py']))
code=[bind(p) for p in paths]
ind=B/'figure-engine-all-runtime-audit-20261021-r2/own-report.json'
audit=json.loads(ind.read_text(encoding='utf-8'));assert audit['counts']['passed']==139 and audit['counts']['failed']==0
for p,digest in json.loads((ind.parent/'own-final-after.json').read_text(encoding='utf-8')).items():assert sha(p)==digest,p
six=json.loads((out/'bytes-and-assets-r1.json').read_text(encoding='utf-8'))
assert six['exactByteMatches']==6 and six['actualRasterizations']==39
r=json.loads((out/'python-regressions-r2.json').read_text(encoding='utf-8'))
assert all(row['exitcode']==0 for row in r['runs']) and sum(row['unittestCount'] or 0 for row in r['runs'])==135
unit=json.loads((out/'scene-assets-green-r2.json').read_text(encoding='utf-8'));assert unit['exitcode']==0 and unit['unittestCount']==9
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
validation=dict(utc=now,head=head,main=main,currentMainRelatedPassed=144,currentMainRelatedFailed=0,code=code,
 rawByteMatches=6,actualAssetRasters=39,independentCurrentRuntime=bind(ind),independent139NotAddedToParent144=True,
 preservedMainAndOtherAuthorChanges=True,existingQuestionOrDBWrites=0)
v=out/'push-validation-r1.json';v.write_bytes((json.dumps(validation,indent=2)+'\n').encode('utf-8'))
d.update(kind='exam-engine-upgrades-progress/v56',version=56,createdAt=now,previous=bind(old),
 report='docs/planning/tracks/reports/exam-engine-all-sync-20261021.md',code=code)
d['figureEngineAllSync']=dict(status='IMPLEMENTED_SIX_RAW_OUTPUTS_IDENTICAL_BOUNDED_REGRESSIONS_PASS',source=bind(out/'baseline.json'),
 incomingFileCount=52,appliedWithThreeWay=True,qualityGridAndAssetMergePreserved=True,clearAngleLabelsPreserved=True,
 nullAssetsCounterexampleRejected=True,parentPythonUnittests=144,independentRuntimeControls=139,
 independent=bind(ind),six=bind(out/'bytes-and-assets-r1.json'),sixExactBytes=6,assetRasters=39,
 assetsRights='UNKNOWN_SEPARATE_REVIEW',newQuestionApproval=0,existingQuestionChanges=0,dbWrites=0,
 wholeEngineInputUniversalityClaim=False,srcAssetEditorAndPromptIntegrationNotYetClaimed=True,pushValidation=bind(v))
d['nextAuthorizedWork']=dict(instruction='Complete asset-aware editor and prompt integration from src parts of patch05; bounded grid advisory measurement; continue open engine cards',
 sourceRepositoryReadOnly=True,noAutoSnap=True,noUncertaintyToPass=True,finalFigureReviewRetained=True,
 strictGradeAndCurriculumGateBeforeAnyQuestionApproval=True,operationalDBOrDeploymentAuthorized=False)
new.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],str(new).replace('\\','/')),(prior['sha256'],sha(new))]:
 assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundFiles=len(code),parentUnittests=144,independentControls=139,byteMatches=6,dbWrites=0)))
