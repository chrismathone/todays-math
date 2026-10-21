"""Apply only the sealed Pythagoras figure-label proposal, retaining target EOL."""
from pathlib import Path
import datetime
import hashlib
import json
import difflib

ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
E = OUT.parent
proposal_path = E / 'm2-pytha-given-dims-candidate-20261021-r1/proposal.json'
proposal = json.loads(proposal_path.read_text(encoding='utf-8'))
target, candidate = ROOT / proposal['path'], ROOT / proposal['candidate']
sha = lambda raw: hashlib.sha256(raw).hexdigest()
before, proposed = target.read_bytes(), candidate.read_bytes()
assert sha(before) == proposal['originalSha256']
assert sha(proposed) == proposal['candidateSha256']
text = proposed.decode('utf-8').replace('\r\n', '\n')
after = text.replace('\n', '\r\n').encode('utf-8') if b'\r\n' in before else text.encode('utf-8')
diff = ''.join(difflib.unified_diff(before.decode('utf-8').splitlines(True),
                                  after.decode('utf-8').splitlines(True), fromfile=proposal['path'], tofile=proposal['path']))
(OUT / 'applied-diff.patch').write_bytes(diff.encode('utf-8'))
target.write_bytes(after)
assert target.read_bytes().decode('utf-8').replace('\r\n', '\n') == text
record = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), proposal=proposal,
              targetBefore=sha(before), targetAfter=sha(after), keptTargetCRLF=b'\r\n' in before,
              candidateNormalizedByteEquality=True, gradeRightsNativeOrReleaseApproval=False,
              existingQuestionOrDBWrites=0)
(OUT / 'apply-receipt.json').write_bytes((json.dumps(record, indent=2) + '\n').encode('utf-8'))
print(json.dumps({k: record[k] for k in ['targetBefore', 'targetAfter', 'keptTargetCRLF']}))
