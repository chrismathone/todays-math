"""Seal finite M3 mark/metric checks separately from all question approvals."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
load=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=B/'engine-upgrades-progress-r62.json';new=B/'engine-upgrades-progress-r63.json'
assert not new.exists();d=copy.deepcopy(load(old));assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
t=load(OUT/'m3-related-r1-results.json');e=load(OUT/'m3-related-r1-execution.json')
assert t['success'] and t['numPassedTests']==434 and t['numFailedTests']==0 and len(t['testResults'])==8
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
ty=load(OUT/'types-m3-r1.json');li=load(OUT/'m3-lint-r1-results.json')
assert ty['rootErrors']==0 and len(ty['rootFiles'])==3 and not ty['globalDiagnostics']
for r in ty['rootFiles']:assert sha(r['path'])==r['sha256'],r['path']
assert len(li)==3 and sum(r['errorCount']+r['warningCount'] for r in li)==0
baseline=load('src/__tests__/fixtures/m2Bisector-before-given-angle-20261021.json')
assert len(baseline['mode0'])==147 and len(baseline['mode1'])==21 and len(baseline['actualAPI'])==32
red=load(OUT/'m3-red-r1-results.json');assert red['numFailedTests']==23 and red['numPassedTests']==1
capt=load(OUT/'actual-current-outputs.json');assert capt['sourcesUnchanged']
for p,h in capt['sourceSHA256'].items():assert sha(p)==h,p
assert len(capt['rows'])==21 and len(capt['actualAPI'])==100
for row in capt['rows']:assert sha(OUT/row['svg'])==row['svgSHA256']
assert load(OUT/'current-capture-results.json')['success']
preview=load(OUT/'actual-preview-manifest.json');assert len(preview['actualCurrentVsChosenQA'])==21 and all(r['actualEqualsQAChosenCandidate']for r in preview['actualCurrentVsChosenQA'])
ind=B/'m3-given-angle-current-audit-20261021-r2/own-report.json';i=load(ind)
assert i['counts']['ownActualPythonMeasuredSpecRenders']==21 and i['counts']['suppliedActualAPIArtifactsChecked']==100
assert all(i['diagram'][k]for k in ['onlyOneGivenAndUnknown','noNumericHalfOrAnswerLabels'])
assert all(i['diagram'][k]==0 for k in ['allMetricLabelClips','allMetricHaloClips','labelPairOverlapRows','wholeOrTargetLabelBodySegmentHitRows'])
for p,h in load(ind.parent/'own-after.json').items():assert sha(p)==h,p
for p,h in i['artifactSHA256'].items():assert sha(ind.parent/p)==h,p
allowed={'src/lib/middle/m2GeoTri.ts','src/lib/examStudy/adapters.ts'}
for r in d['code']:
    if r['path'] not in allowed:assert sha(r['path'])==r['sha256'],r['path']
code=[bind(p) for p in dict.fromkeys([r['path']for r in d['code']]+list(allowed)+['src/__tests__/unit/middleM2BisectorGivenAngle.test.ts','src/__tests__/fixtures/m2Bisector-before-given-angle-20261021.json'])]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True);now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=434,currentMainRelatedFailed=0,actualTestFiles=8,
    tests=bind(OUT/'m3-related-r1-results.json'),execution=bind(OUT/'m3-related-r1-execution.json'),
    types=bind(OUT/'types-m3-r1.json'),typeRoots=3,lint=bind(OUT/'m3-lint-r1-results.json'),lintRoots=3,
    independent=bind(ind),actualCurrentOutput=bind(OUT/'actual-current-outputs.json'),actualCurrentStrictMathJaxRenders=21,
    independentPythonMeasuredSpecRenders=21,independentNewTSOrAPI=0,canonicalIndexUnchanged=d['canonicalIndex'],existingQuestionOrDBWrites=0)
validation=OUT/'push-validation-r1.json';assert not validation.exists();validation.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
d.update(kind='exam-engine-upgrades-progress/v63',version=63,createdAt=now,previous=bind(old),code=code,
    report='docs/planning/tracks/reports/exam-engine-m3-20261021.md',currentMainRuntimeValidation=v)
d['m3GivenWholeAngle']=dict(status='IMPLEMENTED_FINITE_MARK_AND_REAL_METRIC_CHECKS_PASSED',adapterRevision='20261021-given-whole-angle-only-r1',
    currentValidation=bind(validation),sourceMode0ParityCases=147,mode1FiniteCases=21,beforeAPIBaseline=32,currentAPISpecimens=100,
    strictMathJaxRenders=21,QAOnlyCandidateRenders=63,independent=bind(ind),independentOwnPythonRenders=21,
    scopedClearAngleLabels=True,globalEngineDefaultsChanged=False,oldPointsSegmentsBodyAnswerSolutionFactsAndRNGPreserved=True,
    noNumericalHalfAngleOrTargetDisclosure=True,wholeGlyphStrokeOrPrintOrGradeRightsApproval=False,questionApprovalCredits=0)
d['pendingM38']['scopedCodeFixes'].append('M3-given-whole-angle-only')
d['pendingM38']['activeNext']=['M4-given-top-angle-only','M14-mode1-EF-measurement-layout','remaining-original-cards','stored-spec-replay-release-contract']
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=v['tests'],passed=434,failed=0,actualFiles=8,priorMainIntegration=load(old)['latestMainIntegration'])
d['items'].append(dict(id='U77',area='M3 given whole angle with equal marks and scoped clear-label placement',status='implemented-bounded21-real-metric-native-checks',evidence='m3GivenWholeAngle',existingQuestionOrDBWrites=0))
d['nextAuthorizedWork']=dict(instruction='Continue M4 given-only angle marks, separate M14 EF layout and remaining original engine cards; preserve stored-spec replay gate',sourceRepositoryReadOnly=True,existingBankQuestionChanges=False,strictGradeAndCurriculumGateBeforeQuestionApproval=True,finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert d['currentCounts']==load(old)['currentCounts'] and not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=434,actualStrict21=21,independentPython21=21,DBWrites=0)))
