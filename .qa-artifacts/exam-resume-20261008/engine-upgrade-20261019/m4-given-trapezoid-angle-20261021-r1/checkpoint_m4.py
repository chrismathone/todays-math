"""Seal M4 given-role repair while retaining16 conservative ownership holds."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
load=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=B/'engine-upgrades-progress-r63.json';new=B/'engine-upgrades-progress-r64.json'
assert not new.exists();d=copy.deepcopy(load(old));assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
t=load(OUT/'m4-related-r1-results.json');e=load(OUT/'m4-related-r1-execution.json')
assert t['success'] and t['numPassedTests']==492 and t['numFailedTests']==0 and len(t['testResults'])==9
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
ty=load(OUT/'types-m4-r1.json');li=load(OUT/'m4-lint-r1-results.json')
assert ty['rootErrors']==0 and len(ty['rootFiles'])==3 and not ty['globalDiagnostics']
for r in ty['rootFiles']:assert sha(r['path'])==r['sha256'],r['path']
assert len(li)==3 and sum(r['errorCount']+r['warningCount'] for r in li)==0
baseline=load('src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json')
assert (len(baseline['mode0']),len(baseline['mode1']),len(baseline['actualAPI']),len(baseline['shared']))==(49,54,32,27)
red=load(OUT/'m4-red-r1-results.json');assert red['numFailedTests']==56 and red['numPassedTests']==2
capt=load(OUT/'actual-current-outputs.json');assert capt['sourcesUnchanged'] and capt['strictGivenDimensionsPreserved']
for p,h in capt['sourceSHA256'].items():assert sha(p)==h,p
assert len(capt['rows'])==54 and len(capt['actualAPI'])==100
for row in capt['rows']:assert sha(OUT/row['svg'])==row['svgSHA256']
assert load(OUT/'current-capture-results.json')['success']
preview=load(OUT/'actual-preview-manifest.json');assert len(preview['actualCurrentVsChosenQA'])==54 and all(r['actualMatchesQA']for r in preview['actualCurrentVsChosenQA'])
ind=B/'m4-given-angle-current-audit-20261021-r2/own-report.json';i=load(ind)
assert i['counts']['ownPythonMeasuredRenders']==54 and i['counts']['suppliedAPIArtifacts']==100
assert i['placement']['all54HaloInsideCorrectAWedgeAndQuad'] and i['placement']['all54CentersNearestA']
assert all(i['placement'][k]==0 for k in ['bodyHits','markHits','otherLabelHits','clips','unexpectedAngleLeaders'])
counter=i['placement']['fullBoxOwnershipCounterexamples'];assert len(counter)==16
byVertex={k:sum(r['margins'][k]<0 for r in counter)for k in ['B','D']};assert byVertex=={'B':6,'D':10}
for p,h in load(ind.parent/'own-after.json').items():assert sha(p)==h,p
correction=ind.parent/'own-ownership-correction-r1.json';c=load(correction)
assert c['originalReportSHA256']==sha(ind) and c['originalResultsSHA256']==sha(ind.parent/'own-results.json')
assert c['independentRecount']['negativeMarginRowsByVertex']==byVertex
allowed={'src/lib/middle/m2GeoQuad.ts','src/lib/examStudy/adapters.ts'}
for r in d['code']:
    if r['path'] not in allowed:assert sha(r['path'])==r['sha256'],r['path']
code=[bind(p)for p in dict.fromkeys([r['path']for r in d['code']]+list(allowed)+['src/__tests__/unit/middleM2TrapezoidGivenAngle.test.ts','src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json'])]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True);now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=492,currentMainRelatedFailed=0,actualTestFiles=9,
    tests=bind(OUT/'m4-related-r1-results.json'),execution=bind(OUT/'m4-related-r1-execution.json'),
    types=bind(OUT/'types-m4-r1.json'),typeRoots=3,lint=bind(OUT/'m4-lint-r1-results.json'),lintRoots=3,
    independent=bind(ind),ownershipCorrection=bind(correction),actualCurrentOutput=bind(OUT/'actual-current-outputs.json'),
    actualCurrentStrictMathJaxRenders=54,independentPythonMeasuredSpecRenders=54,independentNewTSOrAPI=0,
    conservativeHaloOwnershipHeld=16,ownershipHeldByVertex=byVertex,canonicalIndexUnchanged=d['canonicalIndex'],existingQuestionOrDBWrites=0)
validation=OUT/'push-validation-r1.json';assert not validation.exists();validation.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
d.update(kind='exam-engine-upgrades-progress/v64',version=64,createdAt=now,previous=bind(old),code=code,
    report='docs/planning/tracks/reports/exam-engine-m4-20261021.md',currentMainRuntimeValidation=v)
d['m4GivenTopAngle']=dict(status='GIVEN_ROLE_REPAIRED_DIMENSIONS54_PRESERVED_CONSERVATIVE_OWNERSHIP16_HELD',
    adapterRevision='20261021-given-top-angle-only-r1',currentValidation=bind(validation),mode0ParityCases=49,mode1FiniteCases=54,
    beforeAPIBaseline=32,otherSharedTypeParityExamples=27,currentAPISpecimens=100,strictMathJaxRenders=54,
    independent=bind(ind),independentOwnPythonRenders=54,ownershipCorrection=bind(correction),
    centerNearestA=54,haloInsideAWedgeAndQuad=54,fullHaloNearestVertexPass=38,fullHaloNearestVertexHeld=16,
    heldByVertex=byVertex,wrongAngleProven=False,fullSemanticNativeApproval=False,
    currentLayout=dict(onlyGiven120=True,radius=14,labelDistance=30,noStyleOrGlobalEngineChange=True),
    oldCoordinatesDimensionsBodyAnswerSolutionFactsAndRandomOrderPreserved=True,questionApprovalCredits=0)
d['pendingM38']['scopedCodeFixes'].append('M4-given-top-angle-only-with-ownership16-hold')
d['pendingM38']['activeNext']=['M5-M18-exact-scatter-before-list-removal','M4-conservative-label-ownership','M14-mode1-EF-measurement-layout','remaining-original-cards','stored-spec-replay-release-contract']
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=v['tests'],passed=492,failed=0,actualFiles=9)
d['items'].append(dict(id='U78',area='M4 given A120 replacing derived B60 with both dimensions retained',status='given-role-repaired-native54-conservative-ownership16-held',evidence='m4GivenTopAngle',existingQuestionOrDBWrites=0))
d['nextAuthorizedWork']=dict(instruction='Continue exact scatter-grid and figure-semantic dedup support before removing coordinate lists; retain M4 ownership16 and M14 EF holds; remaining engine cards and stored-spec replay stay open',sourceRepositoryReadOnly=True,existingBankQuestionChanges=False,strictGradeAndCurriculumGateBeforeQuestionApproval=True,finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert d['currentCounts']==load(old)['currentCounts'] and not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=492,actualStrict54=54,ownershipHeld=16,heldByVertex=byVertex,DBWrites=0)))
