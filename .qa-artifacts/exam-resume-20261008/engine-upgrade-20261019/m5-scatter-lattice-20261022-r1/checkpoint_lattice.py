"""Seal nine future producers with independent pre-key computations; DB untouched."""
from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=Path(p).as_posix(),sha256=sha(p))
load=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=B/'engine-upgrades-progress-r66.json';new=B/'engine-upgrades-progress-r67.json'
assert not new.exists();d=copy.deepcopy(load(old))
assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
t=load(OUT/'lattice-related-r1-results.json');e=load(OUT/'lattice-related-r1-execution.json')
assert t['success'] and t['numPassedTests']==198 and t['numFailedTests']==0 and len(t['testResults'])==9
assert e['exitcode']==0 and e['sourcesUnchanged']
for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
ty=load(OUT/'types-lattice-types-r1.json');li=load(OUT/'lattice-lint-r1-results.json')
assert ty['rootErrors']==0 and len(ty['rootFiles'])==4 and not ty['globalDiagnostics']
for r in ty['rootFiles']:assert sha(r['path'])==r['sha256'],r['path']
assert len(li)==4 and sum(r['errorCount']+r['warningCount'] for r in li)==0
capt=load(OUT/'actual-current-private.json');seal=load(OUT/'capture-seal.json')
assert capt['sourcesUnchanged'] and len(capt['rows'])==144 and len(capt['sets'])==9
assert seal['privateSHA256']==sha(OUT/'actual-current-private.json') and seal['studentSHA256']==sha(OUT/'student-inputs-sealed.json')
for p,h in capt['sourceSHA256'].items():assert sha(p)==h,p
actual=[r for r in capt['rows']if r['svg']];assert len(actual)==36
for row in actual:assert sha(OUT/row['svg']['file'])==row['svg']['sha256']
assert load(OUT/'lattice-capture-r1-results.json')['success']
assert load(OUT/'positive-extra-results.json')['success']
extra=load(OUT/'positive-extra-manifest.json');assert sha(OUT/extra['file'])==extra['svgSHA256']
ind=B/'m5-scatter-lattice-current-audit-20261022-r1/own-solutions.json';sol=load(ind)
bindings=load(ind.parent/'own-bindings.json');checks=load(ind.parent/'own-svg-checks.json')
assert sol['inputSHA256']==seal['studentSHA256'] and bindings['ownSolutionSHA256']==sha(ind)
assert bindings['solutions']==144 and bindings['actualSVGReadbacks']==36 and not bindings['privateRead']
assert bindings['NodeAPIModelDB']==0 and all(n==16 for n in bindings['countsByType'].values())
for p,h in bindings['after'].items():assert sha(p)==h,p
assert len(checks)==36 and all(r['rationalReadbackExact']and r['singlePathSquareGrid']and r['subjectAndMajorLabelsMatch']for r in checks)
comparison=load(OUT/'independent-comparison-r1.json');assert comparison['ownSolutionSHA256']==sha(ind)
assert comparison['privateKeySHA256']==seal['privateSHA256'] and comparison['matches']==144 and comparison['mismatches']==0
visual=load(OUT/'visual-review-r1.json');assert len(visual['viewed'])==3
for r in visual['viewed']:assert sha(r['path'])==r['sha256']
apply=load(OUT/'apply-manifest-r1.json');stable=next(r for r in apply['typeBlocks']if r['type']=='13')
assert stable['beforeSHA256']==stable['afterSHA256'] and apply['coordinateListsRetained']
allowed={'src/lib/middle/m3Stat2.ts','src/lib/examStudy/adapters.ts','src/__tests__/unit/middleStudentInputIdentity.test.ts','src/__tests__/unit/middleM3ScatterLattice.test.ts'}
for r in d['code']:
    if r['path']not in allowed:assert sha(r['path'])==r['sha256'],r['path']
code=[bind(p)for p in dict.fromkeys([r['path']for r in d['code']]+sorted(allowed))]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=198,currentMainRelatedFailed=0,actualTestFiles=9,
 tests=bind(OUT/'lattice-related-r1-results.json'),execution=bind(OUT/'lattice-related-r1-execution.json'),
 types=bind(OUT/'types-lattice-types-r1.json'),typeRoots=4,lint=bind(OUT/'lattice-lint-r1-results.json'),lintRoots=4,
 actualCaptureSeal=bind(OUT/'capture-seal.json'),currentAPISpecimens=144,parentActualStrictSVGs=37,
 independentSolutions=bind(ind),independentBindings=bind(ind.parent/'own-bindings.json'),independentCurrentSVGReadbacks=36,
 independentComparison=bind(OUT/'independent-comparison-r1.json'),independentAnswersMatched=144,
 oldSourceExposureAcknowledged=True,pristineBlindClaim=False,
 baselineOutsideAPIUnchanged=80,baselineOutsideSetsUnchanged=16,
 visualReview=bind(OUT/'visual-review-r1.json'),measuredCJKFontApproved=False,
 existingQuestionOrDBWrites=0,newQuestionCredits=0)
validation=OUT/'lattice-push-validation-r1.json';assert not validation.exists()
validation.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
d.update(kind='exam-engine-upgrades-progress/v67',version=67,createdAt=now,previous=bind(old),code=code,
 report='docs/planning/tracks/reports/exam-engine-m5-scatter-lattice-20261022.md',currentMainRuntimeValidation=v)
d['m5ScatterLattice']=dict(status='NINE_FUTURE_GENERATORS_VERIFIED_COORDINATE_LISTS_RETAINED',scopeTypes=['06','07','08','09','10','11','12','14','15'],
 adapterVersion='20261022-scatter-five-point-grid-subject-axes-r1',familyIDsPreserved=True,
 gradeAndRightsApprovalCredits=0,validation=bind(validation),independentComparison=v['independentComparison'],
 actualAPISpecimens=144,parentActualStrictSVGs=37,independentSealedSolutions=144,independentSVGReadbacks=36,
 baselineOutsideAPIUnchanged=80,baselineOutsideSetsUnchanged=16,eachFamilySetCount=10,
 noStudentDistanceTrigOrCorrelationCoefficient=True,coordinateListsRetained=True,
 nextExplanations='12/15 coordinate-list connective wording to be corrected with final list-removal revision',
 persistedSpecCompatibilityReleaseHeld=True,questionApprovalCredits=0)
d['pendingM38']['activeNext']=['M5-M18-final-coordinate-list-removal-and-solution-wording-then-current-evidence-and-set-diversity','M4-conservative-label-ownership16','M14-mode1-EF-measurement-layout','remaining-original-cards','stored-spec-replay-release-contract']
d['items'].append(dict(id='U81',area='M5/M18 nine scatter lattice generators and subject axes',status='new-generators-verified-final-list-removal-pending',evidence='m5ScatterLattice',existingQuestionOrDBWrites=0))
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=v['tests'],passed=198,failed=0,actualFiles=9)
d['nextAuthorizedWork']=dict(instruction='Remove scatter coordinate lists only after preserving this verified revision, improve12/15 explanation connective wording, then rebind actual current output/math/SVG/adapter version and verify set diversity. Keep other layout/native/reader/grade/rights holds.',existingBankQuestionChanges=False,sourceRepositoryReadOnly=True,strictGradeAndCurriculumGateBeforeQuestionApproval=True,finalFigureReviewRetained=True,operationalDBOrDeploymentAuthorized=False)
assert d['currentCounts']==load(old)['currentCounts'] and not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],new.as_posix()),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=198,independentMatches=144,ownSVGReadbacks=36,newQuestionOrDBWrites=0)))
