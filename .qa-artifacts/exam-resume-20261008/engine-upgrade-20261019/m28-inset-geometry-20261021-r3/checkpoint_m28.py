"""Bind actual current checks without rewriting old attempts or question approvals."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
load=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=B/'engine-upgrades-progress-r60.json';new=B/'engine-upgrades-progress-r61.json'
assert not new.exists()
d=copy.deepcopy(load(old));assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
t=load(OUT/'m28-inset-r2-results.json');e=load(OUT/'m28-inset-r2-execution.json')
assert t['success'] and t['numPassedTests']==230 and t['numFailedTests']==0 and len(t['testResults'])==10
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
ty=load(OUT/'types-m28-inset-r3.json');li=load(OUT/'m28-inset-lint-r1-results.json')
assert ty['rootErrors']==0 and len(ty['rootFiles'])==4 and not ty['globalDiagnostics']
for r in ty['rootFiles']:assert sha(r['path'])==r['sha256'],r['path']
assert len(li)==4 and sum(r['errorCount']+r['warningCount'] for r in li)==0
py=load(OUT/'python71-execution.json');assert py['exitcode']==0 and py['sourcesUnchanged']
for p,h in py['codeSHA256'].items():assert sha(p)==h,p
assert 'Ran 71 tests' in (OUT/'python71.log').read_text(encoding='utf-8')
native=load(OUT/'current-production-results.json');assert native['actualProductionNoMonkeypatch'] and native['strictPassed']==64
assert len(native['default8'])==8 and all(r['rawByteMatch'] for r in native['default8'])
for p,h in native['codeSHA256'].items():assert sha(p)==h,p
ind=B/'m28-inset-current-audit-20261021-r3/own-report.json';i=load(ind)
assert i['results']['strictZeroTolerance64']==64 and i['actualExecution']['negativeRejected']==22 and i['actualExecution']['defaultCLIRawSame']==8
for p,h in load(ind.parent/'own-after.json').items():assert sha(p)==h,p
for p,h in i['artifactSHA256'].items():assert sha(ind.parent/p)==h,p
default=load(OUT/'default08-native-comparison.json');assert default['uniqueSpecs']==1 and default['rawByteMatches']==1 and default['exactAll']
diagnostic=load(OUT/'default12-diagnostic-tests.json');assert diagnostic['numFailedTests']==0 and diagnostic['numPassedTests']==1
first=load(OUT/'m28-inset-r1-results.json');assert first['numFailedTests']==1
allowed={'scripts/figure/engine-catalog.json','src/__tests__/unit/middleM2QuadAngleFigure.test.ts','src/lib/examStudy/adapters.ts','src/lib/middle/m2Quad.ts','vendor/figure-engine/core/figure_scene.py','vendor/figure-engine/core/figure_svg.py'}
for r in d['code']:
    if r['path'] not in allowed:assert sha(r['path'])==r['sha256'],r['path']
files=list(dict.fromkeys([r['path'] for r in d['code']]+list(allowed)+['scripts/figure/test_inset_angle.py','src/__tests__/unit/middleM2QuadInsetRegression.test.ts','src/__tests__/fixtures/m2Quad-before-inset-20261021.json']))
code=[bind(p) for p in files]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=230,currentMainRelatedFailed=0,actualTestFiles=10,
    tests=bind(OUT/'m28-inset-r2-results.json'),execution=bind(OUT/'m28-inset-r2-execution.json'),
    python=bind(OUT/'python71-execution.json'),pythonTests=71,types=bind(OUT/'types-m28-inset-r3.json'),typeRoots=4,
    lint=bind(OUT/'m28-inset-lint-r1-results.json'),lintRoots=4,independent=bind(ind),
    native64=bind(OUT/'current-production-results.json'),default08=bind(OUT/'default08-native-comparison.json'),
    firstFailure=bind(OUT/'m28-inset-r1-results.json'),firstFailureCause='UNDETERMINED_NOT_REPRODUCED_NOT_CLAIMED_FIXED',
    exactInputDiagnostic=bind(OUT/'default12-diagnostic-tests.json'),canonicalIndexUnchanged=d['canonicalIndex'],existingQuestionOrDBWrites=0)
validation=OUT/'push-validation-r1.json';assert not validation.exists();validation.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
d.update(kind='exam-engine-upgrades-progress/v61',version=61,createdAt=now,previous=bind(old),code=code,
    report='docs/planning/tracks/reports/exam-engine-m28-inset-20261021.md',currentMainRuntimeValidation=v)
d['m28SerializedInset']=dict(status='IMPLEMENTED_OPT_IN_BOUNDED_CENTERLINE_CHECKS_PASSED',currentValidation=bind(validation),
    adapterRevision='20261021-input-angle-and-inset-marks-r2',native64=64,analyticSerializedArcs=128,
    minimumSignedMargin=i['results']['minimumSignedMargin'],independent=bind(ind),independentNegatives=22,
    intervalSharedBetweenSamplerAndEmission=True,samplerIsApproximation=True,fullStrokeOrPrintApproval=False,
    sourceDefault8RawBytesMatch=8,default08APICases=32,default08UniqueNativeShapes=1,
    actual15AAPIParities=100,handlerParameterParities=432,oldOutputUnchangedExceptTwoExplicitFlags=True,
    previews=bind(OUT/'preview-manifest.json'),existingQuestionEdits=0,newQuestionApprovalCredits=0,
    firstUnchangedType12Failure=v['firstFailure'],firstFailureCause=v['firstFailureCause'],
    sourceReposWritten=False,storedSpecReplayReleaseHoldRetained=True)
d['pendingM38'].update(activeNext=['remaining-original-cards','stored-spec-replay-release-contract'],
    inwardTrimCandidateProductionApplied=True,strictSerializedArcProductionAudit=bind(ind),
    strictSerializedArcScope='bounded64-centerline-only-not-stroke-or-print')
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=v['tests'],passed=230,failed=0,actualFiles=10)
d['items'].append(dict(id='U75',area='M28 opt-in shared unrounded angle interval and endpoint serialization',status='implemented-bounded-centerline64-default8-and-legacy-math-parity',evidence='m28SerializedInset',existingQuestionOrDBWrites=0))
d['nextAuthorizedWork']=dict(instruction='Continue remaining original engine cards and versioned stored-spec replay; monitor unreproduced unchanged-type12 local failure without weakening checks',sourceRepositoryReadOnly=True,existingBankQuestionChanges=False,strictGradeAndCurriculumGateBeforeQuestionApproval=True,finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
assert d['currentCounts']==load(old)['currentCounts']
new.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=230,python=71,independent64=64,default8=8,DBWrites=0)))
