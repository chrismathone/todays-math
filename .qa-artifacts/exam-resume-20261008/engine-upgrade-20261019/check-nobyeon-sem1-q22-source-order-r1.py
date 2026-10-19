from pathlib import Path
from fractions import Fraction as F
import hashlib, json, datetime

b = Path('.qa-artifacts/exam-resume-20261008')
manifest = b / 'fresh-source-extraction-20261019-r6/personal-651da9aa806ce1c9d1c3ae5539e6038f/source-manifest.local.json'
source = json.loads(manifest.read_text(encoding='utf-8-sig'))
question = next(q for q in source['questions'] if q['number'] == 22)
assert source['year'] == 2025 and source['originalAnswersExported'] is False
out = b / 'nobyeon-sem1-q22-source-order-20261020-r1'
out.mkdir(exist_ok=False)
cases = []
for a in (F(1, 2), F(1)):
    p, point_a, point_q = F(0), a, a + 2
    point_b = (p + point_q) / 2
    point_c = (p + point_b) / 2
    radii = [a, point_q-point_a, abs(point_b-point_a), abs(point_c-point_a)]
    assert F(0) < a < F(2) and all(r > 0 for r in radii)
    assert point_b*2 == point_q and point_c*2 == point_b
    assert point_a - point_c == (3*a - 2)/4
    cases.append({'a':str(a),'P':str(p),'A':str(point_a),'Q':str(point_q),'B':str(point_b),'C':str(point_c),'CA':str(abs(point_a-point_c)),'signed_A_minus_C':str(point_a-point_c),'C_before_A':point_c<point_a,'allFourRadiiPositive':True})
assert cases[0]['C_before_A'] is False and cases[1]['C_before_A'] is True
degenerate_a = F(2, 3)
assert (degenerate_a + 2)/4 == degenerate_a
result = {
    'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'kind':'source-geometry-order-diagnostic/v1',
    'sourceManifest':{'path':manifest.as_posix(),'sha256':hashlib.sha256(manifest.read_bytes()).hexdigest()},
    'sourceQuestionNumber':22,'sourceContentDigest':question['sourceContentDigest'],
    'observedTextConditions':['P,A,Q on segment PQ; PA=a>0; QA=2 from circumference4pi','B midpointPQ; C midpointPB; all four circles throughA; 0<a<2'],
    'coordinateConvention':'Put P=0 and Q=a+2; orientation reversal changes no distances.',
    'exactCases':cases,
    'finding':'The transcribed text permits C<A and A<C with positive radii. A signed (3a-2)/4 cannot be used as CA length without additional order evidence.',
    'nondegenerateCircleCondition':'a=2/3 gives C=A and zero radius, so the named nondegenerate circle also requires excluding it; a numeric interval alone is incomplete.',
    'decision':'hold source visual/order and full-method interpretation before authoring this item; do not infer the original figure ordering from pixels or assumed textbook layout',
    'scope':'Exact source-condition audit only, not a fresh twin or independent twin approval; no original answer-key export or rights/grade approval.',
    'sourceFigureAccess':'Current cached text did not supply the original diagram; previous source-access-r4 only describes that process, not global NAS state.',
    'newManualQuestions':0,'newFigures':0,'newBlindSolves':0,'dbWrites':0
}
with (out/'source-order-diagnostic-r1.json').open('x',encoding='utf-8') as f:
    json.dump(result,f,ensure_ascii=False,indent=2); f.write('\n')
print(json.dumps({'cases':2,'bothOrdersPossible':True,'degenerateAt':'2/3','newManualQuestions':0,'hold':'source visual/order','dbWrites':0}))
