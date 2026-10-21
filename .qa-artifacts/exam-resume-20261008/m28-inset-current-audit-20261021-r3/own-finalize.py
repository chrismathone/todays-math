from pathlib import Path
import ast,json,hashlib,difflib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');old=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m28-inset-geometry-20261021-r3/before'
sha=lambda b:hashlib.sha256(b).hexdigest()
j=json.loads((P/'own-results.json').read_text(encoding='utf8'));before=json.loads((P/'own-before.json').read_text(encoding='utf8'));assert all(sha(Path(f).read_bytes())==h for f,h in before.items())
assert j['strictPassed']==64 and all(c['rejected']for c in j['negativeControls'])and len(j['negativeControls'])==22 and all(c['rawSame']and c['exit']==0 for c in j['default8ActualCLI'])
funcs={}
for name in ['arc','angle_arc']:
 texts=[]
 for path in [old/'vendor/figure-engine/core/figure_svg.py',R/'vendor/figure-engine/core/figure_svg.py']:
  text=path.read_text(encoding='utf8');node=next(n for n in ast.parse(text).body if isinstance(n,ast.FunctionDef)and n.name==name);texts.append(ast.get_source_segment(text,node))
 funcs[name]={'oldFunctionSHA':sha(texts[0].encode()),'currentFunctionSHA':sha(texts[1].encode()),'sameSource':texts[0]==texts[1]};assert texts[0]==texts[1]
oldts=(old/'src/lib/middle/m2Quad.ts').read_text(encoding='utf8');newts=(R/'src/lib/middle/m2Quad.ts').read_text(encoding='utf8');diff=list(difflib.unified_diff(oldts.splitlines(),newts.splitlines(),lineterm=''))
static={'defaultFunctions':funcs,'m2QuadSourceDiff':diff,'m2QuadOnlyFlagInsertion':newts.replace(', serialized_inset: true','')==oldts,'adapterLine':[s for s in (R/'src/lib/examStudy/adapters.ts').read_text(encoding='utf8').splitlines()if '2-2|평행사변형|15A' in s]}
(P/'own-source-delta.json').write_text(json.dumps(static,ensure_ascii=False,indent=2),encoding='utf8')
report={
 'status':'bounded actual production inset render/sampling/default contracts passed; not full engine or student approval',
 'actualExecution':{'flaggedNativeSpecs':64,'defaultSameSpecsForNonArcComparison':64,'analyticSerializedArcs':128,'actualSamplerComparisons':128,'negativeUniqueControls':22,'negativeRejected':22,'defaultCLIRawFixtures':8,'defaultCLIRawSame':8,'Node':0,'browser':0,'API':0,'DB':0},
 'results':{'strictZeroTolerance64':j['strictPassed'],'minimumSignedMargin':j['minimumMargin'],'nonArcMarkupSameDefault64':j['nonArcSame'],'maxSampleVsOwnInterval':max(s['sampleVsOwnIntervalMax']for s in j['sampling128']),'maxSampleVsSerializedCircleRadialDeviation':max(s['sampleVsSerializedCircleRadialMax']for s in j['sampling128']),'maxSerializedCenterDeviation':max(s['serializedCenterOffsetError']for s in j['sampling128'])},
 'independentMethod':'No monkeypatches. Actual Root render_spec/compile/sampler/inset helpers. Own prior analytic equations extracted without executing prior experiment; independently compute unrounded interval by complex dot/cross. Analytic circle from actual serialized endpoints/radius; halfplane endpoint+stationary minima, signed>=0. No generator answer/facts or pixels.',
 'default8Method':'Read preserved4ccb checker only as restricted SCENE/CASES AST data (never import/run SourceD). Sequential actualRoot CLI python-Xutf8-B-S stdout raw bytes compared to preserved versioned8 expected; old outputs never rewritten. Error fixtures intentionally remain error envelopes.',
 'negativeScope':'Strict bool coercions0/1/string/null/list/object; right/perspective combinations; zero/negative/NaN/infinite/collapsed radius; tiny/equal-gap/straight angles; zero/nonfinite rays; nonfinite offset; radius auto-enlargement; nonpositive inner radius. All rejected by actual current modules.',
 'sourceAndCompatibility':static,
 '08AndAPILimits':'No Node/actual generateMiddleProblem/API replay in Python-only scope. Static m2Quad diff and default function equality establish narrow source preservation; runtime08/RNG/stem/answer parity still requires parent TS regression and is not claimed independently here. Existing532API evidence remains historical, not repeated.',
 'limitations':['Strict centerline only: positive~.0075 gap is not stroke-envelope containment, nor pixel/physical print/readability approval','17-point sampler shares interval but is polygonal approximation; it does not equal actual serialized circle. Observed rounding differences reported, not erased by tolerance','Per-angle flag shortens mark endpoints, does not alter true ray angle/labels or certify geometry semantics','Default8 and64 are separate fixtures/calls, not new math questions or grade counts','No whole grade/Unit/rights/source/native/operational approval'],
 'hashes':{'beforeAfterUnchanged':True,'boundFiles':len(before),'actualRootImportClosure':json.loads((P/'own-first-import-closure.json').read_text(encoding='utf8'))},
 'artifactSHA256':{f.name:sha(f.read_bytes())for f in P.iterdir()if f.is_file()and f.name!='own-report.json'}
}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'strict':64,'negative':22,'rawDefaults':8,'m2QuadFlagOnly':static['m2QuadOnlyFlagInsertion']}))
