"""Apply the reviewed local engine revision after a sealed prechange replay."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

E = Path('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019')
receipt = E / 'm38-applied-20261021-r1.json'
assert not receipt.exists()
proposal_path = E / 'm38-candidate-code-20261021-r3/proposal.json'
proposal = json.loads(proposal_path.read_text(encoding='utf-8'))
digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
precommit = 'eb846a15db71f68e33084a21fc307a00f0fd9e24'
subprocess.run(['git', 'cat-file', '-e', precommit + '^{commit}'], check=True)
for binding in proposal['bindings']:
    assert digest(binding['path']) == binding['originalSha256'], binding['path']
    assert digest(binding['candidate']) == binding['candidateSha256'], binding['candidate']
test = Path('src/__tests__/unit/middleM2FeasibleConditions.test.ts')
assert not test.exists()
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
for binding in proposal['bindings']:
    Path(binding['path']).write_bytes(Path(binding['candidate']).read_bytes())
    assert digest(binding['path']) == binding['candidateSha256']
test.write_bytes((E / 'm38-priority-test-proposal-20261021-r1.ts').read_bytes())
receipt.write_bytes((json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    beforeHead=head, proposal=dict(path=proposal_path.as_posix(), sha256=digest(proposal_path)),
    sealedPrechangeReplayCommit=precommit, code=proposal['bindings'],
    newIndependentConditionRegression=dict(path=test.as_posix(),sha256=digest(test)),
    mathematicalRevisionNotDisplayOnly=True, bankOrIssuedQuestionOrDBWrites=0,
    gradeRightsOrReleaseApproval=False, pendingActualPostchangeTests=True),indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(appliedLocalEngineFiles=5,newTestFiles=1,dbWrites=0)))
