"""Current M14 reference repair with original dimension hold, no question promotion."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
load=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=B/'engine-upgrades-progress-r61.json';new=B/'engine-upgrades-progress-r62.json'
assert not new.exists();d=copy.deepcopy(load(old));assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
t=load(OUT/'m14-postmain-r1-results.json');e=load(OUT/'m14-postmain-r1-execution.json')
assert t['success'] and t['numPassedTests']==410 and t['numFailedTests']==0 and len(t['testResults'])==7
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
ty=load(OUT/'types-m14-r2.json');li=load(OUT/'m14-lint-r1-results.json')
assert ty['rootErrors']==0 and len(ty['rootFiles'])==3 and not ty['globalDiagnostics']
for r in ty['rootFiles']:assert sha(r['path'])==r['sha256'],r['path']
assert len(li)==3 and sum(r['errorCount']+r['warningCount'] for r in li)==0
capt=load(OUT/'actual-current-outputs-r2.json');assert capt['sourcesUnchanged']
for p,h in capt['sourceSHA256'].items():assert sha(p)==h,p
assert len(capt['modes10'])==20 and len(capt['actualAPI'])==100
assert sum(r['strictResult']['ok'] for r in capt['modes10'])==10
assert all(r['oldStrict']==r['strictResult'] for r in capt['modes10'])
for r in capt['modes10']:
    assert sha(OUT/r['mathJaxSvg'])==r['svgSHA256']
    assert r['droppedDimensions']==(['d_EF'] if r['mode']==1 else [])
ind=B/'m14-current-artifact-audit-20261021-r2/own-report.json';i=load(ind)
assert all(i['independentFindings'][k] for k in ['all120OutputObjectsMatchBeforeModeExceptO','all20CorrespondingBeforeRowsMatchExactlyAfterRemovingO','oneODataLabelAndGlyphInEachSVG','printedGivensIndependentlyDeriveAnswer'])
for p,h in load(ind.parent/'own-after.json').items():assert sha(p)==h,p
for p,h in i['artifactSHA256'].items():assert sha(ind.parent/p)==h,p
pre=load(OUT/'main-integration-preflight.json')
assert pre['scopeFilesChanged']==[] and pre['remoteCommits']==83
for p,h in pre['dirtyOwnedSHA256'].items():assert sha(p)==h,p
allowed={'src/lib/middle/m2GeoSim.ts','src/lib/examStudy/adapters.ts'}
for r in d['code']:
    if r['path'] not in allowed:assert sha(r['path'])==r['sha256'],r['path']
code=[bind(p) for p in dict.fromkeys([r['path'] for r in d['code']]+list(allowed)+['src/__tests__/unit/middleM2ParallelIntersection.test.ts','src/__tests__/fixtures/m2Parallel-before-intersection-20261021.json'])]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
assert main==pre['newMain'];subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=410,currentMainRelatedFailed=0,actualTestFiles=7,
    tests=bind(OUT/'m14-postmain-r1-results.json'),execution=bind(OUT/'m14-postmain-r1-execution.json'),
    types=bind(OUT/'types-m14-r2.json'),typeRoots=3,lint=bind(OUT/'m14-lint-r1-results.json'),lintRoots=3,
    typeLintSourcesAndConfigurationUnchangedByMain=True,independent=bind(ind),currentOutputs=bind(OUT/'actual-current-outputs-r2.json'),
    strictSuccess=10,strictLayoutHeld=10,oldStrictControlsEqual=True,mainPreflight=bind(OUT/'main-integration-preflight.json'),
    canonicalIndexUnchanged=d['canonicalIndex'],existingQuestionOrDBWrites=0)
validation=OUT/'push-validation-r1.json';assert not validation.exists();validation.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
d.update(kind='exam-engine-upgrades-progress/v62',version=62,createdAt=now,previous=bind(old),code=code,
    report='docs/planning/tracks/reports/exam-engine-m14-20261021.md',currentMainRuntimeValidation=v)
d['m14NamedIntersection']=dict(status='REFERENCE_REPAIRED_MODE1_GIVEN_EF_LAYOUT_STILL_HELD',adapterRevision='20261021-named-diagonal-intersection-r1',
    currentValidation=bind(validation),actualHandlerRows=20,actualAPISpecimens=100,default09UnchangedCases=32,
    strictNativeSuccess=10,strictNativeHold=10,layoutHold='Preexisting mode1 d_EF collision identical with/withoutO; dropped-EF images not approved',
    independentCurrentArtifactAnalysis=bind(ind),independentNewAPIExecution=False,independentNewNativeRenders=False,
    oldFieldsOtherThanOAndTwoRNGCallsPreserved=True,wholeGradeRightsOrQuestionApproval=False)
d['pendingM38']['scopedCodeFixes'].append('M14-named-intersection-only')
d['pendingM38']['activeNext']=['M3-given-only-angle-marks','M14-mode1-EF-measurement-layout','remaining-original-cards','stored-spec-replay-release-contract']
d['latestMainIntegration']=dict(main=main,headAtCheck=head,remoteCommitsIntegrated=83,changedPathsPreserved=4057,overlappingEngineFiles=0,tests=v['tests'],passed=410,failed=0,actualFiles=7)
d['items'].append(dict(id='U76',area='M14 required named diagonal intersection with unchanged previous EF hold',status='reference-repaired-native10-pass10-held',evidence='m14NamedIntersection',existingQuestionOrDBWrites=0))
d['nextAuthorizedWork']=dict(instruction='Continue M3 given-only angle annotations, separate M14 mode1 EF dimension placement and remaining engine cards; preserve stored-spec replay hold',sourceRepositoryReadOnly=True,existingBankQuestionChanges=False,strictGradeAndCurriculumGateBeforeQuestionApproval=True,finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert d['currentCounts']==load(old)['currentCounts'] and not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=410,strictNativeSuccess=10,strictNativeHeld=10,DBWrites=0)))
