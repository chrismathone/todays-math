from pathlib import Path
import copy,datetime,hashlib,json,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');OUT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind=lambda p:dict(path=str(p).replace('\\','/'),sha256=sha(p))
old=B/'engine-upgrades-progress-r58.json';new=B/'engine-upgrades-progress-r59.json'
assert not new.exists()
d=copy.deepcopy(json.loads(old.read_text(encoding='utf-8')))
assert sha(d['canonicalIndex']['path'])==d['canonicalIndex']['sha256']
tests=OUT/'asset41-r1-results.json';e=OUT/'asset41-r1-execution.json'
t=json.loads(tests.read_text(encoding='utf-8'));execution=json.loads(e.read_text(encoding='utf-8'))
assert t['success'] and t['numPassedTests']==337 and not t['numFailedTests'] and len(t['testResults'])==11
assert execution['exitcode']==0 and execution['sourcesUnchanged']
for p,digest in execution['sourceSHA256'].items():assert sha(p)==digest,p
types=OUT/'types-assets41-r1.json';lint=OUT/'asset41-lint-r1-results.json'
assert json.loads(types.read_text(encoding='utf-8'))['rootErrors']==0
assert sum(r['errorCount']+r['warningCount'] for r in json.loads(lint.read_text(encoding='utf-8')))==0
ind=B/'assets41-current-scene-audit-20261021-r1/own-report.json'
i=json.loads(ind.read_text(encoding='utf-8'));assert i['passed']==81 and i['failed']==0 and i['sourceHashesUnchanged']
for p,digest in json.loads((ind.parent/'own-after.json').read_text(encoding='utf-8')).items():assert sha(p)==digest,p
eight=OUT/'eight-raw-results.json';r=json.loads(eight.read_text(encoding='utf-8'))
assert len(r['cases'])==8 and all(c['rawBytesMatch'] for c in r['cases'])
for p,digest in r['codeSHA256'].items():assert sha(p)==digest,p
changed=subprocess.check_output(['git','diff','--name-only'],text=True,stderr=subprocess.DEVNULL).splitlines()
newcode=['src/lib/figure/asset-editor-geometry-legacy-20261021.json','src/__tests__/fixtures/figure-assets-legacy-20261021.json',
         'scripts/figure/assets/building-3d.svg','scripts/figure/assets/house-3d.svg']
code=[bind(p) for p in dict.fromkeys([r['path'] for r in d['code']]+changed+newcode)]
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
v=dict(utc=now,head=head,main=main,code=code,currentMainRelatedPassed=337,currentMainRelatedFailed=0,actualTestFiles=11,
       tests=bind(tests),execution=bind(e),independent=bind(ind),independentPythonControls=81,pythonTests=65,
       pythonExecution=bind(OUT/'python65-execution.json'),types=bind(types),typeRoots=2,lint=bind(lint),lintRoots=2,
       exactEight=bind(eight),sourceCommit='4ccb0cb',existingQuestionOrDBWrites=0)
(OUT/'push-validation-r1.json').write_bytes((json.dumps(v,indent=2)+'\n').encode('utf-8'))
d.update(kind='exam-engine-upgrades-progress/v59',version=59,createdAt=now,previous=bind(old),code=code,
         report='docs/planning/tracks/reports/exam-engine-assets41-20261021.md',currentMainRuntimeValidation=v)
d['assets41']=dict(status='IMPLEMENTED_BOUNDED_CURRENT_AND_LEGACY_EDITING',currentAssets=41,pictureAllowed=25,legacyIdentities=39,
    dataSourceCommit='5990a0d',finalDeliveredEngineCommit='4ccb0cb',rawEightMatches=8,independent=bind(ind),
    parentTests=337,parentPythonTests=65,independentControls=81,validation=bind(OUT/'push-validation-r1.json'),
    identityNotRightsOrGradeApproval=True,serializedAlignmentUniversalityClaim=False,
    unversionedStoredSpecReplayNeedsSeparateGate=True,existingQuestionsOrDBWrites=0)
d['sourceExportEvolution']['currentRootStocks']=41
d['sourceExportEvolution']['finalCommitted07And08']='4ccb0cb'
d['sourceExportEvolution']['oldMutableExportRecordsAreHistorical']=True
d['figureEngineAllSync']['laterSourceAssets41PendingSeparateImport']=False
d['figureEngineAllSync']['outputContract']='versioned final07/4ccb0cb, actual raw8/8; historical06 expectations unchanged'
d['items'].append(dict(id='U73',area='Versioned41 assets, front-edge placement, bounded shrink and legacy39 editor frames',
    status='implemented-bounded-release-gates-remain',evidence='assets41',existingQuestionOrDBWrites=0))
d['latestMainIntegration']=dict(main=main,headAtCheck=head,tests=bind(tests),passed=337,failed=0,actualFiles=11)
d['nextAuthorizedWork']=dict(instruction='Integrate final08 editor menu/nested groups/perspective with current security and review contracts; continue remaining engine cards',
    existingBankQuestionChanges=False,finalFigureReviewRetained=True,strictGradeAndCurriculumGateBeforeQuestionApproval=True,
    sourceRepositoryReadOnly=True,operationalDBOrDeploymentAuthorized=False)
assert not d['wholeEngineComplete'] and d['dbWrites']==0 and d['operationalLoads']==0
new.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
index=B/'continuation-index.json';raw=index.read_bytes();prior=json.loads(raw)['latestEngineCheckpoint']
for a,z in [(prior['utc'],now),(prior['progress'],str(new).replace('\\','/')),(prior['sha256'],sha(new))]:
    assert raw.count(a.encode())==1;raw=raw.replace(a.encode(),z.encode(),1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new),boundCode=len(code),tests=337,independent=81,exactRaw=8,dbWrites=0)))
