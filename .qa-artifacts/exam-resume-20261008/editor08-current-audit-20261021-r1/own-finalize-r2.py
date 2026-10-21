from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;A=P/'own-execution-r1';E=P/'own-execution-r2'
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf8'))
j=read(E/'own-runtime-results.json');old=read(A/'own-runtime-results.json');before=read(E/'own-before.json');after={f:sha(Path(f).read_bytes())for f in before};assert after==before
(E/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf8')
assert j['unique']==136 and len(j['failed'])==2
assert {r['id']for r in j['failed']}=={'invalid-existing:empty-existing-attribute:push','invalid-existing:empty-existing-attribute:pop'}
ids={r['id']:r for r in j['results']};assert all(ids[r['id']]['passed']for r in old['results'])
lineage=read(E/'own-lineage.json');assert sha((A/'own-runtime-results.json').read_bytes())==lineage['r1RawResultsSHA256'];assert sha((A/'own-report.json').read_bytes())==lineage['r1ReportSHA256'];assert (A/'own-fixtures.json').read_bytes()==(E/'own-fixtures.json').read_bytes()
assert len(j['actualRootImported'])==33
report={
 'status':'R1 combined-limit defect resolved under same114 controls; R2 remains narrow technical HOLD for empty existing attribute mutators',
 'NodeEnded':True,'actualUnique':136,'passed':134,'failed':2,
 'cohorts':{'original114':{'executed':114,'passed':114,'failed':0},'new22':{'executed':22,'passed':20,'failed':2}},
 'R1Resolution':{'rawR1FailuresPreserved':True,'actualOriginalLoopNow':ids['long-stack-must-preserve-or-reject-before-commit'],'exact8128To8259Case':ids['exact-r1-8128-to8259-reject-preserves-original'],'controlsUnchanged':True,'noNewBlindOrQuestionCounts':True},
 'newRejections':'Malformed JSON/object/literal null/65 depth/129-character name/non-string/unsafe name/over8192/whitespace existing metadata reject on both push/pop; successful rejection controls verify original cached SVG, mathematical coords and object numbers unchanged. Absent attribute still supports valid push/pop.',
 'remainingFinding':{'id':'E08-EMPTY-EXISTING','severity':'bounded input-contract/metadata ambiguity; not a demonstrated nonempty-history loss or math/DB corruption','failedControls':j['failed'],'input':'Existing data-group=CURRENT with data-group-stack="" on a selected ordinary math line. Unchanged raw fixture base and exact runner reconstruct the input.','cause':'parseGroupStack if(!value)return[] treats empty present attribute the same as null/undefined absence. editableGroupStack therefore does not reject it.','expected':'Absent=null/undefined may be[]; explicitly present unparseable empty value should reject before mutation under the strict existing-metadata contract.','recommendation':'Use null/undefined-only absence test or explicitly document/justify a separate empty-attribute normalization policy; do not silently amend current audit expected rejection.','preservationLimitation':'The two failing assert.throws controls stop before post-rejection preservation assertions. Preservation is verified for the other18 invalid-mutator controls and exact overflow rejection; do not claim successful rejection/immutability for failed empty cases.'},
 'sourceBinding':{'filesIncludingPublicAssets':len(before),'beforeAfterUnchanged':True,'freshPreparedDelta':read(E/'own-execution-delta.json'),'actualRootImports33':j['actualRootImported'],'fixturesByteIdenticalR1':True,'newFixtureSHA256':sha((E/'own-new-invalid-fixtures.json').read_bytes()),'actualResultSHA256':sha((E/'own-runtime-results.json').read_bytes())},
 'runtime':{'actualNodeCohortProcesses':1,'heapLimitBytes':j['heapLimitBytes'],'availablePreflightBytes':read(E/'own-go-freeze.json')['availableBytes'],'realNetworkCalls':j['realNetworkCalls'],'fakeFetchCalls':j['fakeFetchCalls'],'browser':0,'model':0,'API':0,'DB':0,'SourceDOrRootWrites':0},
 'limits':['Actual direct Root functions/jsdom only; no full React error-display/undo-step/focus/fake-selection UI execution','Current Root UI improvements and parent580 tests/types/lint are parent evidence, not these136 controls','Projected perspective path is display only, no actual spatial right-angle proof','No source/grade/rights/native/operational approval','No production self-fix or expectation relaxation; raw R1 and R2 failures retained'],
 'artifactSHA256':{f.name:sha(f.read_bytes())for f in E.iterdir()if f.is_file()and f.name!='own-report.json'}
}
(E/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((E/'own-report.json').read_bytes()),'NodeEnded':True,'passed':134,'failed':2,'R1Original114NowAllPass':True}))
