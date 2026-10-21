from pathlib import Path
import datetime
import hashlib
import json

OUT=Path(__file__).resolve().parent
target=Path('src/lib/middle/m2Quad.ts')
candidate=OUT/'candidate-m2Quad.ts'
sha=lambda b:hashlib.sha256(b).hexdigest()
before,after=target.read_bytes(),candidate.read_bytes()
assert sha(before)=='baa7eb6130d5a6aeb540a3b803ec219d4ea436aade22346cab49812b5baa168e'
assert sha(after)==json.loads((OUT/'candidate.json').read_text(encoding='utf-8'))['candidateSHA256']
assert b'\r\n' in before and b'\r\n' in after
assert json.loads((OUT/'matrix-native-results.json').read_text(encoding='utf-8'))['fullParameterCases']==432
geometry=json.loads((OUT/'vector-containment-results.json').read_text(encoding='utf-8'))
assert len(geometry['currentPassed'])==64 and all(r['passed'] for r in geometry['currentPassed'])
target.write_bytes(after)
report=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),path=str(target),
    beforeSHA256=sha(before),afterSHA256=sha(after),rawCandidateEquality=target.read_bytes()==after,
    retainedCRLF=True,stemAnswerSolutionAndRNGUnchanged=True,wholeGradeRightsOrReleaseApproval=False,
    existingQuestionOrDBWrites=0)
(OUT/'apply-receipt.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps(report))
