from pathlib import Path
import datetime,hashlib,json,subprocess
OUT=Path(__file__).resolve().parent
B=Path('.qa-artifacts/exam-resume-20261008')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text(encoding='utf-8'))
formatBinding=read(OUT/'eof-format-binding-r1.json')
def assert_validated(p,h):
    if sha(p)==h:return
    assert p==formatBinding['path']and h==formatBinding['validatedPreviousRawSHA256']and sha(p)==formatBinding['currentRawSHA256'],p
    previous=(OUT/formatBinding['previousSnapshot']).read_bytes()
    assert hashlib.sha256(previous).hexdigest()==h and previous.rstrip(b'\r\n')==Path(p).read_bytes().rstrip(b'\r\n')
def write(p,d):Path(p).write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode())
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
utc=datetime.datetime.now(datetime.timezone.utc).isoformat()
related=read(OUT/'port-related-r6-results.json');execution=read(OUT/'port-related-r6-execution.json')
browser=read(OUT/'browser/browser-results-port-browser-r7.json')
types=read(OUT/'types-port-types-r2.json');lint=read(OUT/'port-lint-r4-results.json')
assert related['success']and related['numPassedTests']==517 and related['numFailedTests']==0
assert len(related['testResults'])==20 and execution['sourcesUnchanged']
assert browser['success']and len(browser['results'])==4 and all(x['busyEditsBlocked']for x in browser['results'])
assert types['rootErrors']==0 and not types['globalDiagnostics']
assert len(lint)==11 and sum(x['errorCount']+x['warningCount']for x in lint)==0
assert read(OUT/'affordance-r1.json')['exitcode']==0
roots=read(OUT/'root-files.json')
for p,h in execution['sourceSHA256'].items():assert_validated(p,h)
for r in browser['code']:assert_validated(r['path'],r['sha256'])
for r in types['rootFiles']:assert_validated(r['path'],r['sha256'])
assert read(OUT/'port-lint-r4-execution.json')['sourcesUnchanged']
files=set(roots+['src/components/unified/figure-editor/FigureMathEditor.module.css','package.json','package-lock.json'])
files.update(p.as_posix()for p in Path('public/mathlive').rglob('*')if p.is_file())
files.update(Path(t['name']).resolve().relative_to(Path.cwd()).as_posix()for t in related['testResults'])
code=[{'path':p,'sha256':sha(p)}for p in sorted(files)]
wip='src/__tests__/unit/middleM3Stat2.test.ts'
patch=OUT/'preserved-m5-unverified.patch'
patch.write_bytes(subprocess.check_output(['git','diff','--binary','--unified=0','--',wip]))
validation={'utc':utc,'head':git('rev-parse','HEAD'),'main':git('rev-parse','origin/main'),'sourceSharedCommit':'129207fba40a6324cfc3c3fc365aee67c2e3bbb8','currentMainRelatedPassed':517,'currentMainRelatedFailed':0,'relatedFiles':20,'browserViewportsPassed':4,'realMathLive':'0.111.1','rootTypesChecked':11,'rootTypeErrors':0,'lintFiles':11,'lintErrors':0,'lintWarnings':0,'code':code,'postValidationEOFFinalization':formatBinding,'preservingDirtyPaths':[{'path':wip,'sha256':sha(wip),'patchPath':patch.as_posix(),'patchSHA256':sha(patch),'status':'unverified unrelated M5 WIP excluded from this production commit'}],'wholeNextBuildClaim':False,'sourceAppRegressionCountsNotParentEvidence':True,'deployed':False,'mainMergedFromFeature':False,'dbWrites':0,'questionEdits':0}
write(OUT/'final-validation-r1.json',validation)
write(OUT/'production-and-test-files-r1.json',code)
previous=B/'engine-upgrades-progress-r68.json';progress=read(previous)
progress.update(kind='exam-engine-upgrades-progress/v69',version=69,createdAt=utc,previous={'path':previous.as_posix(),'sha256':sha(previous)},report='docs/planning/tracks/reports/exam-engine-editor-final-20261022.md')
progress['latestUserDirection']='Finish todays-math shared editor port from public source129207f, verify and push feature; source/native app owners handle their deployments. Preserve host apply and existing engine WIP. No admin/server/IP/public recent import.'
progress['sharedEditorFinal']={'status':'IMPLEMENTED_AND_BOUNDED_VERIFIED_FEATURE_CHECKPOINT','sourceCommit':validation['sourceSharedCommit'],'templates':123,'relatedTestsPassed':517,'relatedFiles':20,'browserViewportsPassed':4,'typesRootFiles':11,'rootTypeErrors':0,'lintErrors':0,'lintWarnings':0,'PNGExportEventIncluded':True,'hostSVGSaveAndAsyncApplyPreserved':True,'sourceRepoWrites':0,'validation':{'path':(OUT/'final-validation-r1.json').as_posix(),'sha256':sha(OUT/'final-validation-r1.json')},'upstreamCandidate':{'path':(OUT/'upstream-input-fixes-unidiff-zero-r2.patch').as_posix(),'sha256':sha(OUT/'upstream-input-fixes-unidiff-zero-r2.patch'),'applyCheckOnly':True,'sourceAppTestsNotRunByParent':True,'inertAlreadySourceAuthorOwned':True,'warningClearWasPortDifference':True},'wholeNextBuildClaim':False,'newQuestionApprovals':0}
progress['checkpointDelta']={'sharedEditorFinal':True,'newAuthoredProblems':0,'newFiguresForCandidates':0,'newImagegenRasters':0,'newGradeOrRightsApprovals':0,'operationalLoads':0,'M5WIPPreservedUnverified':True}
existing={r['path']:r for r in progress['code']}
for p in list(existing):
    if Path(p).is_file():existing[p]['sha256']=sha(p)
for r in code:existing[r['path']]=r
progress['code']=list(existing.values())
progress['wholeEngineComplete']=False;progress['wholeExtractionComplete']=False;progress['deployed']=False;progress['dbWrites']=0
progress['upcomingWork']=['Finish current M5 picture-only regression refresh and current-SVG rebind; preserve sealed144 answers.','M4 ownership16 and M14 EF layout10 remain individually held.','Audit and finish other engine cards; do not equate shared editor completion with whole engine completion.']
report=Path(progress['report']);assert report.exists()
progress['sharedEditorFinal']['reportSHA256']=sha(report)
dest=B/'engine-upgrades-progress-r69.json';write(dest,progress)
index=read(B/'continuation-index.json')
index['latestEngineCheckpoint']={'utc':utc,'progress':dest.as_posix(),'sha256':sha(dest),'scope':'shared editor final123 structures/PNG/frame/group/clipboard port; M5 unverified WIP and all grade/rights holds preserved; existing questions and DB unchanged','canonicalIndex':'.qa-artifacts/exam-resume-20261008/current-authored-batches-v50.json','legacyExecutionCountsAreHistorical':True,'allEngineOrExtractionComplete':False}
write(B/'continuation-index.json',index)
print(json.dumps({'relatedPassed':517,'browserPassed':4,'typesErrors':0,'lintErrors':0,'validatedFiles':len(code),'progress':str(dest),'preservedM5SHA256':sha(wip)}))
