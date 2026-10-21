"""Seal the scoped identity support without crediting question approval."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=Path(p).as_posix(),sha256=sha(p))
load=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=B/'engine-upgrades-progress-r64.json';new=B/'engine-upgrades-progress-r65.json'
assert not new.exists()
d=copy.deepcopy(load(old));assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
t=load(OUT/'identity-related-r2-results.json');e=load(OUT/'identity-related-r2-execution.json')
assert t['success'] and t['numPassedTests']==227 and t['numFailedTests']==0 and len(t['testResults'])==6
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
ty=load(OUT/'types-identity-types-r1.json');li=load(OUT/'identity-lint-r1-results.json')
assert ty['rootErrors']==0 and len(ty['rootFiles'])==3 and not ty['globalDiagnostics']
for r in ty['rootFiles']:assert sha(r['path'])==r['sha256'],r['path']
assert len(li)==3 and sum(r['errorCount']+r['warningCount'] for r in li)==0
red=load(OUT/'identity-red-r2-results.json');assert red['numFailedTests']==1 and red['numPassedTests']==2
baseline=load('src/__tests__/fixtures/m3Scatter-before-input-identity-20261022.json')
assert [len(baseline[k])for k in ['actualAPI','outside','sets','sharedSets','plots']]==[288,80,27,16,9]
assert load(OUT/'baseline-r2-results.json')['success']
ind=B/'m5-scatter-design-audit-20261021-r1/own-report.json';i=load(ind)
for p,h in i['sourceHashes'].items():assert sha(p)==h,p
assert i['actualTSAPIOrRendererExecutions']==0
allowed={'src/lib/middle/generate.ts','src/lib/middle/studentInputIdentity.ts','src/__tests__/unit/middleStudentInputIdentity.test.ts','src/__tests__/fixtures/m3Scatter-before-input-identity-20261022.json'}
for r in d['code']:
    if r['path'] not in allowed:assert sha(r['path'])==r['sha256'],r['path']
code=[bind(p)for p in dict.fromkeys([r['path']for r in d['code']]+sorted(allowed))]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=227,currentMainRelatedFailed=0,actualTestFiles=6,
 tests=bind(OUT/'identity-related-r2-results.json'),execution=bind(OUT/'identity-related-r2-execution.json'),
 types=bind(OUT/'types-identity-types-r1.json'),typeRoots=3,lint=bind(OUT/'identity-lint-r1-results.json'),lintRoots=3,
 independentStaticReview=bind(ind),independentTSAPIOrSVGExecutions=0,
 baselineAPIBodiesUnchanged=368,baselineSetsUnchanged=43,newQuestionCredits=0,existingQuestionOrDBWrites=0)
validation=OUT/'identity-push-validation-r1.json';assert not validation.exists()
validation.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
d.update(kind='exam-engine-upgrades-progress/v65',version=65,createdAt=now,previous=bind(old),code=code,
 report='docs/planning/tracks/reports/exam-engine-m5-input-identity-20261022.md',currentMainRuntimeValidation=v)
d['m5ScatterInputIdentity']=dict(status='SCOPED_SET_INPUT_SUPPORT_VERIFIED_COORDINATE_LISTS_RETAINED',
 scopeTypes=['06','07','08','09','10','11','12','14','15'],outsideIdentityUnchanged=True,
 comparison=['exact content','trimmed ordered x/y labels','sorted unique finite numeric point pairs'],
 excluded=['answer','solution','facts','style','point array order','axis frame'],
 baselineAPIBodies=368,baselineSets=43,baselineSVGs=9,currentTests=227,newIdentityTests=36,
 validation=bind(validation),independentStaticReview=bind(ind),figureOrTemplateChanges=False,
 coordinateTextOrderStillMatters=True,comboSetNotChanged=True,axisAndRenderValidationSeparate=True,
 gridWorkComplete=False,questionApprovalCredits=0)
d['pendingM38']['activeNext']=['M5-M18-opt-in-native-grid-then-lattice-subject-axes-and-exact-readback-before-list-removal','M4-conservative-label-ownership16','M14-mode1-EF-measurement-layout','remaining-original-cards','stored-spec-replay-release-contract']
d['items'].append(dict(id='U79',area='M5/M18 scoped deterministic scatter student-input identity',status='support-verified-old-bodies-and-plots-retained',evidence='m5ScatterInputIdentity',existingQuestionOrDBWrites=0))
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=v['tests'],passed=227,failed=0,actualFiles=6)
d['nextAuthorizedWork']=dict(instruction='Continue opt-in exact native scatter grid with preserved default SVGs, then authored lattice/subject axes and independent mathematical/SVG readback before removing coordinate lists. Other render and replay holds remain separate.',existingBankQuestionChanges=False,sourceRepositoryReadOnly=True,strictGradeAndCurriculumGateBeforeQuestionApproval=True,finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert d['currentCounts']==load(old)['currentCounts'] and not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=227,newIdentityTests=36,unchangedAPI=368,unchangedSets=43,dbWrites=0)))
