from pathlib import Path
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parent
SOURCE = Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/.qa-artifacts/exam-resume-20261008/gangbuk-review-r1/blind')

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))

receipts = []
for name in ['student-problems.json', 'blind-manifest.json', 'SOLVE-BRIEF.md']:
    data = (SOURCE / name).read_bytes()
    data.decode('utf-8', errors='strict')
    target = ROOT / 'blind' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    assert target.read_bytes() == data
    receipts.append({'name': name, 'source': str(SOURCE / name), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'byteExact': True})
problems = json.loads((ROOT / 'blind/student-problems.json').read_bytes().decode('utf-8', errors='strict'))
manifest = json.loads((ROOT / 'blind/blind-manifest.json').read_bytes().decode('utf-8', errors='strict'))
assert receipts[0]['sha256'] == manifest['studentProblemsSha256']
assert len(problems) == 1 and problems[0]['questionNumber'] == 1 and problems[0]['figures'] == []
p = problems[0]
# Exact integer square-root checks; no symbolic package or external data.
principal = math.isqrt(81)
assert principal == 9 and principal ** 2 == 81 and principal >= 0
roots_a = [x for x in range(-9, 10) if x*x == principal]
assert roots_a == [-3, 3]
admissible_a = [x for x in roots_a if x < 0]
assert admissible_a == [-3]
a = admissible_a[0]
b = 7-a
N = b*b
assert b > 0 and N > 0 and a+b == 7 and a*a == principal
checks = []
for i, raw in enumerate(p['choices'], 1):
    n = int(raw.strip('$'))
    r = math.isqrt(n)
    assert r*r == n and r > 0
    checks.append({'choice': i, 'glyph': chr(0x2460+i-1), 'N': n, 'positiveB': r, 'aPlusB': a+r, 'satisfiesAllConditions': a+r == 7})
winners = [c for c in checks if c['satisfiesAllConditions']]
assert len(winners) == 1 and winners[0]['N'] == N
glyph = winners[0]['glyph']
proof = ('M3 / 2015 root definitions: sqrt(81) denotes the nonnegative square root of 81, so sqrt(81)=9. '
         'Thus a^2=9 has exactly the two real roots -3 and 3; a<0 selects a=-3. '
         'The equation a+b=7 then forces b=10, which satisfies b>0. Hence N=b^2=100>0. '
         'Conversely, (a,b,N)=(-3,10,100) satisfies every stated condition, proving existence. '
         'Each variable was forced in order, proving uniqueness over the full real domain, not merely among the options. '
         'For N=16,49,81,100,256 respectively, b>0 forces b=4,7,9,10,16; with a=-3 the sums are 1,4,6,7,13. '
         'Only the fourth option satisfies a+b=7. No lengths, units, or figure conditions are stated; the positive domains of b and N are satisfied. '
         'Answer: ' + glyph + ' ($100$).')
write_json(ROOT / 'solve/q01.json', {'studentDigest': p['studentDigest'], 'solverId': 'codex-gangbuk-independent-20261019-r2', 'answer': glyph, 'solution': proof, 'evidence': {'method': 'M3/2015 square-root definition and sign selection', 'computation': 'computation.json', 'inputReceipt': 'input-receipt.json', 'exposureReceipt': 'exposure-receipt.json'}, 'status': 'solved'})
write_json(ROOT / 'input-receipt.json', {'files': receipts, 'manifestShaVerified': True, 'studentDigest': p['studentDigest'], 'figures': []})
write_json(ROOT / 'computation.json', {'principalSquareRoot81': principal, 'rootsOfASquaredEquals9': roots_a, 'negativeA': a, 'forcedB': b, 'forcedN': N, 'allFiveOptions': checks, 'existence': True, 'uniqueRealSolution': True, 'positiveDomain': b > 0 and N > 0})
write_json(ROOT / 'exposure-receipt.json', {'actor': 'codex-gangbuk-independent-20261019-r2', 'priorExposure': 'Fresh actor in reused checkout. No NEW twin answer or previous solve seen before independent derivation. Old solves are not mine.', 'readScope': ['User-provided instructions', 'D:/todays-math/AGENTS.md', 'Get-Location and git status --short', 'Only the three authorized parent blind files', 'This new r2 directory'], 'authorExposure': False, 'historicalSolveExposure': False, 'figuresOpened': False, 'answerSearch': False, 'networkUsed': False, 'serialization': 'apply_patch UTF-8 script and explicit UTF-8 byte writes; no PowerShell Unicode piping', 'consoleIncident': 'Initial strict UTF-8 read of AGENTS could not print under cp949. Retried with PYTHONIOENCODING=utf-8; no blind input was reached in the failed command.'})
# Reopen actual disk bytes strictly before sealing, including all copied inputs.
for path in ROOT.rglob('*'):
    if path.is_file():
        decoded = path.read_bytes().decode('utf-8', errors='strict')
        assert '\ufffd' not in decoded
sealed = json.loads((ROOT / 'solve/q01.json').read_bytes().decode('utf-8', errors='strict'))
assert len(sealed) == 6 and sealed['answer'] == chr(0x2463)
assert '?' not in sealed['solution'] and '\ufffd' not in sealed['solution']
print('Actual disk choice:', sealed['answer'], 'U+%04X' % ord(sealed['answer']))
print('Actual disk full proof:', sealed['solution'])
write_json(ROOT / 'serialization-receipt.json', {'strictUtf8Reopened': True, 'choice': sealed['answer'], 'codepoint': 'U+%04X' % ord(sealed['answer']), 'fullProofPrintedFromDisk': True, 'replacementOrQuestionMarkInProof': False, 'authorUnexposedAtValidation': True})
assert json.loads((ROOT / 'serialization-receipt.json').read_bytes().decode('utf-8', errors='strict'))['choice'] == glyph
print('All five options, existence, uniqueness, signs, positive domain, byte-exact inputs and UTF-8 checks passed.')
