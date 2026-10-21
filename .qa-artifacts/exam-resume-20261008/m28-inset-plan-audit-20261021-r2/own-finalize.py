from pathlib import Path
import json,hashlib,math,ast
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
j=json.loads((P/'own-results.json').read_text(encoding='utf8'));before=json.loads((P/'own-before.json').read_text(encoding='utf8'));assert all(sha(Path(f).read_bytes())==h for f,h in before.items())
# Disambiguate emission vs analytic rejection for the tiny-radius witness,
# without repeating any native render.
tree=ast.parse((P/'own-audit.py').read_text(encoding='utf8'));ns={'math':math,'GAP':.001}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['interval','candidate']],type_ignores=[]),'own-pure-formula-only','exec'),ns)
tiny=ns['candidate'](0,0,(1,0),(math.cos(.1),math.sin(.1)),1e-8)
assert tiny.startswith('M 0.000000 0.000000 A') and tiny.endswith('0.000000 0.000000')
report={
 'scope':'Read-only implementation plan review and own Python QA experiment; NOT current production opt-in implementation validation',
 'status':'bounded64-case centerline design supported, general safety/default compatibility awaits implementation + regressions',
 'executed':{'actualDefaultRootNativeRenders':64,'ownQASharedIntervalNativeRenders':64,'ownAngleSampleComparisons':128,'smallAnalyticCases':5,'Node':0,'API':0,'DB':0,'productionEdits':0},
 'ownResults':{'strictZeroTolerance':j['strictZeroTolerance'],'minimumSignedMargin':j['minimumSignedMargin'],'nonArcMarkupUnchanged64':j['nonArcUnchanged'],'maximumSampleRadialDeviationFromSerializedCircle':max(x['maximumRadialDeviationFromSerializedCircle']for x in j['sampleComparisons']),'maximumSerializedCenterDeviationFromTranslatedUnroundedVertex':max(x['centerErrorFromTranslatedVertex']for x in j['sampleComparisons']),'maximumIntervalTranslationRoundoff':max(x['translationIntervalError']for x in j['sampleComparisons']),'maximum17SamplePolylineSagitta':max(x['polylineSagittaBound']for x in j['sampleComparisons'])},
 'independence':'Own complex dot/cross atan2 interval and own normal-dot halfplane extrema analysis, no copied parent counts/expected successes. Actual Root compile/resolve/sanitize with QA-only in-memory replacement of angle mark sampling+emit. Parent files read and hashed but not imported or executed.',
 'sharedHelperRecommendation':[
 'Expose a single unrounded SVG-y-down radians interval calculation with explicit default-false inset flag. Compute minor signed sweep once, trim1e-3rad symmetrically only when opted in. Sampling and emit must consume this interval; label bisector remains unchanged because symmetric trimming preserves midpoint.',
 'Keep existing default angle_arc byte path literally unchanged. Inset helper can return interval to separate6-decimal endpoint serializer; do not globally change arc output precision or quantize ray/vertex coordinates.',
 'Retain translation as additive endpoint position only; same interval in source coordinate space avoids independent recomputation. Observed translation recomputation error <=4.45e-16rad here, not a generic proof at arbitrary huge coordinate magnitudes.',
 'The current `_angle_mark_polylines`17 samples are a collision heuristic with chords. Shared interval removes endpoint policy disagreement but does not make polyline equal actual circle: sagitta reaches~0.0667 here. Endpoint6-decimal rounding adds another small actual-circle perturbation. Keep analytic extrema/circle certificate for strict serialized boundary claims.'
 ],
 'schemaAndFailureRequirements':[
 'serialized_inset strict boolean, defaultfalse. Explicit true with right or perspective must reject, no coercion or silent flag removal. Preserve all existing arcs1/2/finite/radius/degenerate-ray checks.',
 'Reject abs(minorSweep)<=2e-3rad (trim cannot leave positive sweep); reject nonfinite center/ray/radius, zero ray lengths, nonpositive effective radius for any requested inner mark. Verify tiny-angle/radius behavior rather than silently dropping same-angle marks.',
 'Reject or fail validation if6-decimal serialized endpoints coincide, circle data invalid/nonfinite, or intended minor arc changes. Tiny-radius witness emits coincident endpoints before own analyzer rejects; QA candidate itself is not sufficient generic production guard.',
 'Near-straight chord center reconstruction is sensitive; outside bounded M28 domain do not infer positive containment. Require actual serialized circular-arc halfplane checks or conservative certified numeric bounds if a general guarantee is intended.'
 ],
 'tinyRadiusDisambiguation':{'emittedPath':tiny,'meaning':'own-results smallCases acceptedByQAFormula=false records full emit+circle-analysis attempt, NOT an emitter guard. Emission succeeds; independent circle reconstruction rejects zero chord. No native rerender performed for this clarification.'},
 'meaningAndLimits':['Only mark endpoints shorten: each gap1e-3rad about0.0572958degrees; true ray angle/labels remain original. Equal arcs retain count/radius but no longer touch rays; visual convention needs explicit review, not a changed mathematical angle.', 'Current minimum positive centerline clearance~.0075 is far below half mark stroke width; no entire-ink/stroke-envelope containment approval.', 'Own64 specs represent existing observed M28 finite conditions; no new actualAPI/432 RNG executions or student/blind counts.', 'No screenshot/pixel/physical print/readability oracle or grade/rights/source/native/operational approval.'],
 'mandatoryIntegrationGates':['Actual8 default exact output bytes preserved, including assets-only/new version fixtures; not run in this plan scope','Actual08 default outputs byte unchanged; no new opt-in there','Only new15A angle entries opt in; A/C given marks, labels, count, radius semantics and all other outputs protected','Stem/answer/solution/params/RNG consumption byte/call order unchanged; new adapter revision and policy/fingerprint binding for changed SVG spec','Run actual shared sampling+emit implementation with64 serializations, malformedflag/right/perspective/tiny/small/nonfinite negatives, and default snapshots; this QA monkeypatch is not that implementation'],
 'sourceHashesUnchanged':True,'boundFiles':len(before),'artifactSHA256':{f.name:sha(f.read_bytes())for f in P.iterdir()if f.is_file()and f.name!='own-report.json'}
}
assert j['strictZeroTolerance']==64 and j['nonArcUnchanged']==64
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'strict':64,'productionApplied':False}))
