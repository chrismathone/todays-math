from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;E=P/'own-execution-r1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(n):return json.loads((E/n).read_text(encoding='utf8'))
before=read('own-before.json');after={p:sha(Path(p).read_bytes()) for p in before};assert before==after
(E/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf8')
results=read('own-runtime-results.json');assert results['unique']==42 and results['passed']==42 and not results['failed']
mem=read('own-go-memory.json');assert mem['availableBytes']>=1610612736
prior=json.loads((P/'own-fixtures.json').read_text(encoding='utf8'));current=read('own-fixtures.json');assert prior['gray']==current['gray']
for name,h in read('own-prepared-input-hashes.json').items():assert sha((E/name).read_bytes())==h
report={
 'status':'bounded direct-function audit passed; browser/integration/semantic approval outside scope',
 'NodeEnded':True,'uniqueRuntimeControls':42,'passed':42,'failed':0,
 'cohorts':{'actualGrayFixturesWithRepeatAndImmutability':14,'invalidInputContracts':15,'containLandscapePortraitSquareRationalCoordinates':5,'forgedOverlayRejections':6,'newCountAndSpaceRejections':2},
 'independence':'Own fixtures and rational expectations; no parent tests or browser count included. Repeats are assertions inside42 controls, not extra unique counts. No new question/blind/math approval counts.',
 'runtime':{'actualModule':results['modulePath'],'firstImportedResolvedModule':results['imported'],'moduleSHA256':results['moduleSHA256'],'heapLimitBytes':results['heapLimitBytes'],'availablePreflightBytes':mem['availableBytes'],'singleProcessAtATime':True,'sourceDExecution':0,'browser':0,'API':0,'DB':0},
 'delta':read('own-delta.json'),
 'coordinates':'Fresh rational expected contain804/inset48, rounded analysis900 max-side, landscape/portrait/square and nonuniform rounded dimensions. Actual helper coordinates match rational projections; does not execute browser pixel-center/antialias/resampling.',
 'guardResults':'Current exact coordinateSpace and minimum3 cells reject the formerly pending synthetic observations. Old preparation expectations/results remain untouched, never counted as historical runtime failures.',
 'graySemantics':'Pixel-identical table and grid produce same measured grid. This is expected ambiguity, not graph-paper semantic approval. Returned kind remains heuristic-only/requiresReview:true without passed/approved. Original arrays unchanged, repeated results identical.',
 'staticOnlyBoundaries':{'layout':'figure-comparison current CSS observed legend13/20 and tick13/16; no independent rendered text-overlap/viewport proof','review':'Existing parseReview retains false and contradictory issues cannot turn true; final source-and-rendered-images review remains; timeout fallback false, no automatic snapping in scoped path','preservation':'No source dataURL/SVG input rewrite or production writes performed; derived annotations only','cancel':'Request abort/page-finally/timeout read statically only; no actual browser/model cancellation execution'},
 'sourceHashesBeforeAfterEqual':True,'sourceMetadataFilesBound':len(before),
 'harnessDiagnostic':'First sequential Node launch omitted --go and guard stopped before imports/controls; source-free harness failure retained. Corrected launcher argument, no control expectations or production code changed. Actual cohort executed once.',
 'limitations':['No actual gray browser decoding/resampling canvas','No screenshot/full UI/legend overlap verification','No final model review or timeout/cancel integration execution','No arbitrary accessor/proxy sandbox claim','No grade/rights/native/public release/math correctness approval'],
 'artifactHashes':{f.name:sha(f.read_bytes()) for f in E.iterdir() if f.is_file()},
 'preparationUnchanged':True
}
(E/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((E/'own-report.json').read_bytes()),'NodeEnded':True,'unique':42,'passed':42,'sourcesUnchanged':True}))
