from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
j=json.loads((P/'own-results.json').read_text(encoding='utf8'))
before=json.loads((P/'own-before.json').read_text(encoding='utf8'))
assert all(sha(Path(p).read_bytes())==h for p,h in before.items())
worst=min(({'specSHA256':k,**a,'minimum':min(a['margins'].values())} for k,c in j['current']['checks'].items() for a in c['arcs']),key=lambda a:a['minimum'])
historical=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/.qa-artifacts/exam-resume-20261008/m28-current-api-audit-20261021-r1/own-native-svg')
normalized=sum(sha((historical/(k+'.svg')).read_bytes().replace(b'\r\n',b'\n'))==c['sha256'] for k,c in j['current']['checks'].items())
assert normalized==64
report={
 'scope':'M28 serialized angle arc centerline precision, Python-only, no current API/Node replay',
 'status':'current strict containment technical HOLD; precision-only candidate insufficient; inward-trim candidate bounded geometry pass, integration pending',
 'executed':{'uniqueHistoricalSpecs':64,'actualCurrentPythonRenderCalls':192,'variantsPerSpec':3,'newAPIOrStudentSolves':0,'zeroTolerance':True},
 'summary':{k:{f:v[f] for f in ['count','strictCountZeroTolerance','minimumSignedDistance']} for k,v in j.items()},
 'historicalBinding':{'rawByteMatches':0,'LFNormalizedMatches':normalized,'reason':'Historical copied SVGs are CRLF; current render strings are LF. Raw inequality retained; no geometry/text differences after LF normalization.'},
 'worstCurrentSerializedArc':worst,
 'cause':[
 'figure_scene renders polygon line endpoints through _fmt (3 decimal digits), but calls imported figure_svg.angle_arc with unrounded vertex/ray floats.',
 'figure_svg.arc serializes M and A endpoint coordinates with .1f while retaining an unrounded radius. SVG reconstructs a different circle from these rounded endpoints and radius; its center need not equal the polygon vertex.',
 'The discrepancy affects incident boundaries. More endpoint precision reduces but does not remove disagreement with separately rounded line vertices. No pixel measurements or generator answers were used.'
 ],
 'candidate':{
 'precisionOnly':'QA in-memory arc formatter .1f to .6f; 0/64 strict, worst -0.0005379802490440363. Do not adopt as a complete repair.',
 'boundedOptIn':'QA-only align center/rays to the same rounded3 boundary coordinates; trim minor arc by 1e-5 radians at each end; output endpoints6 decimals. All actual serialized circles/extrema remain strictly inside all four halfplanes (positive minimum about0.000075).',
 'notTolerance':'The positive geometric angular gap changes mark endpoints. Checker uses signed distance>=0, not a relaxed acceptance tolerance. Stationary-angle membership uses existing numerical inclusion guard; it cannot turn negative distances into pass.',
 'limits':'Six-decimal endpoint rounding still perturbs circle center. This is a bounded64-case witness, not a proof for arbitrary scale/angles or stroke envelopes. Arc no longer touches the two rays; parent must explicitly accept mark semantics and visual impact.',
 'integrationRecommendation':'Do not globally replace figure_svg.arc formatting. If adopted, introduce an explicit opt-in angle-mark policy at the M28 scene boundary, preserving the existing default and coordinate collision/sample policy. Keep A/C equal marks, labels, radius and statement untouched. Renderer collision sampling should reflect any changed mark geometry.',
 'productionApplied':False
 },
 'boundaries':{
 'mathRNG':'No TypeScript handler, stem, answer, solution, parameters, RNG call or student method changed. Current m2Quad/adapters bytes bound before/after; no new TypeScript/API execution in this scope.',
 '08Default':'Not replayed in Python-only scope. A global arc formatter changes shared bytes and risks08/default callers. Proposed opt-in must default to existing behavior; actual08 byte regression remains required after integration.',
 'sixExactFixtures':'Not independently rerun here. A global .6f formatter can change exact SVG bytes; keep six fixtures on old default branch and run actual six raw-byte checks before any merge. No fixture approval inferred from M28 geometry.',
 'circleBoundary':'Actual SVG endpoint-to-center circular-arc reconstruction and analytic endpoint/stationary extrema against each serialized polygon line; positive nonincident clearance distinct from incident endpoint errors.',
 'strokeAndVisual':'Centerline only. Stroke thickness, raster/print, readability and tiny-angle label layout not approved.',
 'gradeUnitRightsNativeOperational':False
 },
 'sourceHashesBeforeAfterUnchanged':True,'boundFileCount':len(before),
 'importedClosure':json.loads((P/'own-first-import-closure.json').read_text(encoding='utf8')),
 'harnessDiagnostic':'Initial own spelling utf8-sig failed before cohort; corrected to utf-8-sig. Preserved in own-harness-diagnostic.txt, not a production failure.',
 'environment':{'sourceDExecution':0,'rootWrites':0,'node':0,'browser':0,'DB':0,'API':0,'network':0},
 'artifacts':{p.name:sha(p.read_bytes()) for p in P.iterdir() if p.is_file() and p.name!='own-report.json'}
}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'boundFileCount':len(before),'currentLFNormalizedSameHistorical':True}))
