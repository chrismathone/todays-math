"""Read-only checks and immutable re-execution of our sealed student-only solves."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import ast, hashlib, json, os, subprocess
R = Path(__file__).resolve().parent
SCOPE = R.parent
REPO = R.parents[3]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8'))
freeze = read(R/'solve-freeze.json')
assert not freeze['newGF15AuthorAnswerExposure']
for f in freeze['files']:
    p = SCOPE/f['path']
    assert sha(p) == f['rawSha256'] and p.stat().st_size == f['bytes'], f['path']
    if p.suffix == '.json': read(p)
    if p.suffix == '.py': ast.parse(p.read_text(encoding='utf-8'))
assert {p.relative_to(SCOPE).as_posix() for p in SCOPE.rglob('*') if p.is_file()} == {f['path'] for f in freeze['files']} | {'blind/solve-freeze.json'}
manifest = read(R/'blind-manifest.json')
assert manifest['packageDigest'] == freeze['opaquePackageDigestProvided']
assert sha(R/'student-problems.json') == manifest['studentProblemsSha256'] == freeze['rawInputSha256']
for f in manifest['figures']: assert sha(R/f['path']) == f['sha256']
prior = read(R/'preservation.json')
assert len(prior['files']) == 917
for f in prior['files']: assert sha(REPO/f['path']) == f['sha256'], f['path']
questions = read(R/'student-problems.json')
assert [q['questionNumber'] for q in questions] == list(range(1,10))+list(range(16,22))
calc = read(R/'calculation-output.json')
assert calc['inputRawSha256'] == freeze['rawInputSha256'] and calc['codeRawSha256'] == sha(R/'calculation.py')
layout = read(R/'inspection/layout.json')
assert layout['studentOnly'] and not layout['networkRequests'] and not layout['texWarnings']
assert len(layout['results']) == 15 and sum(r['figureCount'] for r in layout['results']) == 12
for row in layout['results']:
    assert row['columnWidthMm'] == 70 and not row['overflow']
    assert sha(R/row['png']) == row['pngSha256']
expectedRoles = {19:['part1.QR','part1.PR','part2.PQ','part3.QR','part3.PR'],
                 20:['part1.perpendicularProof','part1.alpha','part2.PH','part3.sinAlpha','part3.cosAlpha','part3.tanAlpha'],
                 21:['part1.OH','part1.PH','part2.HQ','part3.OQ']}
for q, binding, exact in zip(questions, freeze['solves'], calc['results']):
    n = q['questionNumber']; p = SCOPE/binding['path']; s = read(p)
    assert n == binding['questionNumber'] == exact['questionNumber']
    assert sha(p) == binding['rawSolveSha256'] and s['studentDigest'] == q['studentDigest'] == binding['studentDigest']
    assert s['solverId'] == freeze['solverId'] and s['status'] == ('pending' if n == 18 else 'solved')
    e = s['evidence']
    assert e['calculationCodeRawSha256'] == sha(R/'calculation.py')
    assert e['calculationOutputRawSha256'] == sha(R/'calculation-output.json')
    assert e['studentInputRawSha256'] == freeze['rawInputSha256'] and not e['freshNewAuthorAnswerExposure']
    assert len(e['curriculumSurfaces']) == 7 and not s['curriculumGate']['finalGradeApproval']
    assert s['solution'] and not s['gates']['loadable'] and not s['gates']['directUseAllowed']
    if q['choices']:
        choice = exact['evidence']
        assert len(q['choices']) == len(choice['choiceCorrectness']) == 5
        assert sum(choice['choiceCorrectness']) == 1 and not choice['semanticDuplicateChoices']
        assert s['answer'] == '①②③④⑤'[choice['correctChoiceNumber']-1]
    else:
        assert [p['role'] for p in s['answerParts']] == expectedRoles[n]
    if n == 18:
        assert s['curriculumGate']['materialComplexityHold'] and e['knownHolds']
        assert s['curriculumGate']['wholeStudentScope'] == 'pending-material-complexity'
        assert e['knownHolds'][0]['reopen']
assert freeze['counts'] == read(R/'solve-summary.json')['counts']
assert freeze['counts']['solved'] == 14 and freeze['counts']['pending'] == 1
assert sum(q['score'] for q in questions) == 71
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONIOENCODING='utf-8')
for name in ['calculation.py','finalize-solves.py']:
    result = subprocess.run([sys.executable,str(R/name)], env=env, capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stdout + result.stderr
    print(result.stdout.strip())
for f in freeze['files']: assert sha(SCOPE/f['path']) == f['rawSha256'], f['path']
for f in prior['files']: assert sha(REPO/f['path']) == f['sha256'], f['path']
print(json.dumps({'rawSealSha256': sha(R/'solve-freeze.json'), 'boundFiles': len(freeze['files']),
                  'rawSolves': 15, 'solved': 14, 'pending': 1, 'q18HoldPreserved': True,
                  'fiveChoiceChecks': 12, 'numberedWrittenParts': 9, 'suppliedSVG': 12,
                  'previousFilesUnchanged': 917, 'mathRerunBytesUnchanged': True,
                  'authorAnswerExposure': False, 'rightsNativeLoadApproved': 0}))
