"""Seal scoped arrow evidence; retain unrelated generator WIP as pending."""
from pathlib import Path
import datetime,hashlib,json,re,subprocess
B=Path('.qa-artifacts/exam-resume-20261008');O=Path(__file__).resolve().parent
read=lambda p:json.loads(Path(p).read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
receipt=lambda p:{'path':Path(p).as_posix(),'sha256':sha(p)}
git=lambda *a:subprocess.check_output(['git',*a],text=True,encoding='utf-8').strip()
write=lambda p,j:Path(p).write_bytes((json.dumps(j,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
report=Path('docs/planning/tracks/reports/exam-engine-arrow-sync-20261022.md')
unit=read(O/'arrow-related-r4-results.json');browser=read(O/'browser-results-r2.json')
assert unit['numPassedTests']==383 and unit['numFailedTests']==0 and len(unit['testResults'])==17
assert browser['success'] and all(r['nativePixels']['differentPixels']==0 for r in browser['results'])
assert not read(O/'dom-types-r1.json')['diagnostics']
assert all(not r['errorCount'] and not r['warningCount'] for r in read(O/'arrow-lint-r1-results.json'))
for name in ['arrow-related-r4-execution.json','arrow-lint-r1-execution.json','arrow-browser-r2-execution.json']:
    e=read(O/name);assert e['sourcesUnchanged'] and e['exitcode']==0
    for p,h in e['sourceSHA256'].items():assert sha(p)==h,p
files=['scripts/figure/graph_scene.py','scripts/figure/elementary.py','scripts/figure/figure_assets.py',
       'vendor/figure-engine/core/figure_quality.py',*read(O/'root-files.json')]
code=[receipt(p)for p in dict.fromkeys(files)]
main=git('rev-parse','origin/main')
paths=git('diff','--name-only','d717c0ee2306325f00d686dc40fc12cf33125122',main).splitlines()
assert len(paths)==4
for p in paths:assert subprocess.check_output(['git','show','HEAD:'+p])==subprocess.check_output(['git','show',main+':'+p]),p
v={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD'),'main':main,
   'scope':'arrow-only native/editor import regressions; not whole generator final validation','code':code,
   'currentMainRelatedPassed':383,'currentMainRelatedFailed':0,'currentRelatedTestFiles':17,
   'currentTypes':receipt(O/'dom-types-r1.json'),'lintFiles':4,'browser':receipt(O/'browser-results-r2.json'),
   'native':receipt(O/'native-results-r2.json'),'sourceCommit':'69d134beb0efcaf29bc20f788929571198efcaca',
   'sourceRepoWrites':0,'issuedQuestionEdits':0,'dbWrites':0,'latestMainPathsPreserved':paths,'wholeEngineComplete':False,
   'unrelatedM5FinalPending':{'priorRelatedPassed':194,'priorRelatedFailed':5,'reason':'Old tests still read removed body coordinate lists. Separate follow-up; arrow checkpoint does not certify M5 final.'}}
write(O/'push-validation-r1.json',v)
p=read(B/'engine-upgrades-progress-r67.json')
p.update(kind='exam-engine-upgrades-progress/v68',version=68,createdAt=v['utc'],previous=receipt(B/'engine-upgrades-progress-r67.json'),report=report.as_posix())
p['checkpointDelta']={'arrowOnly':True,'sourceCommit':v['sourceCommit'],'independentAuditCommit':'62b1147ef','sourceRepoWrites':0,'manualQuestionOrApprovalCredits':0}
p['delta']='Arrow-only source synchronization. Existing M5 final pending regression refresh remains separate; no question/approval/DB delta.'
existing={r['path']:r for r in p['code']}
for r in code:existing[r['path']]=r
for name,r in existing.items():
    if Path(name).exists():r['sha256']=sha(name)
p['code']=list(existing.values())
p['arrowSync']={'status':'IMPLEMENTED_SCOPED_NATIVE_DOM_BROWSER_CHECKS_PASSED','sourceCommit':v['sourceCommit'],
    'validation':receipt(O/'push-validation-r1.json'),'report':receipt(report),'nativeSamples':7,'browserSamples':7,
    'differentPixels':0,'relatedTests':383,'nativeSecurityNegatives':8,
    'localGuards':['rootID','presentationAndClipContext','nonRenderingSubtrees'],
    'unmarkedHistoricalSVGsUnchanged':True,'sourceFrozenRawBytesEqual':7,'sourceFrozenWrapperOnlyEqual':8,'questionApprovalCredits':0}
for name in ['m5ScatterInputIdentity','m5ScatterGrid','m5ScatterLattice']:
    p[name]['historicalValidatedStage']=True;p[name]['currentRuntimeSupersededBy']='m5ScatterFinal'
p['m5ScatterFinal']={'status':'PICTURE_ONLY_LOCAL_IMPLEMENTATION_FRESH_INDEPENDENT144_PASSED_RELATED_TEST_REFRESH_PENDING',
    'adapterVersion':'20261022-scatter-grid-reading-without-coordinate-lists-r2','coordinateListsRetained':False,
    'freshStudentOnlySVGInputs':144,'independentSealedSolutions':144,'afterSealAnswerAndPointSetMatches':144,
    'priorRelatedPassed':194,'priorRelatedFailed':5,
    'hold':'Five legacy parsers expect body coordinate lists. Final M5 checkpoint pending; arrow tests do not resolve this.','newQuestionApprovals':0}
p['latestMainIntegration']={'main':main,'featureMergeCommit':'261d1e98d','preservedMainPaths':paths,'mainOrProductionModified':False}
p['currentMainRuntimeValidation']={'scope':v['scope'],'validation':receipt(O/'push-validation-r1.json'),'M5FinalNotCertified':True}
p.update(newAuthoredProblems=0,newImagegenRasters=0,wholeEngineComplete=False,wholeExtractionComplete=False,dbWrites=0,operationalLoads=0,deployed=False)
new=B/'engine-upgrades-progress-r68.json';assert not new.exists();write(new,p)
index=B/'continuation-index.json';s=index.read_text(encoding='utf-8');j=json.loads(s)
checkpoint={**j['latestEngineCheckpoint'],'utc':v['utc'],'progress':new.as_posix(),'sha256':sha(new),
    'scope':'arrow-only import; existing engine WIP/grade/rights holds preserved; issued/bank questions and DB unchanged'}
old=re.search(r'  "latestEngineCheckpoint": \{[^}]*\}',s);assert old
block='  "latestEngineCheckpoint": '+json.dumps(checkpoint,ensure_ascii=False,indent=2).replace('\n','\n  ')
s2=s[:old.start()]+block+s[old.end():];j2=json.loads(s2)
assert {k:x for k,x in j.items()if k!='latestEngineCheckpoint'}=={k:x for k,x in j2.items()if k!='latestEngineCheckpoint'}
index.write_bytes(s2.encode('utf-8'))
write(O/'checkpoint-status-r1.json',{'validation':receipt(O/'push-validation-r1.json'),'progress':receipt(new),
    'report':receipt(report),'canonicalCountsUnchanged':p.get('currentCounts'),'authoredApprovalAndDBDelta':0,'wholeGoalComplete':False})
print(json.dumps({'arrowTests':383,'browser':7,'pixelDiff':0,'domTypes':2,'lint':4,'progress':new.as_posix(),'mainPreservedPaths':len(paths),'M5FinalStillPending':True}))
