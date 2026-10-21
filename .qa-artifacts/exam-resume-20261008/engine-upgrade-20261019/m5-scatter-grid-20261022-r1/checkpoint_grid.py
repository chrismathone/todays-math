"""Seal opt-in grid support, not the pending scatter template conversion."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=Path(p).as_posix(),sha256=sha(p))
load=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=B/'engine-upgrades-progress-r65.json';new=B/'engine-upgrades-progress-r66.json'
assert not new.exists();d=copy.deepcopy(load(old))
assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
t=load(OUT/'grid-related-r1-results.json');e=load(OUT/'grid-related-r1-execution.json')
assert t['success'] and t['numPassedTests']==190 and t['numFailedTests']==0 and len(t['testResults'])==7
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
ty=load(OUT/'types-grid-types-r1.json');li=load(OUT/'grid-lint-r1-results.json')
assert ty['rootErrors']==0 and len(ty['rootFiles'])==1 and not ty['globalDiagnostics']
for r in ty['rootFiles']:assert sha(r['path'])==r['sha256'],r['path']
assert len(li)==1 and sum(r['errorCount']+r['warningCount'] for r in li)==0
n=load(OUT/'native-green-r4-execution.json');assert n['exitcode']==0 and n['sourcesUnchanged'] and n['testMethods']==11
assert sha('scripts/figure/elem_advanced.py')==n['codeSHA256']
s=load(OUT/'source-eight-r1-execution.json');assert s['exitcode']==0 and s['externalUnchanged'] and s['sourceCases']==8
for p,h in s['externalSourceSHA256'].items():assert sha(p)==h,p
capt=load(OUT/'actual-current.json');assert capt['sourcesUnchanged'] and len(capt['rows'])==6
for p,h in capt['sourceSHA256'].items():assert sha(p)==h,p
for row in capt['rows']:assert sha(OUT/row['file'])==row['svgSHA256']
assert load(OUT/'grid-capture-r1-results.json')['success']
ind=B/'m5-scatter-grid-current-audit-20261022-r1/own-report.json';i=load(ind)
assert i['ownPythonRenders']==6 and i['defaultFixtureRenders']==9 and i['sourceUnchanged']
assert all(v==0 for v in i['failures'].values()) and i['ownPublicAPIorMathJaxExecutions']==0
for p,h in load(ind.parent/'own-after.json').items():assert sha(p)==h,p
for p,h in load(ind.parent/'own-import-closure.json').items():assert sha(p)==h,p
visual=load(OUT/'visual-review-r1.json');assert len(visual['viewed'])==4
for r in visual['viewed']:assert sha(r['path'])==r['sha256']
allowed={'scripts/figure/elem_advanced.py','scripts/figure/engine-catalog.json','scripts/figure/test_scatter_grid.py','src/__tests__/unit/figureScatterGrid.test.ts','src/__tests__/fixtures/m3Scatter-native-default-20261022.json'}
for r in d['code']:
    if r['path'] not in allowed:assert sha(r['path'])==r['sha256'],r['path']
code=[bind(p)for p in dict.fromkeys([r['path']for r in d['code']]+sorted(allowed))]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=190,currentMainRelatedFailed=0,actualTestFiles=7,
 tests=bind(OUT/'grid-related-r1-results.json'),execution=bind(OUT/'grid-related-r1-execution.json'),
 types=bind(OUT/'types-grid-types-r1.json'),typeRoots=1,lint=bind(OUT/'grid-lint-r1-results.json'),lintRoots=1,
 nativeTests=bind(OUT/'native-green-r4-execution.json'),nativeTestMethods=11,
 sourceEight=bind(OUT/'source-eight-r1-execution.json'),sourceEightExactCases=8,
 actualCurrentOutput=bind(OUT/'actual-current.json'),parentActualStrictPublicRenders=6,
 independent=bind(ind),independentOwnPythonRenders=6,independentNewPublicAPIOrMathJax=0,
 actualPublicDefaultSVGExactCases=9,nativeDefaultSVGExactCases=9,
 visualReview=bind(OUT/'visual-review-r1.json'),visualPreviews=4,CJKFontMeasuredApproval=False,
 existingQuestionOrDBWrites=0,newQuestionCredits=0)
validation=OUT/'grid-push-validation-r1.json';assert not validation.exists()
validation.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
d.update(kind='exam-engine-upgrades-progress/v66',version=66,createdAt=now,previous=bind(old),code=code,
 report='docs/planning/tracks/reports/exam-engine-m5-scatter-grid-20261022.md',currentMainRuntimeValidation=v)
d['m5ScatterGrid']=dict(status='OPT_IN_NATIVE_GRID_VERIFIED_DEFAULTS_RETAINED_TEMPLATES_PENDING',
 field='gridStep',integerOnly=True,exactSpanAndMajorDivisibility=True,pointsOnGridRequired=True,
 duplicatePointsRejected=True,maxMinorIntervals=40,minScreenCell=8,
 serializedSquareCell=True,background='existing graph_scene.grid_svg six-number single-path contract',
 sanitizerAndVendorUnchanged=True,majorLabelsOnly=True,currentValidation=bind(validation),
 relatedTests=190,pythonTestMethods=11,sourceExactCases=8,independent=bind(ind),
 actualPublicExamples=6,independentOwnPythonRenders=6,defaultByteExamples=9,
 subjectLabelsOnSeparateRows=True,CJKMetricsUnknown=True,physicalPrintApproved=False,
 existingTemplateOrAdapterChanges=False,coordinateListsRetained=True,
 persistedSpecCompatibilityReleaseHeld=True,questionApprovalCredits=0)
d['pendingM38']['activeNext']=['M5-M18-nine-template-lattice-subject-axes-and-independent-math-SVG-readback-before-list-removal','M4-conservative-label-ownership16','M14-mode1-EF-measurement-layout','remaining-original-cards','stored-spec-replay-release-contract']
d['items'].append(dict(id='U80',area='M5/M18 opt-in exact integer scatter grid',status='native-support-verified-current-templates-retained',evidence='m5ScatterGrid',existingQuestionOrDBWrites=0))
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=v['tests'],passed=190,failed=0,actualFiles=7)
d['nextAuthorizedWork']=dict(instruction='Continue nine scatter template changes to lattice and subject axes with independent condition/answer/SVG readback and set diversity before removing coordinate lists. Keep other layout, native, reader, grade and rights holds.',sourceRepositoryReadOnly=True,existingBankQuestionChanges=False,strictGradeAndCurriculumGateBeforeQuestionApproval=True,finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert d['currentCounts']==load(old)['currentCounts'] and not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=190,nativeMethods=11,sourceExact8=8,independentPython=6,questionOrDBWrites=0)))
