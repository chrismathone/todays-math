from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;A=P/'own-execution-r2';E=P/'own-execution-r3'
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf8'))
j=read(E/'own-runtime-results.json');before=read(E/'own-before.json');after={f:sha(Path(f).read_bytes())for f in before};assert before==after
(E/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf8')
assert j['unique']==136 and not j['failed'] and all(r['passed']for r in j['results'])
old=read(A/'own-runtime-results.json');assert [r['id']for r in old['results']]==[r['id']for r in j['results']]
for n in ['own-runner.cjs','own-fixtures.json','own-new-invalid-fixtures.json']:assert (A/n).read_bytes()==(E/n).read_bytes()
lineage=read(E/'own-lineage.json');assert sha((A/'own-runtime-results.json').read_bytes())==lineage['r2RawResultsSHA'];assert sha((A/'own-report.json').read_bytes())==lineage['r2ReportSHA']
for f,h in j['actualRootImported'].items():assert sha(Path(f).read_bytes())==h
selected={r['id']:r for r in j['results']if r['id']in ['long-stack-must-preserve-or-reject-before-commit','exact-r1-8128-to8259-reject-preserves-original','invalid-existing:empty-existing-attribute:push','invalid-existing:empty-existing-attribute:pop','absent-stack-still-valid-push-pop']}
report={'status':'bounded actual current Root136/136 pass; R1 combined-limit and R2 explicit-empty defects resolved within same controls','NodeEnded':True,'actualUnique':136,'passed':136,'failed':0,'repeatedCohortNotNewQuestions':True,'same136InputsExpectationsRunnerBytes':True,'resolvedControls':selected,'r1R2RawFailuresUnchanged':True,'r2Commit':'4ac686d9dfa93686a6563c4f69004fd72da4889b','rootDelta':lineage['delta'],'sourceBinding':{'boundFilesIncluding41public':len(before),'beforeAfterEqual':True,'actualRootImported':j['actualRootImported'],'actualRuntimeResultSHA256':sha((E/'own-runtime-results.json').read_bytes())},'runtime':{'singleActualNodeCohort':True,'heapLimitBytes':j['heapLimitBytes'],'availablePreflightBytes':read(E/'own-go-freeze.json')['availableBytes'],'fakeFetchCalls':j['fakeFetchCalls'],'realNetworkCalls':j['realNetworkCalls'],'browser':0,'model':0,'API':0,'DB':0,'RootSourceDWrites':0},'limits':['Direct Root functions/jsdom, not full React errors/selection/undo/focus UI proof','Fake transport supplies controlled local asset bytes, not real public service or browser HTTP','No pixel math oracle; projected right mark is display-only','No grade/rights/source/native/loadability/public release approval','Parent suites/types/lint/browser results not counted'],'artifactSHA256':{f.name:sha(f.read_bytes())for f in E.iterdir()if f.is_file()and f.name!='own-report.json'}}
(E/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((E/'own-report.json').read_bytes()),'NodeEnded':True,'passed':136,'sourceUnchanged':True}))
