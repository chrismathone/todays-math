"""Prepare an un-applied polygon outline: the student supplies the diagonals."""
from pathlib import Path
import hashlib
import json

ROOT = Path.cwd()
OUT = ROOT / '.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m31-outline-candidate-20261021-r1'
assert not OUT.exists()
rel = 'src/lib/middle/m1Geo2.ts'
raw = (ROOT / rel).read_bytes()
text = raw.decode('utf-8').replace('\r\n', '\n')
assert text.count('figPolygonDiagonalsFromA') == 2
text = text.replace('figPolygonDiagonalsFromA', 'figPolygonOutline')
fan = '  for (let i = 2; i < n - 1; i += 1) {\n    segments[`d${i}`] = ["A", names[i]];\n  }\n'
assert text.count(fan) == 1
text = text.replace(fan, '  // Do not pre-draw the connections whose number the student must find.\n', 1)
before = ' * 작도 02·03·04 는 실제 컴퍼스 자국(`arcs`)·각 표시를 그린다. 다각형 04·05 는\n * 정다각형 꼭짓점에 이름을 붙이고 대각선을 긋는다(오각형 예시는\n'
after = ' * 작도 02·03·04 는 실제 컴퍼스 자국(`arcs`)·각 표시를 그린다. 다각형 04는\n * 경계와 꼭짓점만, 05는 대각선도 그린다(오각형 예시는\n'
assert text.count(before) == 1
text = text.replace(before, after, 1)
target = OUT / rel
target.parent.mkdir(parents=True)
target.write_bytes(text.encode('utf-8'))
assert (ROOT / rel).read_bytes() == raw
proposal = dict(kind='m31-polygon-outline-engine-candidate/v1', status='unapplied-static-review-pending',
    path=rel, originalSha256=hashlib.sha256(raw).hexdigest(),
    candidate=target.relative_to(ROOT).as_posix(), candidateSha256=hashlib.sha256(target.read_bytes()).hexdigest(),
    sourceFinding='M31; actual owner m1Geo2.ts, not m1Book2.ts',
    changedScope='polygon04 mode0 diagram only; mode1 stays figureSpec:null; polygon05 unchanged',
    futureFamilyVersionRequired='1-2|다각형|04:20261021-outline-before-student-diagonals-r1',
    internalCountNotDrawn='n-3 possible nonadjacent connections; no fan segments in the prompt',
    bodyAnswerSolutionOrNumericalParametersChanged=False, productionChanged=False,
    bankOrIssuedQuestionOrDBChanged=False, officialGradeOrRightsApproval=False)
(OUT / 'proposal.json').write_bytes((json.dumps(proposal, ensure_ascii=False, indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(candidateFiles=1, applied=False)))
