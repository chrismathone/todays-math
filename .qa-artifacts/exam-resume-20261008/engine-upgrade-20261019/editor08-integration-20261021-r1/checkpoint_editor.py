"""Bind current app checks and independent repaired controls, retain prior failures."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
old=B/'engine-upgrades-progress-r59.json';new=B/'engine-upgrades-progress-r60.json'
assert not new.exists()
d=copy.deepcopy(json.loads(old.read_text(encoding='utf-8')))
assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
tests=OUT/'editor08-r5-results.json';execution=OUT/'editor08-r5-execution.json'
t=json.loads(tests.read_text(encoding='utf-8'));e=json.loads(execution.read_text(encoding='utf-8'))
assert t['success'] and t['numPassedTests']==581 and t['numFailedTests']==0 and len(t['testResults'])==21
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,digest in e['sourceSHA256'].items():assert sha(p)==digest,p
types=OUT/'types-editor08-r6.json';lint=OUT/'editor08-lint-r5-results.json'
ty=json.loads(types.read_text(encoding='utf-8'));li=json.loads(lint.read_text(encoding='utf-8'))
assert ty['rootErrors']==0 and len(ty['rootFiles'])==17 and not ty['globalDiagnostics']
assert len(li)==17 and sum(r['errorCount']+r['warningCount'] for r in li)==0
ind=B/'editor08-current-audit-20261021-r1/own-execution-r3/own-report.json'
i=json.loads(ind.read_text(encoding='utf-8'))
assert i['actualUnique']==i['passed']==136 and i['failed']==0 and i['NodeEnded'] and i['same136InputsExpectationsRunnerBytes']
for p,digest in json.loads((ind.parent/'own-after.json').read_text(encoding='utf-8')).items():assert sha(p)==digest,p
browser=OUT/'browser/browser-results-r3.json';br=json.loads(browser.read_text(encoding='utf-8'))
assert br['success'] and br['sourcesUnchanged'] and len(br['results'])==4 and not br['blocked'] and not br['errors']
for row in br['code']:assert sha(row['path'])==row['sha256'],row['path']
eight=OUT.parent/'assets41-sync-20261021-r1/eight-raw-results.json';eight_data=json.loads(eight.read_text(encoding='utf-8'))
assert len(eight_data['cases'])==8 and all(c['rawBytesMatch'] for c in eight_data['cases'])
for p,digest in eight_data['codeSHA256'].items():assert sha(p)==digest,p
files=json.loads((OUT/'root-files.json').read_text(encoding='utf-8'))
files+=['scripts/figure/build_asset_editor_library.py']+[p.as_posix() for p in Path('public/figure-assets').glob('*.svg')]
assert len(list(Path('public/figure-assets').glob('*.svg')))==41
code=[bind(p) for p in dict.fromkeys([r['path'] for r in d['code']]+files)]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=581,currentMainRelatedFailed=0,actualTestFiles=21,
    tests=bind(tests),execution=bind(execution),types=bind(types),typeRoots=17,lint=bind(lint),lintRoots=17,
    browser=bind(browser),actualBrowserViewports=4,independent=bind(ind),independentControls=136,
    independentNotAddedToParentCount=True,engineEight=bind(eight),pythonEngineClosureUnchanged=True,
    canonicalIndexUnchanged=d['canonicalIndex'],existingQuestionOrDBWrites=0)
validation=OUT/'push-validation-r1.json';assert not validation.exists()
validation.write_bytes((json.dumps(v,indent=2)+'\n').encode('utf-8'))
d.update(kind='exam-engine-upgrades-progress/v60',version=60,createdAt=now,previous=bind(old),code=code,
    report='docs/planning/tracks/reports/exam-engine-editor08-20261021.md',currentMainRuntimeValidation=v)
d['editor08']=dict(status='IMPLEMENTED_BOUNDED_ADAPTED_SUBSET_WITH_RAW_FAILURES_PRESERVED',sourceCommit='4ccb0cb',
    transferredDecisions=bind(OUT/'transfer-decisions-r1.json'),parentTests=581,parentFiles=21,independentControls=136,
    independent=bind(ind),browser=bind(browser),currentBrowserViewports=4,currentValidation=bind(validation),
    staticAssets=41,menuFlat=29,menuSolid=12,sourceRepositoryWrites=0,operationalAPIOrDBWrites=0,
    sourceReviewTypedNotPrefixTrusted=True,uncertaintyAndFinalReviewRetained=True,
    currentAndLegacyGeometryGuardsRetained=True,unmountedInsertDiscarded=True,
    nestedGroupsRejectCombinedLimitBeforeCommit=True,malformedOrExplicitEmptyStackCannotMutate=True,
    rawR1Failure=bind(ind.parent.parent/'own-execution-r1/own-report.json'),
    rawR2Failure=bind(ind.parent.parent/'own-execution-r2/own-report.json'),
    snapOrBodyStrippingOrIssueFilteringOrFinalReviewSkipImported=False,
    automaticCoordinateScaleOrEdgeInventionOrProjectionTypoRepairImported=False,
    manualNewDrawingCoordinatesPrecision=3,wholeNextBuildOrPrintOrStoredRecordReplayApproved=False,
    sourceGradeRightsOrQuestionApproval=False)
d['assets41']['editorCompatibilityRevalidatedBy']=bind(validation)
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=bind(tests),passed=581,failed=0,actualFiles=21)
d['items'].append(dict(id='U74',area='Final08 bounded editor transfer, local stock loading and evidence-preserving review origin',
    status='implemented-adapted-subset-unsafe-repairs-held',evidence='editor08',existingQuestionOrDBWrites=0))
d['nextAuthorizedWork']=dict(instruction='Continue M28 strict serialized angle containment and remaining useful engine cards; preserve stored-spec replay release hold',
    sourceRepositoryReadOnly=True,existingBankQuestionChanges=False,strictGradeAndCurriculumGateBeforeQuestionApproval=True,
    finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=581,independent=136,currentBrowser=4,engineRaw8=8,dbWrites=0)))
