from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;E=P/'own-execution-r1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(n):return json.loads((E/n).read_text(encoding='utf8'))
j=read('own-runtime-results.json');before=read('own-before.json');after={p:sha(Path(p).read_bytes())for p in before};assert before==after
(E/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf8')
assert j['unique']==114 and len(j['failed'])==1 and j['failed'][0]['id']=='long-stack-must-preserve-or-reject-before-commit'
assert len(j['actualRootImported'])==33
for f,h in j['actualRootImported'].items():assert sha(Path(f).read_bytes())==h
name=lambda i:str(i).zfill(3)+'G'*125
prior=[None]+[name(i)for i in range(62)];nextstack=prior+[name(62)]
raw=lambda a:json.dumps(a,separators=(',',':'))
assert len(raw(prior))==8128 and len(raw(nextstack))==8259
(E/'own-failing-stack-input.json').write_text(json.dumps({'source':'Deterministic reconstruction of own executed loop inputs; expected serialized metadata, not a captured DOM dump','beforePushDepth':63,'beforePushCurrentGroup':name(62),'beforePushJSON':raw(prior),'beforePushJSONChars':len(raw(prior)),'newGroupName':name(63),'expectedNewJSON':raw(nextstack),'expectedNewJSONChars':len(raw(nextstack)),'actualDOMObserved':'push returned without throwing, subsequent readGroupStack returned length0, expected64','originalExpectation':'Must preserve full stack or reject before producing next commit; remains failed'},indent=2),encoding='utf8')
report={
 'status':'TECHNICAL HOLD: long nested group history silently becomes unreadable; other113 bounded controls pass',
 'NodeEnded':True,'actualUnique':114,'passed':113,'failed':1,
 'cohorts':{'fakeFetchIntegrityRetryCache':4,'legacyOwnFrames':39,'current41Insertion':41,'insertionInvalidContracts':8,'stackReaderBounds':5,'nestedBasic':1,'longStackHold':1,'typedPerspective':5,'projectedVsFlat':1,'unknownFetchNoService':1,'partialUngroup':1,'depth64ShortNames':1,'numberedCommitResume':1,'sizeLock':1,'groupNameReject':4},
 'finding':{'id':'E08-STACK-SERIALIZED-LIMIT','actualFailure':j['failed'][0],
 'actualSequence':'Start ordinary2-objectSVG, repeatedly push same math object with128-character safe group names; first saved previous-group is null. At64th push, prior63-layer JSON8128 chars becomes64-layer JSON8259 chars. Depth guard permits it, but subsequent read rejects>8192 and returns[].',
 'staticVsRuntime':'Prior static8123->8254 witness uses all-string entries. Actual DOM starts null and reaches8128->8259 at64th push; same combined-length defect, recorded separately, no force-fit.',
 'impact':'Grouping-history metadata becomes unreadable, so later push/pop may silently lose provenance. This does not by itself show coordinate/answer/DB corruption.',
 'minimalRecommendation':'Check complete proposed JSON.length<=8192 BEFORE committing any mutated result. Distinguish absent stack from invalid existing stack; push/pop must reject invalid/overlong/corrupt existing metadata instead of interpreting it as empty. Preserve original SVG on failure.',
 'pendingNegative':'Reader rejects invalid formats tested; actual mutation push/pop with preexisting invalid metadata not independently executed in this run. Source shows readGroupStack fallback[] flows into both mutators, requiring separate repair regression.'},
 'sourceBinding':{'initialToAfterEqual':True,'filesIncludingPublicAssets':len(before),'actualRootModulesImported':j['actualRootImported'],'fixtureSHA256':sha((E/'own-fixtures.json').read_bytes()),'runtimeResultSHA256':sha((E/'own-runtime-results.json').read_bytes())},
 'runtime':{'heapLimitBytes':j['heapLimitBytes'],'preflightAvailableBytes':read('own-go-freeze.json')['availableBytes'],'NodeProcessesActualCohort':1,'browser':0,'SourceDExecution':0,'realNetworkCalls':j['realNetworkCalls'],'fakeFetchCalls':j['fakeFetchCalls'],'DB':0,'model':0},
 'positiveEvidence':['41 current stock bodies fetched only from controlled local fixture responses then inserted through actual Root module; base math line/value coordinates unchanged','39 old identities recognized with each own historical viewBox','Invalid body/slug/viewBox/center/ID collision rejected','Actual nested and selected-subset ungroup, short-name64-depth guard and lock checks passed','Actual typed perspective rejects nonboolean/right absent, planar mismatched right rejects; projected display path is not math-right-angle evidence','Actual numbered commit/reimport preserves object numbers and registered geometry; transient IDs may be reassigned by prepare'],
 'harnessAdaptation':read('own-delta.json'),
 'limits':['Direct function/jsdom only, no full React keyboard/focus/undo/redo/history UI','Fake transport intentionally supplies Root local bytes; not HTTP/browser fetch or public deployment proof','No image/pixel mathematical oracle','No semantic source/grade/rights/native/operational approvals','Parent577tests/browser4 are not included','Current failure not fixed or relabeled, production unchanged'],
 'preparedEvidenceUnchanged':True,
 'artifactSHA256':{f.name:sha(f.read_bytes())for f in E.iterdir()if f.is_file()and f.name!='own-report.json'}
}
assert sum(report['cohorts'].values())==114
(E/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((E/'own-report.json').read_bytes()),'NodeEnded':True,'passed':113,'failed':1,'sourceUnchanged':True}))
