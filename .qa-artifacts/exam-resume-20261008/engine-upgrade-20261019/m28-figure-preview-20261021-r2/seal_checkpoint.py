"""Seal current M28 checks, keeping precision/grade holds and counts distinct."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
E = B / 'engine-upgrade-20261019'
OUT = Path(__file__).resolve().parent
H = E / 'hangul-engine-import-20261021-r1'
def read(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def ref(p):
    p = Path(p)
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())
def write(p, x): Path(p).write_bytes((json.dumps(x, ensure_ascii=False, indent=2)+'\n').encode('utf-8'))
def git(*args): return subprocess.check_output(['git',*args],text=True).strip()

old, new = B/'engine-upgrades-progress-r52.json', B/'engine-upgrades-progress-r53.json'
assert not new.exists()
p=read(old)
green=read(H/'m28-green-tests.json')
assert green['success'] and green['numPassedTests']==139 and green['numFailedTests']==0
types=read(OUT/'types.json')
assert types['rootErrors']==0 and not types['globalDiagnostics'] and not types['projectConfigurationDiagnostics']
assert all(ref(r['path'])['sha256']==r['sha256'] for r in types['rootFiles'])
lint=read(OUT/'eslint.json')
assert len(lint)==3 and all(r['errorCount']==r['warningCount']==0 for r in lint)
indpath=B/'m28-current-api-audit-20261021-r1/own-report.json'
ind=read(indpath)
assert ind['actualAPICalls']==532 and ind['math']['all532Passed'] and ind['bindings']['rootBeforeAfterUnchanged']
assert ref('src/lib/middle/m2Quad.ts')['sha256']==ind['bindings']['m2QuadRawSHA256']==read(OUT/'candidate.json')['candidateSHA256']
matrix=read(OUT/'matrix-native-results.json')
assert matrix['fullParameterCases']==432 and matrix['unchanged08Cases']==32 and len(matrix['native'])==64
assert all(r['ok'] for r in matrix['native'])
vec=read(OUT/'vector-containment-results.json')
assert vec['actualSVGsChecked']==64 and vec['actualAngleArcsChecked']==128
paths=list(dict.fromkeys([r['path'] for r in p['code']]+[
 'src/lib/middle/m2Quad.ts','src/__tests__/unit/middleM2QuadAngleFigure.test.ts']))
code=[ref(path) for path in paths]
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
head,main=git('rev-parse','HEAD'),git('rev-parse','origin/main')
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
v=dict(utc=now,head=head,main=main,currentMainRelatedPassed=139,currentMainRelatedFailed=0,
 code=code,parentRelated=ref(H/'m28-green-tests.json'),parentFiles=4,
 scopedTypes=ref(OUT/'types.json'),eslint=ref(OUT/'eslint.json'),
 independent=ref(indpath),independentAPICalls=532,independentDistinctTasks=432,independentNativeSVGs=64,
 matrix=ref(OUT/'matrix-native-results.json'),tolerantVectorContainment=ref(OUT/'vector-containment-results.json'),
 strictSerializedArcPrecisionHold=ind['actualNativeSVG']['strictEntireArcCenterlineContained'],
 gradeRightsOrReleaseApproval=False,existingQuestionOrDBWrites=0,
 unrelatedIncomingPythonTest='Not run successfully: optional rapidfuzz missing; retained incoming code without altering its audit scope')
write(OUT/'checkpoint-validation.json',v)
item=dict(id='U70',area='M28 printed angle-bound parallelogram with all original givens',
 status='implemented-bounded-math-native-regression-pass-strict-arc-precision-held',
 code=[ref(x) for x in ['src/lib/middle/m2Quad.ts','src/lib/examStudy/adapters.ts','src/__tests__/unit/middleM2QuadAngleFigure.test.ts']],
 validation=ref(OUT/'checkpoint-validation.json'),independent=ref(indpath),
 rejectedR1=ref(OUT.parent/'m28-figure-preview-20261021-r1/native-once-results.json'),
 preserved08Cases=32,parentFiniteTuples=432,independentAPICalls=532,independentNativeSVGs=64,
 strictSerializedArcPrecisionHold=ind['finding'],newAuthoredOrBlindQuestionCount=0,
 officialGradeRightsContentOrLoadableApproval=False,existingQuestionOrDBWrites=0)
p.update(kind='exam-engine-upgrades-progress/v53',version=53,createdAt=now,previous=ref(old),code=code,
 report='docs/planning/tracks/reports/exam-engine-m28-20261021.md',
 checkpointDelta='U70 fixes M28 condition/geometry mismatch and opposite-side arc crossing;139 related tests,532 independentAPI/64SVG. Tiny incident-side serialization overshoot remains HOLD, not waived.',
 currentMainRuntimeValidation=v,wholeEngineComplete=False,wholeExtractionComplete=False,
 nextAuthorizedWork=dict(instruction='Import math-figure-editor first and second package with fit filtering after M28 checkpoint',
  entrypoint='D:/math-figure-editor/docs/export/todays-math/README.md',sourceRepositoryReadOnly=True,
  preserveDraftFigureReviewContract=True,noUncertaintyToPass=True,operationalDBOrDeploymentAuthorized=False),
 dbWrites=0,operationalLoads=0,deployed=False)
p['items'].append(item)
p['validations']['U70Bounded']=v
p['pendingM38']=dict(historyPreviousProgress=ref(old),scopedCodeFixes=p['pendingM38']['scopedCodeFixes']+['M28-condition-and-opposite-side-containment'],
 activeNext=['M28-strict-serialized-arc-precision','remaining-original-cards'],otherOriginalCardsRemainOpen=True,wholeM38Complete=False)
p['m2PrimaryCurriculumEvidence']=ref(B/'m2-pytha-curriculum-evidence-20261021-r1/own-report.json')
write(new,p)
index=B/'continuation-index.json'
raw=index.read_bytes();a=json.loads(raw)['latestEngineCheckpoint']
z={**a,'utc':now,'progress':new.as_posix(),'sha256':ref(new)['sha256']}
needle=json.dumps(a,ensure_ascii=False,indent=2).replace('\n','\n  ').encode('utf-8')
replacement=json.dumps(z,ensure_ascii=False,indent=2).replace('\n','\n  ').encode('utf-8')
assert raw.count(needle)==1
index.write_bytes(raw.replace(needle,replacement,1))
print(json.dumps(dict(progress=new.as_posix(),code=len(code),related=139,independentAPI=532,DBWrites=0)))
